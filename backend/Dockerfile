FROM python:3.12-slim

# Install uv (fast Python package/dependency manager)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Install dependencies first for better layer caching
COPY pyproject.toml ./
RUN uv sync --no-install-project

COPY app ./app

# Sync again now that the project itself is present
RUN uv sync

ENV DB_PATH=/data/gym_tracker.db
VOLUME ["/data"]

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
