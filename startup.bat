@echo off
REM AI-assisted: see ai-assist.md
REM Startup script for User Management App (Windows)

echo 🚀 Starting User Management App...

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)

REM Check for Docker Compose
docker-compose version >nul 2>&1
if errorlevel 1 (
    docker compose version >nul 2>&1
    if errorlevel 1 (
        echo ❌ Docker Compose is not available. Please install Docker Compose.
        pause
        exit /b 1
    )
    set COMPOSE_CMD=docker compose
) else (
    set COMPOSE_CMD=docker-compose
)

echo 📦 Building and starting services...
%COMPOSE_CMD% up -d --build

echo ⏳ Waiting for database to be ready...
timeout /t 10 /nobreak >nul

echo 🗄️  Running database migrations...
%COMPOSE_CMD% exec backend alembic upgrade head

echo 🌱 Seeding database with initial data...
%COMPOSE_CMD% exec backend python seed_data.py

echo ✅ Application is ready!
echo.
echo 📊 Access the application:
echo    Frontend: http://localhost:3000
echo    Backend API: http://localhost:8000
echo    API Docs: http://localhost:8000/docs
echo.
echo 👤 Demo Accounts:
echo    Admin: admin@example.com / admin123
echo    Manager: manager@example.com / manager123
echo    Agent: agent1@example.com / agent123
echo    Viewer: viewer@example.com / viewer123
echo.
echo 🛑 To stop the application: %COMPOSE_CMD% down
pause
