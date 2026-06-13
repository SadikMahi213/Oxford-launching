from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, JSON
from sqlalchemy.sql import func
from app.core.base import Base


class TaskType(Base):
    __tablename__ = "task_types"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(64), unique=True, nullable=False, index=True)
    display_name = Column(String(120), nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String(10), nullable=True, default="📝")
    generator_key = Column(String(64), nullable=False, unique=True)
    generator_params = Column(JSON, nullable=True, default=dict)
    difficulty_levels = Column(JSON, nullable=True, default=lambda: ["easy", "medium", "hard"])
    default_difficulty = Column(String(20), nullable=False, default="medium")
    time_limit_seconds = Column(Integer, nullable=False, default=30)
    points_config = Column(JSON, nullable=True, default=lambda: {"easy": 1, "medium": 2, "hard": 3})
    is_active = Column(Boolean, nullable=False, default=True)
    sort_order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
