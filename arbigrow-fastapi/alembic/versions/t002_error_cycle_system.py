"""t002: User error cycle system, account hold/suspension/closure

Revision ID: t002_error_cycle
Revises: t001_task_errors
Create Date: 2026-09-03
"""
from alembic import op
import sqlalchemy as sa

revision = "t002_error_cycle"
down_revision = "t001_task_errors"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Add error cycle fields to users ───────────────────────────
    op.add_column("users", sa.Column("error_count", sa.Integer(), server_default="0", nullable=False))
    op.add_column("users", sa.Column("error_cycle_start", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("error_cycle_end", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("hold_count", sa.Integer(), server_default="0", nullable=False))
    op.add_column("users", sa.Column("last_hold_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("hold_until", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("suspension_count", sa.Integer(), server_default="0", nullable=False))
    op.add_column("users", sa.Column("suspended_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("suspension_until", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("permanent_closed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("company_contact_status", sa.Boolean(), server_default="false", nullable=False))
    op.add_column("users", sa.Column("contact_recorded_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("recorded_by_admin", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True))

    # ── Add audit trail fields to task_errors ─────────────────────
    op.add_column("task_errors", sa.Column("error_count_at_time", sa.Integer(), server_default="0", nullable=False))
    op.add_column("task_errors", sa.Column("cycle_start", sa.DateTime(timezone=True), nullable=True))
    op.add_column("task_errors", sa.Column("cycle_end", sa.DateTime(timezone=True), nullable=True))
    op.add_column("task_errors", sa.Column("action_taken", sa.String(50), server_default="none", nullable=False))

    # ── Seed new config keys ──────────────────────────────────────
    op.execute("""
        INSERT INTO task_disciplinary_config (key, value, description) VALUES
        ('hold_threshold', '3', 'Number of errors to trigger account hold'),
        ('hold_duration_hours', '2', 'Hold duration in hours (freely editable)'),
        ('suspension_threshold', '5', 'Number of errors to trigger suspension'),
        ('suspension_duration_hours', '168', 'Suspension duration in hours (default 7 days)'),
        ('communication_deadline_days', '7', 'Days after suspension to contact company before permanent closure'),
        ('error_cycle_duration_hours', '24', 'Error cycle duration in hours'),
        ('max_hold_per_cycle', '1', 'Maximum holds allowed per error cycle'),
        ('warning_message', 'You have received a valid task error. Current error count: {error_count} of {hold_threshold} before account hold.', 'Warning notification message'),
        ('hold_message', 'Your account has been temporarily placed on hold due to repeated task errors. Hold ends at: {hold_until}', 'Hold notification message'),
        ('suspension_message', 'Your account has been suspended due to repeated task errors. Suspension ends at: {suspension_until}', 'Suspension notification message'),
        ('permanent_closure_message', 'Your account has been permanently closed according to the company policy.', 'Permanent closure notification message')
        ON CONFLICT (key) DO NOTHING
    """)


def downgrade() -> None:
    op.drop_column("users", "recorded_by_admin")
    op.drop_column("users", "contact_recorded_at")
    op.drop_column("users", "company_contact_status")
    op.drop_column("users", "permanent_closed_at")
    op.drop_column("users", "suspension_until")
    op.drop_column("users", "suspended_at")
    op.drop_column("users", "suspension_count")
    op.drop_column("users", "hold_until")
    op.drop_column("users", "last_hold_at")
    op.drop_column("users", "hold_count")
    op.drop_column("users", "error_cycle_end")
    op.drop_column("users", "error_cycle_start")
    op.drop_column("users", "error_count")

    op.drop_column("task_errors", "action_taken")
    op.drop_column("task_errors", "cycle_end")
    op.drop_column("task_errors", "cycle_start")
    op.drop_column("task_errors", "error_count_at_time")

    op.execute("DELETE FROM task_disciplinary_config WHERE key IN ('hold_threshold','hold_duration_hours','suspension_threshold','suspension_duration_hours','communication_deadline_days','error_cycle_duration_hours','max_hold_per_cycle','warning_message','hold_message','suspension_message','permanent_closure_message')")
