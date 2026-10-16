# ==============================================================================
# Multi-Stage Dockerfile de Producción para Traductor Gemini Enterprise
# ==============================================================================

# Etapa 1: Builder
FROM python:3.11-slim AS builder

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

WORKDIR /app

# Instalar uv para resolución ultrarrápida
COPY --from=ghcr.io/astral-sh/uv:0.5.24 /uv /bin/uv

# Copiar manifiestos de dependencias
COPY pyproject.toml uv.lock* ./

# Instalar dependencias en entorno virtual aislado sin incluir paquetes de desarrollo
RUN uv sync --frozen --no-dev --no-install-project

# Etapa 2: Runner final minimalista y seguro
FROM python:3.11-slim AS runner

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/app/.venv/bin:$PATH" \
    PORT=8000 \
    HOST=0.0.0.0

WORKDIR /app

# Crear usuario sin privilegios root
RUN groupadd -g 10001 appgroup && \
    useradd -u 10001 -g appgroup -s /bin/bash -m appuser && \
    mkdir -p /app/data && chown -R appuser:appgroup /app

# Copiar entorno virtual y código fuente
COPY --from=builder --chown=appuser:appgroup /app/.venv /app/.venv
COPY --chown=appuser:appgroup src/ /app/src/
COPY --chown=appuser:appgroup static/ /app/static/
COPY --chown=appuser:appgroup traductor.py /app/traductor.py

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health/live')" || exit 1

CMD ["uvicorn", "src.presentation.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
