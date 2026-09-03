from sqlalchemy import ForeignKey, DateTime, Integer, String, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from sqlalchemy.sql import func

from app.core.base import Base


class TaskAttempt(Base):
    __tablename__ = "task_attempts"

    id: Mapped[int] = mapped_column(primary_key=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    task_type: Mapped[str] = mapped_column(
        String(20), nullable=False, index=True
    )  # captcha | ad_view

    reference_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    reference_type: Mapped[str | None] = mapped_column(String(50), nullable=True)

    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="completed"
    )  # completed | failed | expired | error

    error_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    error_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    attempt_number: Mapped[int] = mapped_column(Integer, default=1)

    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(500), nullable=True)

    system_action: Mapped[str | None] = mapped_column(
        String(50), nullable=True, default="none"
    )  # none | warning | restriction | suspension | review

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user = relationship("User", backref="task_attempts")


class TaskError(Base):
    __tablename__ = "task_errors"

    id: Mapped[int] = mapped_column(primary_key=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    task_type: Mapped[str] = mapped_column(
        String(20), nullable=False, index=True
    )  # captcha | ad_view

    error_code: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )
    error_reason: Mapped[str] = mapped_column(Text, nullable=False)

    task_attempt_id: Mapped[int | None] = mapped_column(
        ForeignKey("task_attempts.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    attempt_number: Mapped[int] = mapped_column(Integer, default=1)

    system_action: Mapped[str] = mapped_column(
        String(50), nullable=False, default="none"
    )  # none | warning | restriction | suspension | review

    review_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending"
    )  # pending | reviewed | dismissed

    admin_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user = relationship("User", backref="task_errors")
    task_attempt = relationship("TaskAttempt", backref="errors")


class UserWarning(Base):
    __tablename__ = "user_warnings"

    id: Mapped[int] = mapped_column(primary_key=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    warning_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # task_error_threshold | manual

    reason: Mapped[str] = mapped_column(Text, nullable=False)

    error_count_at_warning: Mapped[int] = mapped_column(Integer, default=0)

    task_type: Mapped[str | None] = mapped_column(String(20), nullable=True)

    issued_by: Mapped[str] = mapped_column(
        String(50), nullable=False, default="system"
    )  # system | admin

    admin_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user = relationship("User", foreign_keys=[user_id], backref="warnings")


class UserRestriction(Base):
    __tablename__ = "user_restrictions"

    id: Mapped[int] = mapped_column(primary_key=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    restriction_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # daily_task_blocked | daily_task_limited

    reason: Mapped[str] = mapped_column(Text, nullable=False)

    error_count_at_restriction: Mapped[int] = mapped_column(Integer, default=0)

    task_type: Mapped[str | None] = mapped_column(String(20), nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    issued_by: Mapped[str] = mapped_column(
        String(50), nullable=False, default="system"
    )  # system | admin

    admin_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user = relationship("User", foreign_keys=[user_id], backref="restrictions")


class AccountSuspension(Base):
    __tablename__ = "account_suspensions"

    id: Mapped[int] = mapped_column(primary_key=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    suspension_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # full_block | task_only_block

    reason: Mapped[str] = mapped_column(Text, nullable=False)

    triggering_error_id: Mapped[int | None] = mapped_column(
        ForeignKey("task_errors.id", ondelete="SET NULL"),
        nullable=True,
    )

    error_count_at_suspension: Mapped[int] = mapped_column(Integer, default=0)

    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="active", index=True
    )  # active | lifted | expired

    duration_hours: Mapped[int | None] = mapped_column(Integer, nullable=True)

    suspended_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    lifted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    suspended_by: Mapped[str] = mapped_column(
        String(50), nullable=False, default="system"
    )  # system | admin

    admin_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    admin_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user = relationship("User", foreign_keys=[user_id], backref="suspensions")


class TaskDisciplinaryConfig(Base):
    __tablename__ = "task_disciplinary_config"

    id: Mapped[int] = mapped_column(primary_key=True)

    key: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    value: Mapped[str] = mapped_column(Text, nullable=False)

    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class AdminAuditLog(Base):
    __tablename__ = "admin_audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True)

    admin_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
        nullable=False,
    )

    action: Mapped[str] = mapped_column(
        String(100), nullable=False, index=True
    )

    target_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    details: Mapped[str | None] = mapped_column(Text, nullable=True)

    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    admin = relationship("User", foreign_keys=[admin_id])
    target_user = relationship("User", foreign_keys=[target_user_id])
