# Local Setup Guide

## Prerequisites

1. **Python 3.11+** installed
2. **Node.js 18+** installed
3. **PostgreSQL** installed and running locally
4. **Git** (optional, for version control)

## Step-by-Step Setup

### 1. Database Setup

First, create the database in your local PostgreSQL:

```sql
-- Connect to PostgreSQL (using psql or pgAdmin)
CREATE DATABASE user_management;
CREATE USER postgres WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE user_management TO postgres;
```

Or if you're using the default postgres user, just create the database:
```sql
CREATE DATABASE user_management;
```

### 2. Backend Setup

1. Open terminal/command prompt and navigate to the backend folder:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
```

3. Activate the virtual environment:
- **Windows**: `venv\Scripts\activate`
- **Mac/Linux**: `source venv/bin/activate`

4. Install Python dependencies:
```bash
pip install --upgrade pip
pip install fastapi==0.104.1 uvicorn[standard]==0.24.0 sqlalchemy==2.0.23 alembic==1.12.1 psycopg2-binary==2.9.9 python-jose[cryptography]==3.3.0 passlib[bcrypt]==1.7.4 python-multipart==0.0.6 pydantic==2.5.0 pydantic-settings==2.1.0 python-dotenv==1.0.0
```

5. Create environment file:
```bash
# Create .env file in backend directory
echo "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/user_management
SECRET_KEY=your-secret-key-change-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
ALGORITHM=HS256" > .env
```

6. Run database migrations:
```bash
alembic upgrade head
```

7. Seed the database with initial data:
```bash
python seed_data.py
```

8. Start the backend server:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend Setup

1. Open a new terminal/command prompt and navigate to the frontend folder:
```bash
cd frontend
```

2. Install Node.js dependencies:
```bash
npm install
```

3. Create environment file:
```bash
# Create .env file in frontend directory
echo "REACT_APP_API_URL=http://localhost:8000" > .env
```

4. Start the frontend development server:
```bash
npm start
```

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

### 5. Demo Accounts

- **Admin**: admin@example.com / admin123
- **Manager**: manager@example.com / manager123
- **Agent**: agent1@example.com / agent123
- **Viewer**: viewer@example.com / viewer123

## Troubleshooting

### Common Issues:

1. **PostgreSQL Connection Error**:
   - Make sure PostgreSQL is running
   - Check if the database `user_management` exists
   - Verify username/password in the .env file

2. **Python Package Installation Issues**:
   - Make sure you're in the virtual environment
   - Try installing packages one by one if bulk install fails
   - On Windows, you might need Visual Studio Build Tools for some packages

3. **Frontend Not Loading**:
   - Make sure Node.js dependencies are installed
   - Check if port 3000 is available
   - Verify the API URL in the frontend .env file

4. **CORS Issues**:
   - The backend is configured to allow localhost:3000
   - If using different ports, update the CORS settings in app/core/config.py

## Alternative: Quick Setup Script

You can also use these commands for quick setup:

### Windows (PowerShell):
```powershell
# Backend
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
python seed_data.py
Start-Process powershell -ArgumentList "-Command", "uvicorn app.main:app --reload"

# Frontend (in new terminal)
cd ../frontend
npm install
npm start
```

### Mac/Linux (Bash):
```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
python seed_data.py
uvicorn app.main:app --reload &

# Frontend
cd ../frontend
npm install
npm start
```
