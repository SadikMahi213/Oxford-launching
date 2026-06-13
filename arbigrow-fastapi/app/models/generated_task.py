from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, Date, JSON,
    ForeignKey, Index, UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.base import Base


class GeneratedTask(Base):
    __tablename__ = "generated_tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    task_type_id = Column(Integer, ForeignKey("task_types.id", ondelete="SET NULL"), nullable=True)
    investment_id = Column(Integer, ForeignKey("investments.id", ondelete="SET NULL"), nullable=True)
    date = Column(Date, nullable=False)
    sort_order = Column(Integer, nullable=False, default=0)

    payload = Column(JSON, nullable=False)
    answer = Column(String(500), nullable=False)
    difficulty = Column(String(20), nullable=False, default="medium")
    points = Column(Integer, nullable=False, default=1)

    status = Column(String(20), nullable=False, default="pending")
    user_answer = Column(Text, nullable=True)
    is_correct = Column(Boolean, nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    time_spent_seconds = Column(Integer, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", backref="generated_tasks")
    task_type = relationship("TaskType", backref="generated_tasks")
    investment = relationship("Investment", backref="generated_tasks")

    __table_args__ = (
        UniqueConstraint("user_id", "date", "sort_order", name="uq_generated_task_user_date_order"),
        Index("ix_generated_tasks_user_date", "user_id", "date"),
        Index("ix_generated_tasks_user_date_status", "user_id", "date", "status"),
        Index("ix_generated_tasks_investment", "investment_id"),
    )
