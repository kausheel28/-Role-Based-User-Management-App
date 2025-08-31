#!/bin/bash

# AI-assisted: see ai-assist.md
# Startup script for User Management App

echo "🚀 Starting User Management App..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    if ! docker compose version &> /dev/null; then
        echo "❌ Docker Compose is not available. Please install Docker Compose."
        exit 1
    fi
    COMPOSE_CMD="docker compose"
else
    COMPOSE_CMD="docker-compose"
fi

echo "📦 Building and starting services..."
$COMPOSE_CMD up -d --build

echo "⏳ Waiting for database to be ready..."
sleep 10

echo "🗄️  Running database migrations..."
$COMPOSE_CMD exec backend alembic upgrade head

echo "🌱 Seeding database with initial data..."
$COMPOSE_CMD exec backend python seed_data.py

echo "✅ Application is ready!"
echo ""
echo "📊 Access the application:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "👤 Demo Accounts:"
echo "   Admin: admin@example.com / admin123"
echo "   Manager: manager@example.com / manager123"
echo "   Agent: agent1@example.com / agent123"
echo "   Viewer: viewer@example.com / viewer123"
echo ""
echo "🛑 To stop the application: $COMPOSE_CMD down"
