# Modular Onboarding + Scoring API

A complete onboarding and scoring system built with Node.js (TypeScript), PostgreSQL, Redis, and Python FastAPI. This system captures user onboarding data, processes it through a modular scoring service, and provides caching for recent sessions.

## Repository

**GitHub Repository:** https://github.com/mengeshaster/modular-onboarding-scoring.git

To initialize and push this repository:

```bash
git init
git remote add origin https://github.com/mengeshaster/modular-onboarding-scoring.git
git add .
git commit -m "Initial commit"
git branch -M main
git push -u origin main
```

## 🚀 First Deployment Quick Start

### Prerequisites for Production

- Docker and Docker Compose installed on your server
- Domain name pointed to your server (optional but recommended)
- SSL certificate (Let's Encrypt recommended)
- At least 2GB RAM and 1 CPU core

### 1. Clone and Setup

```bash
git clone https://github.com/mengeshaster/modular-onboarding-scoring.git
cd modular-onboarding-scoring
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit with production values
nano .env
```

**Critical Production Environment Variables:**

```env
# API Configuration
API_KEY=your-secure-api-key-here
PORT=3000

# Database (Production)
PGHOST=postgres
PGPORT=5432
PGDATABASE=onboarding_prod
PGUSER=onboarding_user
PGPASSWORD=your-secure-db-password

# Redis (Production)
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your-secure-redis-password

# Internal Service Security
INTERNAL_SCORER_TOKEN=your-secure-internal-token
```

### 3. Deploy with Docker

```bash
# Build and start all services
docker compose up -d --build

# Check service status
docker compose ps

# View logs
docker compose logs -f
```

### 4. Run Database Migrations

```bash
# Apply database migrations
docker compose exec api npm run migrate:up

# Verify tables were created
docker compose exec postgres psql -U onboarding_user -d onboarding_prod -c "\dt"
```

### 5. Verify Deployment

```bash
# Test API health
curl http://localhost:3000/health

# Test scorer health
curl http://localhost:8000/health

# Test full API endpoint
curl -X POST http://localhost:3000/v1/onboarding \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-secure-api-key-here" \
  -d '{
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "rawInput": {
      "personalInfo": {
        "age": 30,
        "income": 75000,
        "employment": "full-time"
      },
      "preferences": {
        "riskTolerance": "moderate"
      },
      "flags": []
    }
  }'
```

### 6. Production Security Checklist

- [ ] Change all default passwords and API keys
- [ ] Set up SSL/TLS termination (nginx proxy or load balancer)
- [ ] Configure firewall rules (only expose necessary ports)
- [ ] Set up log rotation and monitoring
- [ ] Configure database backups
- [ ] Set up health monitoring and alerting
- [ ] Review data retention policies

**Service URLs (Production):**

- API: <http://your-domain:3000>
- API Documentation: <http://your-domain:3000/docs>
- Scorer Documentation: <http://your-domain:8000/docs>

### 7. SSL Setup (Recommended)

For production, set up SSL termination with nginx:

```bash
# Install nginx and certbot
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx

# Copy nginx configuration template
sudo cp nginx.conf.example /etc/nginx/sites-available/onboarding-api
sudo nano /etc/nginx/sites-available/onboarding-api  # Edit domain name

# Enable site
sudo ln -s /etc/nginx/sites-available/onboarding-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com
```

## 🔧 Deployment Troubleshooting

### Common Deployment Issues

**Service fails to start:**

```bash
# Check service logs
docker compose logs api
docker compose logs postgres
docker compose logs redis
docker compose logs scorer

# Restart specific service
docker compose restart api
```

**Migration failures:**

```bash
# Check database connectivity
docker compose exec postgres pg_isready -U onboarding_user -d onboarding_prod

# Manually run migrations
docker compose exec api npm run migrate:up

# Check migration status
docker compose exec postgres psql -U onboarding_user -d onboarding_prod -c "SELECT * FROM pgmigrations;"
```

**Port conflicts:**

```bash
# Check what's using the ports
netstat -tulpn | grep :3000
netstat -tulpn | grep :5432
netstat -tulpn | grep :6379
netstat -tulpn | grep :8000

# Change ports in docker-compose.yml if needed
```

**Permission issues:**

```bash
# Fix file permissions
sudo chown -R $USER:$USER .
chmod +x api/src/db/migrations/*.sql
```

### Production Monitoring

**Set up log aggregation:**

```bash
# View all service logs
docker compose logs -f --tail=100

# Set up log rotation
echo '{"log-driver": "json-file", "log-opts": {"max-size": "10m", "max-file": "3"}}' | sudo tee /etc/docker/daemon.json
sudo systemctl restart docker
```

**Health monitoring script:**

```bash
#!/bin/bash
# health-check.sh
echo "Checking API health..."
curl -f http://localhost:3000/health || echo "API unhealthy"

echo "Checking Scorer health..."
curl -f http://localhost:8000/health || echo "Scorer unhealthy"

echo "Checking database..."
docker compose exec -T postgres pg_isready -U onboarding_user -d onboarding_prod || echo "Database unhealthy"
```

### Backup and Recovery

**Database backup:**

```bash
# Create backup
docker compose exec postgres pg_dump -U onboarding_user onboarding_prod > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
docker compose exec -T postgres psql -U onboarding_user onboarding_prod < backup_file.sql
```

**Redis backup:**

```bash
# Redis data persists in Docker volume by default
# To backup Redis data
docker compose exec redis redis-cli SAVE
docker cp modular-onboarding-scoring-redis-1:/data/dump.rdb ./redis_backup_$(date +%Y%m%d_%H%M%S).rdb
```

## Architecture

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   Client    │───▶│  Node.js API │───▶│ PostgreSQL  │
└─────────────┘    │  (Express)   │    │  Database   │
                   └──────┬───────┘    └─────────────┘
                          │                    ▲
                          ▼                    │
                   ┌─────────────┐            │
                   │    Redis    │            │
                   │   Cache     │            │
                   └─────────────┘            │
                          │                    │
                          ▼                    │
                   ┌─────────────┐            │
                   │  Python     │────────────┘
                   │  Scorer     │
                   │ (FastAPI)   │
                   └─────────────┘
```

**Request Flow:**
1. Client submits onboarding data to Node.js API
2. API validates and stores data in PostgreSQL
3. API calls Python scoring service for evaluation
4. API updates database with score and caches recent sessions in Redis
5. Response returned with complete session data

## Prerequisites

- Node.js 18+ and npm
- Python 3.9+
- Docker and Docker Compose (recommended)
- PostgreSQL 14+ (if running locally)
- Redis 6+ (if running locally)

## Environment Setup

1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your configuration (defaults work for Docker setup)

## Quick Start (Recommended: Docker)

Start all services with Docker Compose:

```bash
docker compose up --build
```

**Service URLs:**
- API: http://localhost:3000
- API Documentation: http://localhost:3000/docs
- Python Scorer Documentation: http://localhost:8000/docs

**Health Checks:**
- The API will wait for PostgreSQL and Redis to be ready
- Migrations are applied automatically on startup
- All services include health check endpoints

## Local Development (Without Docker)

### 1. Start Infrastructure Services

Start PostgreSQL and Redis locally:

```bash
# PostgreSQL
docker run --name postgres-dev -e POSTGRES_DB=onboarding -e POSTGRES_USER=onboarding -e POSTGRES_PASSWORD=onboarding -p 5432:5432 -d postgres:14

# Redis
docker run --name redis-dev -p 6379:6379 -d redis:6-alpine
```

### 2. Setup and Start Python Scorer

```bash
cd scorer
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -e .
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Setup and Start Node.js API

```bash
cd api
npm install
npm run migrate:up
npm run dev
```

## API Usage Examples

### Create Onboarding Session

```bash
curl -X POST http://localhost:3000/v1/onboarding \
  -H "Content-Type: application/json" \
  -H "x-api-key: dev-api-key" \
  -d '{
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "rawInput": {
      "personalInfo": {
        "age": 30,
        "income": 75000,
        "employment": "full-time"
      },
      "preferences": {
        "riskTolerance": "moderate"
      },
      "flags": []
    }
  }'
```

### Get Onboarding Session

```bash
curl -X GET http://localhost:3000/v1/onboarding/{session-id} \
  -H "x-api-key: dev-api-key"
```

### Get Recent Sessions for User

```bash
curl -X GET http://localhost:3000/v1/onboarding/recent/123e4567-e89b-12d3-a456-426614174000 \
  -H "x-api-key: dev-api-key"
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | API server port | 3000 |
| `API_KEY` | API authentication key | dev-api-key |
| `INTERNAL_SCORER_URL` | Python scorer service URL | http://scorer:8000 |
| `INTERNAL_SCORER_TOKEN` | Internal service authentication | dev-internal-token |
| `PGHOST` | PostgreSQL host | postgres |
| `PGPORT` | PostgreSQL port | 5432 |
| `PGDATABASE` | PostgreSQL database name | onboarding |
| `PGUSER` | PostgreSQL username | onboarding |
| `PGPASSWORD` | PostgreSQL password | onboarding |
| `REDIS_HOST` | Redis host | redis |
| `REDIS_PORT` | Redis port | 6379 |
| `REDIS_PASSWORD` | Redis password (optional) | |
| `SCORER_PORT` | Python scorer port | 8000 |

## Configuration & Security

### API Authentication
- All API endpoints require the `x-api-key` header
- Change `API_KEY` in production environments

### Internal Service Communication
- Python scorer validates `X-Internal-Token` header
- Use strong tokens in production

### Data Privacy
- Raw input data is stored as JSONB in PostgreSQL
- Consider data retention policies for PII
- Logs should exclude sensitive information
- Implement data encryption in production

### Request Limits
- Request body size limited to 1MB
- Consider implementing rate limiting for production

## Testing

### Node.js API Tests
```bash
cd api
npm test
```

### Python Scorer Tests
```bash
cd scorer
pytest
```

### Integration Testing
The test suite includes end-to-end tests that verify:
- Complete onboarding flow
- Database persistence
- Redis caching
- Scoring service integration

## Database Schema

### onboarding_sessions Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, auto-generated |
| `user_id` | UUID | User identifier |
| `created_at` | TIMESTAMPTZ | Session creation time |
| `raw_input` | JSONB | Original user input |
| `parsed_data` | JSONB | Validated and processed data |
| `score` | INT | Calculated score (0-100) |
| `score_explanation` | TEXT | Human-readable score explanation |
| `source_ip` | INET | Client IP address (optional) |
| `user_agent` | TEXT | Client user agent (optional) |

### Indexes
- Primary key on `id`
- Index on `(user_id, created_at DESC)` for efficient recent queries

## Redis Schema

### Recent Sessions Cache
- **Key Pattern:** `onboarding:recent:{user_id}`
- **Type:** List
- **Content:** JSON objects `{id, createdAt, score}`
- **Limit:** 10 most recent sessions per user
- **TTL:** 24 hours (86400 seconds)

## Scoring Logic

The Python scoring service implements deterministic rule-based scoring:

1. **Base Score:** 50 points
2. **Income Bonus:** Up to +30 points based on income level
3. **Risk Penalties:** -10 points per risk flag
4. **Final Score:** Clamped between 0-100

## Troubleshooting

### Common Issues

**Database Connection Failed**
- Verify PostgreSQL is running and accessible
- Check connection credentials in `.env`
- Ensure database exists

**Redis Connection Failed**
- Verify Redis is running
- Check Redis host/port configuration
- Test with `redis-cli ping`

**Migration Errors**
- Ensure PostgreSQL user has CREATE privileges
- Check migration SQL syntax
- Verify pgcrypto extension is available

**Scorer Service Unreachable**
- Verify Python service is running on correct port
- Check internal token configuration
- Review service logs for startup errors

**Docker Compose Issues**
- Run `docker compose down` and `docker compose up --build`
- Check service dependencies and health checks
- Review logs with `docker compose logs <service-name>`

### Health Check Endpoints

- API Health: `GET /health`
- Scorer Health: `GET /health`

## Development Scripts

### Node.js API (api/package.json)
- `npm run dev` - Start development server with hot reload
- `npm start` - Start production server
- `npm run build` - Compile TypeScript to JavaScript
- `npm run lint` - Run ESLint
- `npm test` - Run test suite
- `npm run migrate:up` - Apply database migrations

### Python Scorer
- `uvicorn app.main:app --reload` - Start development server
- `pytest` - Run test suite
- `pytest --cov` - Run tests with coverage

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

For questions or support, please open an issue on GitHub.