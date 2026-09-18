"""add task error detection and disciplinary system tables

Revision ID: t001_task_errors
Revises: platform_stats_to_string
Create Date: 2026-09-01
"""
from alembic import op
import sqlalchemy as sa

revision = "t001_task_errors"
down_revision = "t1a2b3c4d5e6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "task_attempts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("task_type", sa.String(20), nullable=False, index=True),
        sa.Column("reference_id", sa.Integer(), nullable=True),
        sa.Column("reference_type", sa.String(50), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="completed"),
        sa.Column("error_code", sa.String(50), nullable=True),
        sa.Column("error_reason", sa.Text(), nullable=True),
        sa.Column("attempt_number", sa.Integer(), server_default="1"),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.String(500), nullable=True),
        sa.Column("system_action", sa.String(50), nullable=True, server_default="none"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "task_errors",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("task_type", sa.String(20), nullable=False, index=True),
        sa.Column("error_code", sa.String(50), nullable=False, index=True),
        sa.Column("error_reason", sa.Text(), nullable=False),
        sa.Column("task_attempt_id", sa.Integer(), sa.ForeignKey("task_attempts.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("attempt_number", sa.Integer(), server_default="1"),
        sa.Column("system_action", sa.String(50), nullable=False, server_default="none"),
        sa.Column("review_status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("admin_notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "user_warnings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("warning_type", sa.String(50), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("error_count_at_warning", sa.Integer(), server_default="0"),
        sa.Column("task_type", sa.String(20), nullable=True),
        sa.Column("issued_by", sa.String(50), nullable=False, server_default="system"),
        sa.Column("admin_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "user_restrictions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("restriction_type", sa.String(50), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("error_count_at_restriction", sa.Integer(), server_default="0"),
        sa.Column("task_type", sa.String(20), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("issued_by", sa.String(50), nullable=False, server_default="system"),
        sa.Column("admin_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "account_suspensions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("suspension_type", sa.String(50), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("triggering_error_id", sa.Integer(), sa.ForeignKey("task_errors.id", ondelete="SET NULL"), nullable=True),
        sa.Column("error_count_at_suspension", sa.Integer(), server_default="0"),
        sa.Column("status", sa.String(20), nullable=False, server_default="active", index=True),
        sa.Column("duration_hours", sa.Integer(), nullable=True),
        sa.Column("suspended_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("lifted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("suspended_by", sa.String(50), nullable=False, server_default="system"),
        sa.Column("admin_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("admin_notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "task_disciplinary_config",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("key", sa.String(100), unique=True, nullable=False),
        sa.Column("value", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    op.create_table(
        "admin_audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("admin_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=False, index=True),
        sa.Column("action", sa.String(100), nullable=False, index=True),
        sa.Column("target_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("details", sa.Text(), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # Insert default disciplinary config values
    config_table = sa.table(
        "task_disciplinary_config",
        sa.Column("key", sa.String(100)),
        sa.Column("value", sa.Text()),
        sa.Column("description", sa.Text()),
    )
    op.bulk_insert(config_table, [
        {"key": "warning_threshold", "value": "3", "description": "Number of errors before issuing a warning"},
        {"key": "restriction_threshold", "value": "6", "description": "Number of errors before restricting daily task access"},
        {"key": "suspension_threshold", "value": "10", "description": "Number of errors before suspending account"},
        {"key": "suspension_duration_hours", "value": "24", "description": "Default suspension duration in hours"},
        {"key": "error_expiry_days", "value": "30", "description": "Days after which errors expire from threshold counting"},
        {"key": "captcha_incorrect_threshold", "value": "5", "description": "Consecutive incorrect captchas before warning"},
        {"key": "ad_early_exit_threshold", "value": "3", "description": "Early exits before warning for ad views"},
        {"key": "duplicate_check_window_minutes", "value": "5", "description": "Window for duplicate detection in minutes"},
    ])


def downgrade() -> None:
    op.drop_table("admin_audit_logs")
    op.drop_table("task_disciplinary_config")
    op.drop_table("account_suspensions")
    op.drop_table("user_restrictions")
    op.drop_table("user_warnings")
    op.drop_table("task_errors")
    op.drop_table("task_attempts")
