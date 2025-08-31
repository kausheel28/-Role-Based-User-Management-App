# AI-assisted: see ai-assist.md
"""
Seed the database with initial data
"""
import os
import sys
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

# Add the current directory to the path so we can import our app
sys.path.append(os.path.dirname(__file__))

from app.db.session import SessionLocal
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.candidate import Candidate, CandidateStatus
from app.models.interview import Interview, InterviewStatus
from app.models.call import Call, CallType, CallStatus


def seed_users(db: Session):
    """Seed initial users"""
    users_data = [
        {
            "email": "admin@example.com",
            "full_name": "Admin User",
            "password": "admin123",
            "role": UserRole.ADMIN.value,
            "active": True
        },
        {
            "email": "manager@example.com",
            "full_name": "Manager User",
            "password": "manager123",
            "role": UserRole.MANAGER.value,
            "active": True
        },
        {
            "email": "agent1@example.com",
            "full_name": "Agent One",
            "password": "agent123",
            "role": UserRole.AGENT.value,
            "active": True
        },
        {
            "email": "agent2@example.com",
            "full_name": "Agent Two",
            "password": "agent123",
            "role": UserRole.AGENT.value,
            "active": True
        },
        {
            "email": "viewer@example.com",
            "full_name": "Viewer User",
            "password": "viewer123",
            "role": UserRole.VIEWER.value,
            "active": True
        }
    ]
    
    for user_data in users_data:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == user_data["email"]).first()
        if existing_user:
            print(f"User {user_data['email']} already exists, skipping...")
            continue
        
        user = User(
            email=user_data["email"],
            full_name=user_data["full_name"],
            password_hash=get_password_hash(user_data["password"]),
            role=user_data["role"],
            active=user_data["active"]
        )
        db.add(user)
        print(f"Created user: {user_data['email']}")
    
    db.commit()


def seed_candidates(db: Session):
    """Seed sample candidates"""
    candidates_data = [
        {
            "full_name": "John Smith",
            "email": "john.smith@email.com",
            "phone": "+1-555-0101",
            "position": "Software Engineer",
            "status": CandidateStatus.INTERVIEWING.value,
            "notes": "Strong technical background in Python and React"
        },
        {
            "full_name": "Sarah Johnson",
            "email": "sarah.johnson@email.com",
            "phone": "+1-555-0102",
            "position": "Product Manager",
            "status": CandidateStatus.SCREENING.value,
            "notes": "5+ years experience in product management"
        },
        {
            "full_name": "Mike Chen",
            "email": "mike.chen@email.com",
            "phone": "+1-555-0103",
            "position": "UX Designer",
            "status": CandidateStatus.NEW.value,
            "notes": "Portfolio shows excellent design skills"
        },
        {
            "full_name": "Emily Davis",
            "email": "emily.davis@email.com",
            "phone": "+1-555-0104",
            "position": "Data Scientist",
            "status": CandidateStatus.OFFER.value,
            "notes": "PhD in Statistics, strong ML background"
        },
        {
            "full_name": "Alex Wilson",
            "email": "alex.wilson@email.com",
            "phone": "+1-555-0105",
            "position": "DevOps Engineer",
            "status": CandidateStatus.HIRED.value,
            "notes": "Excellent AWS and Kubernetes experience"
        }
    ]
    
    for candidate_data in candidates_data:
        # Check if candidate already exists
        existing_candidate = db.query(Candidate).filter(
            Candidate.email == candidate_data["email"]
        ).first()
        if existing_candidate:
            print(f"Candidate {candidate_data['email']} already exists, skipping...")
            continue
        
        candidate = Candidate(**candidate_data)
        db.add(candidate)
        print(f"Created candidate: {candidate_data['full_name']}")
    
    db.commit()


def seed_interviews(db: Session):
    """Seed sample interviews"""
    # Get some candidates to link interviews to
    candidates = db.query(Candidate).limit(3).all()
    if not candidates:
        print("No candidates found, skipping interview seeding")
        return
    
    interviews_data = [
        {
            "candidate_id": candidates[0].id,
            "interviewer_name": "Tech Lead Alice",
            "scheduled_at": datetime.utcnow() + timedelta(days=1),
            "duration_minutes": 60,
            "status": InterviewStatus.SCHEDULED.value,
            "interview_type": "Technical",
            "notes": "Focus on Python and system design"
        },
        {
            "candidate_id": candidates[1].id,
            "interviewer_name": "Manager Bob",
            "scheduled_at": datetime.utcnow() + timedelta(days=2),
            "duration_minutes": 45,
            "status": InterviewStatus.SCHEDULED.value,
            "interview_type": "Behavioral",
            "notes": "Leadership and communication skills"
        },
        {
            "candidate_id": candidates[2].id,
            "interviewer_name": "Senior Developer Carol",
            "scheduled_at": datetime.utcnow() - timedelta(days=1),
            "duration_minutes": 90,
            "status": InterviewStatus.COMPLETED.value,
            "interview_type": "Technical",
            "notes": "Strong problem-solving skills",
            "score": 8
        }
    ]
    
    for interview_data in interviews_data:
        interview = Interview(**interview_data)
        db.add(interview)
        print(f"Created interview for candidate {interview_data['candidate_id']}")
    
    db.commit()


def seed_calls(db: Session):
    """Seed sample call records"""
    calls_data = [
        {
            "caller_name": "John Smith",
            "caller_number": "+1-555-0101",
            "call_type": CallType.INBOUND.value,
            "status": CallStatus.ANSWERED.value,
            "duration_seconds": 180,
            "is_important": False,
            "notes": "Follow-up on application status"
        },
        {
            "caller_name": "Sarah Johnson",
            "caller_number": "+1-555-0102",
            "call_type": CallType.OUTBOUND.value,
            "status": CallStatus.ANSWERED.value,
            "duration_seconds": 300,
            "is_important": True,
            "notes": "Scheduled interview appointment"
        },
        {
            "caller_name": "Unknown Caller",
            "caller_number": "+1-555-9999",
            "call_type": CallType.INBOUND.value,
            "status": CallStatus.MISSED.value,
            "duration_seconds": 0,
            "is_important": False,
            "notes": "Missed call, no voicemail"
        },
        {
            "caller_name": "Mike Chen",
            "caller_number": "+1-555-0103",
            "call_type": CallType.INBOUND.value,
            "status": CallStatus.ANSWERED.value,
            "duration_seconds": 120,
            "is_important": False,
            "notes": "Questions about company culture"
        },
        {
            "caller_name": "Emily Davis",
            "caller_number": "+1-555-0104",
            "call_type": CallType.OUTBOUND.value,
            "status": CallStatus.ANSWERED.value,
            "duration_seconds": 450,
            "is_important": True,
            "notes": "Offer discussion and negotiation"
        }
    ]
    
    for call_data in calls_data:
        call = Call(**call_data)
        db.add(call)
        print(f"Created call record for {call_data['caller_name']}")
    
    db.commit()


def main():
    """Main seeding function"""
    db = SessionLocal()
    
    try:
        print("Starting database seeding...")
        
        print("\n1. Seeding users...")
        seed_users(db)
        
        print("\n2. Seeding candidates...")
        seed_candidates(db)
        
        print("\n3. Seeding interviews...")
        seed_interviews(db)
        
        print("\n4. Seeding calls...")
        seed_calls(db)
        
        print("\nDatabase seeding completed successfully!")
        
    except Exception as e:
        print(f"Error during seeding: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()

