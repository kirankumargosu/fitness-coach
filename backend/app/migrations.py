"""Tiny hand-rolled migrations.

This project deliberately doesn't pull in Alembic — it's a two-person (now
three-person) household app on a single SQLite file. When the schema needs
to change in a way `Base.metadata.create_all` can't handle (SQLite can't
ALTER a column to drop NOT NULL), we do a manual rebuild-and-copy here,
guarded so it's a no-op on a fresh DB or one that's already migrated.
"""
from sqlalchemy import text
from sqlalchemy.engine import Engine


def migrate_legacy_set_entries(engine: Engine) -> None:
    """Rebuilds set_entries if it still has the old strength-only schema
    (reps/weight/weight_unit NOT NULL, no duration/distance columns).
    Existing rows are preserved as strength sets; the new cardio columns
    come across as NULL for them, which is correct.
    """
    with engine.begin() as conn:
        cols = conn.execute(text("PRAGMA table_info(set_entries)")).fetchall()
        if not cols:
            # Table doesn't exist yet — create_all will make the current
            # (already-correct) schema. Nothing to migrate.
            return

        col_names = {c[1] for c in cols}
        if "duration_seconds" in col_names:
            # Already on the new schema.
            return

        conn.execute(text("ALTER TABLE set_entries RENAME TO set_entries_legacy"))
        conn.execute(
            text(
                """
                CREATE TABLE set_entries (
                    id INTEGER NOT NULL PRIMARY KEY,
                    session_id INTEGER NOT NULL,
                    exercise_id INTEGER NOT NULL,
                    set_number INTEGER NOT NULL,
                    reps INTEGER,
                    weight FLOAT,
                    weight_unit VARCHAR(4),
                    duration_seconds INTEGER,
                    distance FLOAT,
                    distance_unit VARCHAR(4),
                    notes VARCHAR(255),
                    FOREIGN KEY(session_id) REFERENCES workout_sessions (id),
                    FOREIGN KEY(exercise_id) REFERENCES exercises (id),
                    CONSTRAINT uq_session_exercise_set
                        UNIQUE (session_id, exercise_id, set_number)
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO set_entries
                    (id, session_id, exercise_id, set_number,
                     reps, weight, weight_unit,
                     duration_seconds, distance, distance_unit, notes)
                SELECT
                    id, session_id, exercise_id, set_number,
                    reps, weight, weight_unit,
                    NULL, NULL, NULL, notes
                FROM set_entries_legacy
                """
            )
        )
        conn.execute(text("DROP TABLE set_entries_legacy"))


def migrate_users_add_auth_columns(engine: Engine) -> None:
    """Adds password_hash/salt/role to users if they're not there yet.
    Unlike the set_entries migration, this is a plain ADD COLUMN — no
    rebuild needed, since these are new nullable (or defaulted) columns
    on an otherwise-unchanged table.
    """
    with engine.begin() as conn:
        cols = conn.execute(text("PRAGMA table_info(users)")).fetchall()
        if not cols:
            return  # table doesn't exist yet — create_all handles it

        col_names = {c[1] for c in cols}
        if "role" in col_names:
            return  # already migrated

        conn.execute(text("ALTER TABLE users ADD COLUMN password_hash VARCHAR(200)"))
        conn.execute(text("ALTER TABLE users ADD COLUMN salt VARCHAR(64)"))
        conn.execute(
            text(
                "ALTER TABLE users ADD COLUMN role VARCHAR(20) "
                "NOT NULL DEFAULT 'member'"
            )
        )


def migrate_users_add_profile_columns(engine: Engine) -> None:
    """Adds first_name/last_name (avatar material) and the personal-details
    profile columns (DOB, gender, height, weight, goal) if not there yet.
    Same plain-ADD-COLUMN approach as the auth columns above.
    """
    with engine.begin() as conn:
        cols = conn.execute(text("PRAGMA table_info(users)")).fetchall()
        if not cols:
            return  # table doesn't exist yet — create_all handles it

        col_names = {c[1] for c in cols}
        if "goal" in col_names:
            return  # already migrated

        conn.execute(text("ALTER TABLE users ADD COLUMN first_name VARCHAR(50)"))
        conn.execute(text("ALTER TABLE users ADD COLUMN last_name VARCHAR(50)"))
        conn.execute(text("ALTER TABLE users ADD COLUMN date_of_birth DATE"))
        conn.execute(text("ALTER TABLE users ADD COLUMN gender VARCHAR(30)"))
        conn.execute(text("ALTER TABLE users ADD COLUMN height FLOAT"))
        conn.execute(text("ALTER TABLE users ADD COLUMN height_unit VARCHAR(4)"))
        conn.execute(text("ALTER TABLE users ADD COLUMN weight FLOAT"))
        conn.execute(text("ALTER TABLE users ADD COLUMN weight_unit VARCHAR(4)"))
        conn.execute(text("ALTER TABLE users ADD COLUMN goal TEXT"))
