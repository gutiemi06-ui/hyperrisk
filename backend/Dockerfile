FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY pyproject.toml ./
COPY hyperrisk ./hyperrisk
RUN pip install --no-cache-dir .
EXPOSE 8000
USER 65532:65532
CMD ["uvicorn", "hyperrisk.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]
