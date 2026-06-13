from datetime import date, datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, and_, update, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.v1.deps import get_current_admin_user
from app.models.task_type import TaskType
from app.models.generated_task import GeneratedTask
from app.models.user import User
from app.schemas.task import TaskTypeCreate, TaskTypeUpdate, TaskTypeResponse, BulkTaskTypeToggle
from app.services.task_generator import list_generator_keys

router = APIRouter(prefix="/admin/tasks", tags=["Admin Tasks"])


def _parse_json_field(val):
    import json as _json
    if isinstance(val, str):
        try:
            return _json.loads(val)
        except (ValueError, TypeError):
            return val
    return val


@router.get("/types")
async def list_task_types(
    admin=Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(TaskType).order_by(TaskType.sort_order))
    types = result.scalars().all()
    return {
        "task_types": [
            {
                "id": t.id,
                "name": t.name,
                "display_name": t.display_name,
                "description": t.description,
                "icon": t.icon,
                "generator_key": t.generator_key,
                "generator_params": _parse_json_field(t.generator_params),
                "difficulty_levels": _parse_json_field(t.difficulty_levels),
                "default_difficulty": t.default_difficulty,
                "time_limit_seconds": t.time_limit_seconds,
                "points_config": _parse_json_field(t.points_config),
                "is_active": t.is_active,
                "sort_order": t.sort_order,
                "created_at": t.created_at.isoformat() if t.created_at else None,
                "updated_at": t.updated_at.isoformat() if t.updated_at else None,
            }
            for t in types
        ],
        "available_generators": list_generator_keys(),
    }


@router.post("/types")
async def create_task_type(
    body: TaskTypeCreate,
    admin=Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(TaskType).where(TaskType.name == body.name))
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="Task type name already exists")

    available = list_generator_keys()
    if body.generator_key not in available:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown generator: {body.generator_key}. Available: {available}",
        )

    task_type = TaskType(**body.model_dump())
    db.add(task_type)
    await db.commit()
    await db.refresh(task_type)
    return {"id": task_type.id, "message": "Task type created"}


@router.put("/types/{type_id}")
async def update_task_type(
    type_id: int,
    body: TaskTypeUpdate,
    admin=Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(TaskType).where(TaskType.id == type_id))
    task_type = result.scalars().first()
    if not task_type:
        raise HTTPException(status_code=404, detail="Task type not found")

    update_data = body.model_dump(exclude_unset=True)
    for key, val in update_data.items():
        setattr(task_type, key, val)

    await db.commit()
    return {"message": "Task type updated"}


@router.patch("/types/{type_id}/toggle")
async def toggle_task_type(
    type_id: int,
    admin=Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(TaskType).where(TaskType.id == type_id))
    task_type = result.scalars().first()
    if not task_type:
        raise HTTPException(status_code=404, detail="Task type not found")

    task_type.is_active = not task_type.is_active
    await db.commit()
    return {"is_active": task_type.is_active}


@router.delete("/types/{type_id}")
async def delete_task_type(
    type_id: int,
    admin=Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(TaskType).where(TaskType.id == type_id))
    task_type = result.scalars().first()
    if not task_type:
        raise HTTPException(status_code=404, detail="Task type not found")

    task_count = await db.execute(
        select(func.count()).select_from(GeneratedTask).where(GeneratedTask.task_type_id == type_id)
    )
    if task_count.scalar() > 0:
        raise HTTPException(status_code=400, detail="Cannot delete task type with existing generated tasks")

    await db.delete(task_type)
    await db.commit()
    return {"message": "Task type deleted"}


@router.patch("/types/bulk-toggle")
async def bulk_toggle_task_types(
    body: BulkTaskTypeToggle,
    admin=Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        update(TaskType)
        .where(TaskType.id.in_(body.task_type_ids))
        .values(is_active=body.is_active)
    )
    await db.commit()
    return {"message": f"Updated {len(body.task_type_ids)} task types"}


