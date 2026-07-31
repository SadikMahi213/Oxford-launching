"""add task engine tables

Revision ID: e1f2a3b4c5d6
Revises: d5e6f7a8b9c0
Create Date: 2026-06-10
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "e1f2a3b4c5d6"
down_revision = "d5e6f7a8b9c0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "task_types",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(64), unique=True, nullable=False, index=True),
        sa.Column("display_name", sa.String(120), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("icon", sa.String(10), nullable=True, server_default="📝"),
        sa.Column("generator_key", sa.String(64), nullable=False, unique=True),
        sa.Column("generator_params", postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column("difficulty_levels", postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column("default_difficulty", sa.String(20), nullable=False, server_default="medium"),
        sa.Column("time_limit_seconds", sa.Integer(), nullable=False, server_default="30"),
        sa.Column("points_config", postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "generated_tasks",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("task_type_id", sa.Integer(), sa.ForeignKey("task_types.id", ondelete="SET NULL"), nullable=True),
        sa.Column("investment_id", sa.Integer(), sa.ForeignKey("investments.id", ondelete="SET NULL"), nullable=True),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("payload", postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column("answer", sa.String(500), nullable=False),
        sa.Column("difficulty", sa.String(20), nullable=False, server_default="medium"),
        sa.Column("points", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("user_answer", sa.Text(), nullable=True),
        sa.Column("is_correct", sa.Boolean(), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("time_spent_seconds", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_unique_constraint(
        "uq_generated_task_user_date_order",
        "generated_tasks",
        ["user_id", "date", "sort_order"],
    )
    op.create_index("ix_generated_tasks_user_date", "generated_tasks", ["user_id", "date"])
    op.create_index("ix_generated_tasks_user_date_status", "generated_tasks", ["user_id", "date", "status"])
    op.create_index("ix_generated_tasks_investment", "generated_tasks", ["investment_id"])

    task_types_data = [
        {"name": "code_typing", "display_name": "Code Typing", "description": "Type the shown code snippet exactly", "icon": "💻", "generator_key": "code_typing", "difficulty_levels": '["easy","medium","hard"]', "default_difficulty": "medium", "time_limit_seconds": 30, "points_config": '{"easy":1,"medium":2,"hard":3}', "is_active": True, "sort_order": 1},
        {"name": "math_challenge", "display_name": "Math Challenge", "description": "Solve the arithmetic problem", "icon": "🔢", "generator_key": "math_challenge", "difficulty_levels": '["easy","medium","hard"]', "default_difficulty": "medium", "time_limit_seconds": 30, "points_config": '{"easy":1,"medium":2,"hard":3}', "is_active": True, "sort_order": 2},
        {"name": "character_matching", "display_name": "Character Matching", "description": "Find the character at the given position", "icon": "🔤", "generator_key": "character_matching", "difficulty_levels": '["easy","medium","hard"]', "default_difficulty": "medium", "time_limit_seconds": 20, "points_config": '{"easy":1,"medium":2,"hard":3}', "is_active": True, "sort_order": 3},
        {"name": "pattern_recognition", "display_name": "Pattern Recognition", "description": "Identify the pattern and select the next element", "icon": "🧩", "generator_key": "pattern_recognition", "difficulty_levels": '["easy","medium","hard"]', "default_difficulty": "medium", "time_limit_seconds": 30, "points_config": '{"easy":2,"medium":3,"hard":5}', "is_active": True, "sort_order": 4},
        {"name": "sequence_completion", "display_name": "Sequence Completion", "description": "Complete the arithmetic sequence", "icon": "📊", "generator_key": "sequence_completion", "difficulty_levels": '["easy","medium","hard"]', "default_difficulty": "medium", "time_limit_seconds": 25, "points_config": '{"easy":1,"medium":2,"hard":3}', "is_active": True, "sort_order": 5},
        {"name": "symbol_matching", "display_name": "Symbol Matching", "description": "Find the symbol at the given position", "icon": "🔣", "generator_key": "symbol_matching", "difficulty_levels": '["easy","medium","hard"]', "default_difficulty": "medium", "time_limit_seconds": 20, "points_config": '{"easy":1,"medium":2,"hard":3}', "is_active": True, "sort_order": 6},
        {"name": "number_identification", "display_name": "Number Identification", "description": "Identify the hidden digit", "icon": "🔢", "generator_key": "number_identification", "difficulty_levels": '["easy","medium","hard"]', "default_difficulty": "medium", "time_limit_seconds": 20, "points_config": '{"easy":1,"medium":2,"hard":3}', "is_active": True, "sort_order": 7},
        {"name": "text_verification", "display_name": "Text Verification", "description": "Type the shown text exactly", "icon": "📝", "generator_key": "text_verification", "difficulty_levels": '["easy","medium","hard"]', "default_difficulty": "medium", "time_limit_seconds": 30, "points_config": '{"easy":1,"medium":2,"hard":3}', "is_active": True, "sort_order": 8},
    ]
    task_types_table = sa.table(
        "task_types",
        sa.column("name", sa.String(64)),
        sa.column("display_name", sa.String(120)),
        sa.column("description", sa.Text()),
        sa.column("icon", sa.String(10)),
        sa.column("generator_key", sa.String(64)),
        sa.column("difficulty_levels", postgresql.JSON(astext_type=sa.Text())),
        sa.column("default_difficulty", sa.String(20)),
        sa.column("time_limit_seconds", sa.Integer()),
        sa.column("points_config", postgresql.JSON(astext_type=sa.Text())),
        sa.column("is_active", sa.Boolean()),
        sa.column("sort_order", sa.Integer()),
        sa.column("created_at", sa.DateTime(timezone=True)),
        sa.column("updated_at", sa.DateTime(timezone=True)),
    )
    op.bulk_insert(task_types_table, task_types_data)


def downgrade() -> None:
    op.drop_table("generated_tasks")
    op.drop_table("task_types")
