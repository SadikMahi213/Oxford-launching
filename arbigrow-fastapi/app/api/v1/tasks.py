from datetime import date, datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func, and_, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.user import User
from app.models.investments import Investment
from app.models.package import Package
from app.models.generated_task import GeneratedTask
from app.models.task_type import TaskType
from app.schemas.task import GeneratedTaskResponse, TaskSubmitAnswer, TaskSummary
from app.services.task_generator import get_or_generate_tasks

router = APIRouter(prefix="/tasks", tags=["Tasks"])


def _serialize_task(task: GeneratedTask) -> dict:
    return {
        "id": task.id,
        "task_type_id": task.task_type_id,
        "date": task.date.isoformat(),
        "sort_order": task.sort_order,
        "payload": task.payload,
        "difficulty": task.difficulty,
        "points": task.points,
        "status": task.status,
        "user_answer": task.user_answer,
        "is_correct": task.is_correct,
        "completed_at": task.completed_at.isoformat() if task.completed_at else None,
        "time_spent_seconds": task.time_spent_seconds,
        "task_type_name": task.task_type.display_name if task.task_type else None,
        "task_type_icon": task.task_type.icon if task.task_type else None,
    }


@router.get("/today")
async def get_today_tasks(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    today = date.today()
    tasks = await get_or_generate_tasks(db, user_id, today)

    inv_result = await db.execute(
        select(Investment).where(
            and_(Investment.user_id == user_id, Investment.status == "active")
        ).order_by(Investment.id.desc())
    )
    investment = inv_result.scalars().first()
    tasks_required = 0
    package_name = None
    if investment:
        pkg_result = await db.execute(
            select(Package).where(Package.name == investment.package_name)
        )
        package = pkg_result.scalars().first()
        if package:
            tasks_required = package.captcha_required_per_day or 0
            package_name = package.name

    completed = sum(1 for t in tasks if t.status == "completed")
    correct = sum(1 for t in tasks if t.status == "completed" and t.is_correct)
    total_points = sum(t.points for t in tasks)
    earned_points = sum(t.points for t in tasks if t.status == "completed" and t.is_correct)
    progress = (completed / len(tasks) * 100) if tasks else 0
    all_done = all(t.status == "completed" for t in tasks) if tasks else False

    return {
        "tasks": [_serialize_task(t) for t in tasks],
        "summary": {
            "date": today.isoformat(),
            "total_tasks": len(tasks),
            "completed_tasks": completed,
            "correct_tasks": correct,
            "remaining_tasks": len(tasks) - completed,
            "progress_percent": round(progress, 1),
            "total_points": total_points,
            "earned_points": earned_points,
            "is_eligible_for_earning": all_done,
            "package_name": package_name,
            "tasks_required": tasks_required,
        },
    }


@router.post("/{task_id}/complete")
async def complete_task(
    task_id: int,
    body: TaskSubmitAnswer,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(GeneratedTask).options(selectinload(GeneratedTask.task_type)).where(
            and_(GeneratedTask.id == task_id, GeneratedTask.user_id == user_id)
        )
    )
    task = result.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.status == "completed":
        raise HTTPException(status_code=400, detail="Task already completed")

    user_answer = body.user_answer.strip()
    is_correct = False

    if task.payload.get("case_sensitive", False):
        is_correct = user_answer == task.answer
    else:
        is_correct = user_answer.lower() == task.answer.lower()

    task.user_answer = user_answer
    task.is_correct = is_correct
    task.status = "completed"
    task.completed_at = datetime.now(timezone.utc)
    task.time_spent_seconds = body.time_spent_seconds

    await db.commit()

    today = date.today()
    all_tasks_result = await db.execute(
        select(GeneratedTask).where(
            and_(GeneratedTask.user_id == user_id, GeneratedTask.date == today)
        )
    )
    all_tasks = all_tasks_result.scalars().all()
    completed_count = sum(1 for t in all_tasks if t.status == "completed")
    all_done = all(t.status == "completed" for t in all_tasks)

    return {
        "task_id": task.id,
        "is_correct": is_correct,
        "points_earned": task.points if is_correct else 0,
        "completed_at": task.completed_at.isoformat(),
        "daily_progress": {
            "completed": completed_count,
            "total": len(all_tasks),
            "progress_percent": round((completed_count / len(all_tasks) * 100) if all_tasks else 0, 1),
            "is_eligible_for_earning": all_done,
        },
    }


@router.get("/history")
async def get_task_history(
    days: int = 7,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    from datetime import timedelta
    start_date = date.today() - timedelta(days=days)

    result = await db.execute(
        select(GeneratedTask).options(selectinload(GeneratedTask.task_type)).where(
            and_(
                GeneratedTask.user_id == user_id,
                GeneratedTask.date >= start_date,
            )
        ).order_by(GeneratedTask.date.desc(), GeneratedTask.sort_order)
    )
    tasks = result.scalars().all()

    daily_stats = {}
    for t in tasks:
        d = t.date.isoformat()
        if d not in daily_stats:
            daily_stats[d] = {"date": d, "total": 0, "completed": 0, "correct": 0, "points_earned": 0}
        daily_stats[d]["total"] += 1
        if t.status == "completed":
            daily_stats[d]["completed"] += 1
            if t.is_correct:
                daily_stats[d]["correct"] += 1
                daily_stats[d]["points_earned"] += t.points

    return {
        "days": days,
        "daily_stats": list(daily_stats.values()),
        "total_tasks": len(tasks),
        "total_completed": sum(1 for t in tasks if t.status == "completed"),
        "total_correct": sum(1 for t in tasks if t.status == "completed" and t.is_correct),
    }
