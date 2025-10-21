# Onboarding Scorer Service

A FastAPI-based microservice for calculating onboarding scores.

## Development

Install dependencies:
```bash
pip install -e .[test,dev]
```

Run the service:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Run tests:
```bash
pytest
```

## API

- `POST /score` - Calculate onboarding score
- `GET /health` - Health check
- `GET /docs` - API documentation