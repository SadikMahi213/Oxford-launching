from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import date, datetime
from decimal import Decimal


class TaskTypeCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=64)
    display_name: str = Field(..., min_length=1, max_length=120)
    description: Optional[str] = None
    icon: Optional[str] = "📝"
    generator_key: str = Field(..., min_length=1, max_length=64)
    generator_params: Optional[dict] = {}
    difficulty_levels: Optional[List[str]] = ["easy", "medium", "hard"]
    default_difficulty: Optional[str] = "medium"
    time_limit_seconds: Optional[int] = 30
    points_config: Optional[dict] = {"easy": 1, "medium": 2, "hard": 3}
    is_active: Optional[bool] = True
    sort_order: Optional[int] = 0


class TaskTypeUpdate(BaseModel):
    display_name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    generator_params: Optional[dict] = None
    difficulty_levels: Optional[List[str]] = None
    default_difficulty: Optional[str] = None
    time_limit_seconds: Optional[int] = None
    points_config: Optional[dict] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


class TaskTypeResponse(BaseModel):
    id: int
    name: str
    display_name: str
    description: Optional[str]
    icon: Optional[str]
    generator_key: str
    generator_params: Optional[dict]
    difficulty_levels: Optional[List[str]]
    default_difficulty: str
    time_limit_seconds: int
    points_config: Optional[dict]
    is_active: bool
    sort_order: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class GeneratedTaskResponse(BaseModel):
    id: int
    task_type_id: Optional[int]
    date: date
    sort_order: int
    payload: dict
    difficulty: str
    points: int
    status: str
    user_answer: Optional[str]
    is_correct: Optional[bool]
    completed_at: Optional[datetime]
    time_spent_seconds: Optional[int]
    task_type_name: Optional[str] = None
    task_type_icon: Optional[str] = None

    class Config:
        from_attributes = True


class TaskSubmitAnswer(BaseModel):
    user_answer: str = Field(..., min_length=0, max_length=2000)
    time_spent_seconds: Optional[int] = Field(None, ge=0)


class TaskSummary(BaseModel):
    date: date
    total_tasks: int
    completed_tasks: int
    correct_tasks: int
    remaining_tasks: int
    progress_percent: float
    total_points: int
    earned_points: int
    is_eligible_for_earning: bool
    package_name: Optional[str]
    tasks_required: int


class TaskStatsResponse(BaseModel):
    total_users_with_tasks: int
    total_tasks_generated: int
    total_tasks_completed: int
    total_tasks_correct: int
    overall_completion_rate: float
    overall_accuracy_rate: float
    tasks_by_type: List[dict]
    daily_stats: List[dict]


class BulkTaskTypeToggle(BaseModel):
    task_type_ids: List[int]
    is_active: bool
