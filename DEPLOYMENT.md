# Deployment Guide

## Overview

This guide covers deployment options for the User Management & Multi-Screen Admin App, from local development to production environments.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Local Development](#local-development)
3. [Docker Deployment](#docker-deployment)
4. [Production Deployment](#production-deployment)
5. [Environment Configuration](#environment-configuration)
6. [CI/CD Pipeline](#cicd-pipeline)
7. [Monitoring & Maintenance](#monitoring--maintenance)

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local frontend development)
- Python 3.11+ (for local backend development)
- PostgreSQL 15+ (for local database)

### Docker Deployment (Recommended)

1. **Clone the repository**:
```bash
git clone <repository-url>
cd user-management-app
```

2. **Start the application**:
```bash
docker-compose up -d
```

3. **Access the application**:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

4. **Default Admin Credentials**:
- Email: `admin@example.com`
- Password: `admin123`

## Local Development

### Backend Setup

1. **Navigate to backend directory**:
```bash
cd backend
```

2. **Create and activate virtual environment**:
```bash
python -m venv venv
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate
```

3. **Install dependencies**:
```bash
pip install -r requirements.txt
```

4. **Set up environment variables**:
```bash
# Windows
copy env_local .env
# Linux/Mac
cp env_local .env
```

5. **Set up database**:
```bash
# Ensure PostgreSQL is running with:
# - Username: postgres
# - Password: root
# - Database: user_management

# Run migrations
alembic upgrade head

# Seed initial data
python seed_data.py
```

6. **Start the backend server**:
```bash
python -m uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

1. **Navigate to frontend directory**:
```bash
cd frontend
```

2. **Install dependencies**:
```bash
npm install
```

3. **Start the development server**:
```bash
npm start
```

The frontend will be available at http://localhost:3000

### Database Configuration

**Local PostgreSQL Setup**:
- **Host**: localhost
- **Port**: 5432
- **Database**: user_management
- **Username**: postgres
- **Password**: root

**Connection String**:
```
postgresql://postgres:root@localhost:5432/user_management
```

## Docker Deployment

### Development with Docker

The `docker-compose.yml` file provides a complete development environment:

```yaml
version: '3.8'
services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=http://localhost:8000
    volumes:
      - ./frontend:/app
      - /app/node_modules
    
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/user_management
    depends_on:
      - db
    volumes:
      - ./backend:/app
    
  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=user_management
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Commands

- **Start all services**: `docker-compose up -d`
- **View logs**: `docker-compose logs -f`
- **Stop services**: `docker-compose down`
- **Rebuild containers**: `docker-compose up --build`
- **Access database**: `docker-compose exec db psql -U postgres -d user_management`

### Docker Best Practices

1. **Multi-stage builds** for optimized production images
2. **Health checks** for service monitoring
3. **Volume mounts** for persistent data
4. **Environment variables** for configuration
5. **Non-root users** for security

## Production Deployment

### Frontend Deployment Options

#### 1. Vercel (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy from frontend directory
cd frontend
vercel --prod
```

**Environment Variables**:
```
REACT_APP_API_URL=https://your-backend-url.com
```

#### 2. Netlify

```bash
# Build the frontend
cd frontend
npm run build

# Deploy build folder to Netlify
# Or connect GitHub repository for automatic deployments
```

#### 3. AWS S3 + CloudFront

```bash
# Build the frontend
npm run build

# Upload to S3 bucket
aws s3 sync build/ s3://your-bucket-name --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

### Backend Deployment Options

#### 1. Railway (Recommended)

1. **Connect GitHub repository** to Railway
2. **Set environment variables**:
```
DATABASE_URL=postgresql://user:password@host:port/database
SECRET_KEY=your-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
BACKEND_CORS_ORIGINS=["https://your-frontend-url.com"]
```
3. **Deploy automatically** on git push

#### 2. Render

```yaml
# render.yaml
services:
  - type: web
    name: user-management-backend
    env: python
    buildCommand: "pip install -r requirements.txt"
    startCommand: "uvicorn app.main:app --host 0.0.0.0 --port $PORT"
    envVars:
      - key: DATABASE_URL
        sync: false
      - key: SECRET_KEY
        sync: false
```

#### 3. Heroku

```bash
# Install Heroku CLI and login
heroku login

# Create Heroku app
heroku create your-app-name

# Set environment variables
heroku config:set SECRET_KEY=your-secret-key
heroku config:set DATABASE_URL=postgresql://...

# Deploy
git push heroku main
```

### Database Deployment Options

#### 1. Railway PostgreSQL

- **Managed service** with automatic backups
- **Connection pooling** included
- **Monitoring** and metrics dashboard
- **Easy scaling** and maintenance

#### 2. AWS RDS

```bash
# Create RDS instance
aws rds create-db-instance \
    --db-instance-identifier user-management-db \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --master-username postgres \
    --master-user-password your-password \
    --allocated-storage 20
```

#### 3. Supabase

- **Database as a Service** with real-time features
- **Built-in authentication** (optional)
- **Automatic backups** and scaling
- **Dashboard** for database management

## Environment Configuration

### Backend Environment Variables

#### Development (.env)
```bash
# Database
DATABASE_URL=postgresql://postgres:root@localhost:5432/user_management

# Security
SECRET_KEY=your-development-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS
BACKEND_CORS_ORIGINS=["http://localhost:3000"]

# Rate Limiting
REDIS_URL=redis://localhost:6379
```

#### Production (.env.production)
```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Security
SECRET_KEY=your-production-secret-key-minimum-32-characters
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS
BACKEND_CORS_ORIGINS=["https://your-frontend-domain.com"]

# Rate Limiting
REDIS_URL=redis://your-redis-host:6379

# Optional: Sentry for error tracking
SENTRY_DSN=https://your-sentry-dsn
```

### Frontend Environment Variables

#### Development (.env)
```bash
REACT_APP_API_URL=http://localhost:8000
```

#### Production (.env.production)
```bash
REACT_APP_API_URL=https://your-backend-domain.com
```

### Security Considerations

1. **Never commit** `.env` files to version control
2. **Use strong secrets** (minimum 32 characters)
3. **Rotate secrets** regularly
4. **Restrict CORS origins** to trusted domains
5. **Use HTTPS** in production
6. **Enable security headers** and CSRF protection

## CI/CD Pipeline

### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    
    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install Python dependencies
      run: |
        cd backend
        pip install -r requirements.txt
        pip install -r requirements-dev.txt
    
    - name: Install Node.js dependencies
      run: |
        cd frontend
        npm install
    
    - name: Run Python tests
      run: |
        cd backend
        pytest
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
    
    - name: Run Node.js tests
      run: |
        cd frontend
        npm test -- --coverage --watchAll=false
    
    - name: Build frontend
      run: |
        cd frontend
        npm run build
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to Railway
      run: |
        # Railway deployment commands
        echo "Deploying to Railway..."
    
    - name: Deploy to Vercel
      run: |
        # Vercel deployment commands
        echo "Deploying to Vercel..."
```

### Quality Gates

1. **Linting**: ESLint (frontend) and flake8 (backend)
2. **Type Checking**: TypeScript and mypy
3. **Testing**: Jest (frontend) and pytest (backend)
4. **Security Scanning**: npm audit and safety
5. **Code Coverage**: Minimum threshold enforcement

### Deployment Strategies

#### 1. Blue-Green Deployment
- **Zero downtime** deployments
- **Quick rollback** capability
- **Full environment** testing

#### 2. Rolling Deployment
- **Gradual updates** with health checks
- **Automatic rollback** on failure
- **Resource efficient** approach

#### 3. Canary Deployment
- **Progressive rollout** to subset of users
- **Risk mitigation** through gradual exposure
- **Performance monitoring** during rollout

## Monitoring & Maintenance

### Application Monitoring

#### 1. Health Checks

**Backend Health Endpoint**:
```python
@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}
```

**Database Health Check**:
```python
@app.get("/health/db")
def database_health(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=503, detail="Database unavailable")
```

#### 2. Logging

**Structured Logging**:
```python
import logging
import json

logger = logging.getLogger(__name__)

def log_user_action(user_id: int, action: str, metadata: dict):
    logger.info(json.dumps({
        "user_id": user_id,
        "action": action,
        "metadata": metadata,
        "timestamp": datetime.utcnow().isoformat()
    }))
```

#### 3. Error Tracking

**Sentry Integration**:
```python
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

sentry_sdk.init(
    dsn="YOUR_SENTRY_DSN",
    integrations=[FastApiIntegration(auto_enable=True)],
    traces_sample_rate=0.1,
)
```

### Performance Monitoring

#### 1. Metrics Collection
- **Response times**: API endpoint performance
- **Error rates**: 4xx and 5xx error tracking
- **Throughput**: Requests per second
- **Database performance**: Query execution times

#### 2. Alerting
- **High error rates**: > 5% error rate
- **Slow responses**: > 2 second response time
- **Database issues**: Connection failures
- **Security events**: Multiple failed login attempts

### Backup & Recovery

#### 1. Database Backups

**Automated Backups**:
```bash
# Daily backup script
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME | gzip > backup_$(date +%Y%m%d).sql.gz

# Retention policy: Keep 7 daily, 4 weekly, 12 monthly backups
```

**Point-in-Time Recovery**:
```bash
# Enable WAL archiving for PITR
archive_mode = on
archive_command = 'cp %p /path/to/archive/%f'
```

#### 2. Application Recovery

**Disaster Recovery Plan**:
1. **Database restoration** from latest backup
2. **Application redeployment** from git repository
3. **Configuration restoration** from secure storage
4. **DNS updates** if infrastructure changed
5. **Verification testing** of critical functions

### Maintenance Tasks

#### 1. Regular Updates
- **Security patches**: Monthly security updates
- **Dependency updates**: Quarterly dependency reviews
- **Database maintenance**: Index optimization and cleanup

#### 2. Performance Optimization
- **Query optimization**: Slow query analysis
- **Index maintenance**: Regular index analysis
- **Cache optimization**: Cache hit rate monitoring

#### 3. Security Audits
- **Dependency scanning**: Automated vulnerability scanning
- **Penetration testing**: Quarterly security assessments
- **Access reviews**: User permission audits

### Scaling Considerations

#### 1. Horizontal Scaling
- **Load balancers**: Multiple backend instances
- **Database read replicas**: Read query distribution
- **CDN**: Static asset distribution

#### 2. Vertical Scaling
- **Resource monitoring**: CPU, memory, disk usage
- **Capacity planning**: Growth projection analysis
- **Performance testing**: Load testing and optimization

#### 3. Caching Strategy
- **Application caching**: Redis for session storage
- **Database caching**: Query result caching
- **CDN caching**: Static asset caching

---

*This deployment guide should be updated as new deployment options and best practices emerge.*
