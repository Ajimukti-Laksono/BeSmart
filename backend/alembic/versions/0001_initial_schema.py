"""Initial schema for BeasiswaSmart (BeSmart)

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-11-10 19:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column(
            "role",
            sa.Enum("admin", "panitia", "mahasiswa", name="user_role_enum"),
            server_default="mahasiswa",
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_index(op.f("ix_users_role"), "users", ["role"], unique=False)

    op.create_table(
        "scholarship_periods",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("nama_periode", sa.String(length=150), nullable=False),
        sa.Column("kuota_penerima", sa.Integer(), nullable=False),
        sa.Column(
            "status",
            sa.Enum("buka", "proses", "selesai", name="period_status_enum"),
            server_default="buka",
            nullable=False,
        ),
        sa.Column(
            "is_active",
            sa.Boolean(),
            server_default=sa.text("1"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "kuota_penerima > 0",
            name="ck_scholarship_periods_kuota_positive",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_scholarship_periods_is_active"),
        "scholarship_periods",
        ["is_active"],
        unique=False,
    )
    op.create_index(
        op.f("ix_scholarship_periods_status"),
        "scholarship_periods",
        ["status"],
        unique=False,
    )

    op.create_table(
        "criteria",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("kode_kriteria", sa.String(length=20), nullable=False),
        sa.Column("nama_kriteria", sa.String(length=150), nullable=False),
        sa.Column(
            "tipe",
            sa.Enum("benefit", "cost", name="criterion_type_enum"),
            nullable=False,
        ),
        sa.Column("bobot", sa.Numeric(precision=6, scale=4), nullable=False),
        sa.Column("keterangan", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "bobot >= 0 AND bobot <= 1",
            name="ck_criteria_bobot_range",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_criteria_kode_kriteria"),
        "criteria",
        ["kode_kriteria"],
        unique=True,
    )

    op.create_table(
        "applicants",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("period_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("nim", sa.String(length=30), nullable=False),
        sa.Column("nama_lengkap", sa.String(length=150), nullable=False),
        sa.Column("program_studi", sa.String(length=120), nullable=False),
        sa.Column("berkas_path", sa.String(length=500), nullable=True),
        sa.Column(
            "status_verifikasi",
            sa.Enum("pending", "verified", "rejected", name="verification_status_enum"),
            server_default="pending",
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["period_id"],
            ["scholarship_periods.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("period_id", "user_id", name="uq_applicants_period_user"),
    )
    op.create_index(op.f("ix_applicants_nim"), "applicants", ["nim"], unique=False)
    op.create_index(
        op.f("ix_applicants_period_id"), "applicants", ["period_id"], unique=False
    )
    op.create_index(
        "ix_applicants_period_status",
        "applicants",
        ["period_id", "status_verifikasi"],
        unique=False,
    )
    op.create_index(
        op.f("ix_applicants_status_verifikasi"),
        "applicants",
        ["status_verifikasi"],
        unique=False,
    )
    op.create_index(
        op.f("ix_applicants_user_id"), "applicants", ["user_id"], unique=False
    )

    op.create_table(
        "applicant_scores",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("applicant_id", sa.Integer(), nullable=False),
        sa.Column("criterion_id", sa.Integer(), nullable=False),
        sa.Column("nilai_input", sa.Numeric(precision=15, scale=4), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["applicant_id"],
            ["applicants.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["criterion_id"],
            ["criteria.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "applicant_id",
            "criterion_id",
            name="uq_applicant_scores_applicant_criterion",
        ),
    )
    op.create_index(
        op.f("ix_applicant_scores_applicant_id"),
        "applicant_scores",
        ["applicant_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_applicant_scores_criterion_id"),
        "applicant_scores",
        ["criterion_id"],
        unique=False,
    )

    op.create_table(
        "aras_results",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("period_id", sa.Integer(), nullable=False),
        sa.Column("applicant_id", sa.Integer(), nullable=False),
        sa.Column("nilai_si", sa.Numeric(precision=12, scale=8), nullable=False),
        sa.Column("nilai_ki", sa.Numeric(precision=12, scale=8), nullable=False),
        sa.Column("ranking", sa.Integer(), nullable=False),
        sa.Column(
            "status_lolos",
            sa.Enum("lolos", "tidak_lolos", name="eligibility_status_enum"),
            nullable=False,
        ),
        sa.Column(
            "calculated_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["applicant_id"],
            ["applicants.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["period_id"],
            ["scholarship_periods.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "period_id",
            "applicant_id",
            name="uq_aras_results_period_applicant",
        ),
    )
    op.create_index(
        op.f("ix_aras_results_applicant_id"),
        "aras_results",
        ["applicant_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_aras_results_period_id"),
        "aras_results",
        ["period_id"],
        unique=False,
    )
    op.create_index(
        "ix_aras_results_period_ranking",
        "aras_results",
        ["period_id", "ranking"],
        unique=False,
    )
    op.create_index(
        op.f("ix_aras_results_status_lolos"),
        "aras_results",
        ["status_lolos"],
        unique=False,
    )

    op.create_table(
        "aras_calculation_logs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("period_id", sa.Integer(), nullable=False),
        sa.Column("snapshot", sa.JSON(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["period_id"],
            ["scholarship_periods.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_aras_calculation_logs_period_id"),
        "aras_calculation_logs",
        ["period_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_aras_calculation_logs_period_id"),
        table_name="aras_calculation_logs",
    )
    op.drop_table("aras_calculation_logs")

    op.drop_index(op.f("ix_aras_results_status_lolos"), table_name="aras_results")
    op.drop_index("ix_aras_results_period_ranking", table_name="aras_results")
    op.drop_index(op.f("ix_aras_results_period_id"), table_name="aras_results")
    op.drop_index(op.f("ix_aras_results_applicant_id"), table_name="aras_results")
    op.drop_table("aras_results")

    op.drop_index(
        op.f("ix_applicant_scores_criterion_id"), table_name="applicant_scores"
    )
    op.drop_index(
        op.f("ix_applicant_scores_applicant_id"), table_name="applicant_scores"
    )
    op.drop_table("applicant_scores")

    op.drop_index(op.f("ix_applicants_user_id"), table_name="applicants")
    op.drop_index(op.f("ix_applicants_status_verifikasi"), table_name="applicants")
    op.drop_index("ix_applicants_period_status", table_name="applicants")
    op.drop_index(op.f("ix_applicants_period_id"), table_name="applicants")
    op.drop_index(op.f("ix_applicants_nim"), table_name="applicants")
    op.drop_table("applicants")

    op.drop_index(op.f("ix_criteria_kode_kriteria"), table_name="criteria")
    op.drop_table("criteria")

    op.drop_index(
        op.f("ix_scholarship_periods_status"), table_name="scholarship_periods"
    )
    op.drop_index(
        op.f("ix_scholarship_periods_is_active"), table_name="scholarship_periods"
    )
    op.drop_table("scholarship_periods")

    op.drop_index(op.f("ix_users_role"), table_name="users")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")