@router.get("/stats")
async def get_task_stats(
    days: int = Query(7, ge=1, le=90),
    admin=Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    start_date = date.today() - timedelta(days=days)

    total_users = await db.execute(
        select(func.count(func.distinct(GeneratedTask.user_id))).where(
            GeneratedTask.date >= start_date
        )
    )
    total_generated = await db.execute(
        select(func.count()).select_from(GeneratedTask).where(GeneratedTask.date >= start_date)
    )
    total_completed = await db.execute(
        select(func.count()).select_from(GeneratedTask).where(
            and_(GeneratedTask.date >= start_date, GeneratedTask.status == "completed")
        )
    )
    total_correct = await db.execute(
        select(func.count()).select_from(GeneratedTask).where(
            and_(
                GeneratedTask.date >= start_date,
                GeneratedTask.status == "completed",
                GeneratedTask.is_correct == True,
            )
        )
    )

    gen_count = total_generated.scalar() or 0
    comp_count = total_completed.scalar() or 0
    corr_count = total_correct.scalar() or 0

    type_stats = await db.execute(
        select(
            TaskType.display_name,
            TaskType.icon,
            func.count(GeneratedTask.id).label("total"),
            func.sum(case((GeneratedTask.status == "completed", 1), else_=0)).label("completed"),
            func.sum(case((and_(GeneratedTask.status == "completed", GeneratedTask.is_correct == True), 1), else_=0)).label("correct"),
        )
        .join(GeneratedTask, GeneratedTask.task_type_id == TaskType.id, isouter=True)
        .where(GeneratedTask.date >= start_date)
        .group_by(TaskType.id)
        .order_by(TaskType.sort_order)
    )
    tasks_by_type = [
        {
            "name": row.display_name,
            "icon": row.icon,
            "total": row.total or 0,
            "completed": row.completed or 0,
            "correct": row.correct or 0,
        }
        for row in type_stats.all()
    ]

    daily = await db.execute(
        select(
            GeneratedTask.date,
            func.count().label("total"),
            func.sum(case((GeneratedTask.status == "completed", 1), else_=0)).label("completed"),
            func.sum(case((and_(GeneratedTask.status == "completed", GeneratedTask.is_correct == True), 1), else_=0)).label("correct"),
        )
        .where(GeneratedTask.date >= start_date)
        .group_by(GeneratedTask.date)
        .order_by(GeneratedTask.date)
    )
    daily_stats = [
        {
            "date": row.date.isoformat(),
            "total": row.total or 0,
            "completed": row.completed or 0,
            "correct": row.correct or 0,
        }
        for row in daily.all()
    ]

    return {
        "period_days": days,
        "total_users_with_tasks": total_users.scalar() or 0,
        "total_tasks_generated": gen_count,
        "total_tasks_completed": comp_count,
        "total_tasks_correct": corr_count,
        "overall_completion_rate": round((comp_count / gen_count * 100) if gen_count else 0, 1),
        "overall_accuracy_rate": round((corr_count / comp_count * 100) if comp_count else 0, 1),
        "tasks_by_type": tasks_by_type,
        "daily_stats": daily_stats,
    }


@router.get("/users/{user_id}/tasks")
async def get_user_tasks(
    user_id: int,
    task_date: str = Query(None),
    admin=Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    if task_date:
        try:
            d = date.fromisoformat(task_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format")
    else:
        d = date.today()

    result = await db.execute(
        select(GeneratedTask)
        .where(and_(GeneratedTask.user_id == user_id, GeneratedTask.date == d))
        .order_by(GeneratedTask.sort_order)
    )
    tasks = result.scalars().all()

    return {
        "user_id": user_id,
        "date": d.isoformat(),
        "tasks": [
            {
                "id": t.id,
                "sort_order": t.sort_order,
                "payload": t.payload,
                "difficulty": t.difficulty,
                "points": t.points,
                "status": t.status,
                "user_answer": t.user_answer,
                "is_correct": t.is_correct,
                "completed_at": t.completed_at.isoformat() if t.completed_at else None,
                "time_spent_seconds": t.time_spent_seconds,
            }
            for t in tasks
        ],
    }
