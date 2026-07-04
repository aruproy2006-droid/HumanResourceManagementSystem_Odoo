import datetime
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import jwt

from database import get_db, engine, Base
import models
import schemas
from auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user,
    get_current_admin,
    SECRET_KEY,
    ALGORITHM
)

# Initialize database tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Human Resource Management System (HRMS) API")

# Configure CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- AUTH ENDPOINTS -----------------

@app.post("/api/auth/signup", response_model=schemas.UserResponse)
def signup(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check if email exists
    if db.query(models.User).filter(models.User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if employee ID exists
    if db.query(models.User).filter(models.User.employee_id == user_data.employee_id).first():
        raise HTTPException(status_code=400, detail="Employee ID already registered")

    # Create User
    new_user = models.User(
        employee_id=user_data.employee_id,
        name=user_data.name,
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        role=user_data.role,
        is_verified=False  # Verification required
    )
    db.add(new_user)
    db.flush()

    # Create blank Profile
    new_profile = models.Profile(
        user_id=new_user.id,
        phone="",
        address="",
        profile_picture_url="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
        job_title="Software Trainee" if user_data.role == "employee" else "HR Assistant",
        department="Engineering" if user_data.role == "employee" else "HR",
        date_of_joining=datetime.date.today()
    )
    
    # Create blank Salary Structure
    new_salary = models.SalaryStructure(
        user_id=new_user.id,
        base_salary=25000.00,
        allowances=5000.00,
        deductions=1000.00,
        effective_date=datetime.date.today(),
        updated_by=new_user.id
    )

    db.add(new_profile)
    db.add(new_salary)
    db.commit()
    db.refresh(new_user)

    # Email Verification Link Mocking: Log to stdout
    verification_token = create_access_token({"sub": new_user.email})
    verification_url = f"http://localhost:8000/api/auth/verify?token={verification_token}"
    print(f"\n=======================================================")
    print(f"EMAIL VERIFICATION FOR {new_user.name} ({new_user.email}):")
    print(f"Link: {verification_url}")
    print(f"=======================================================\n")

    return new_user

@app.post("/api/auth/login", response_model=schemas.Token)
def login(login_data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email before logging in. Check console logs for link."
        )

    # Generate token
    access_token = create_access_token(data={"sub": user.email})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "name": user.name,
        "email": user.email,
        "employee_id": user.employee_id
    }

@app.get("/api/auth/verify")
def verify_email(token: str = Query(...), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=400, detail="Invalid token payload")
    except jwt.PyJWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_verified = True
    db.commit()
    
    # Return HTML for browser compatibility to show a pretty success message
    from fastapi.responses import HTMLResponse
    return HTMLResponse(content="""
        <html>
            <head>
                <title>Email Verified</title>
                <style>
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        background: #0f172a;
                        color: #f8fafc;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        margin: 0;
                    }
                    .card {
                        background: rgba(30, 41, 59, 0.7);
                        backdrop-filter: blur(16px);
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        border-radius: 16px;
                        padding: 40px;
                        text-align: center;
                        max-width: 400px;
                        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
                    }
                    h1 { color: #10b981; margin-bottom: 10px; }
                    p { color: #94a3b8; font-size: 16px; line-height: 1.5; }
                    a {
                        display: inline-block;
                        margin-top: 20px;
                        background: #4f46e5;
                        color: white;
                        padding: 10px 24px;
                        border-radius: 8px;
                        text-decoration: none;
                        font-weight: 600;
                        transition: background 0.2s;
                    }
                    a:hover { background: #4338ca; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h1>Verification Successful!</h1>
                    <p>Your email has been verified. You can now log into the HRMS application dashboard.</p>
                    <a href="/#login">Go to Login</a>
                </div>
            </body>
        </html>
    """)

# ----------------- EMPLOYEE DIRECTORY & PROFILE ENDPOINTS -----------------

@app.get("/api/users/me", response_model=schemas.UserResponse)
def read_current_user_profile(current_user: models.User = Depends(get_current_user)):
    return current_user

@app.put("/api/users/me", response_model=schemas.ProfileResponse)
def update_current_user_profile(
    profile_data: schemas.ProfileUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(models.Profile).filter(models.Profile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    # Employees can edit phone, address, and profile picture (simulated as text URL here)
    if profile_data.phone is not None:
        profile.phone = profile_data.phone
    if profile_data.address is not None:
        profile.address = profile_data.address

    db.commit()
    db.refresh(profile)
    return profile

@app.get("/api/users", response_model=List[schemas.UserResponse])
def list_employees(
    current_user: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Admin Only: List all users and profiles.
    """
    return db.query(models.User).all()

@app.put("/api/users/{user_id}", response_model=schemas.UserResponse)
def admin_update_employee(
    user_id: int,
    user_update: schemas.UserCreate, # reuse signup schema for fields, password optional update
    db: Session = Depends(get_db),
    admin_user: models.User = Depends(get_current_admin)
):
    """
    Admin Only: Update full employee account, profile and salary structures.
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Employee not found")

    user.name = user_update.name
    user.email = user_update.email
    user.employee_id = user_update.employee_id
    user.role = user_update.role
    
    if user_update.password:
        user.password_hash = get_password_hash(user_update.password)

    db.commit()
    db.refresh(user)
    return user

@app.put("/api/users/{user_id}/profile", response_model=schemas.ProfileResponse)
def admin_update_employee_profile(
    user_id: int,
    profile_update: schemas.ProfileUpdate,
    db: Session = Depends(get_db),
    admin_user: models.User = Depends(get_current_admin)
):
    """
    Admin Only: Update fields in employee profile.
    """
    profile = db.query(models.Profile).filter(models.Profile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    for field, val in profile_update.dict(exclude_unset=True).items():
        setattr(profile, field, val)

    db.commit()
    db.refresh(profile)
    return profile

# ----------------- ATTENDANCE ENDPOINTS -----------------

@app.post("/api/attendance/checkin", response_model=schemas.AttendanceResponse)
def checkin(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    today = datetime.date.today()
    # Check if already checked in today
    record = db.query(models.Attendance).filter(
        models.Attendance.user_id == current_user.id,
        models.Attendance.date == today
    ).first()

    if record:
        if record.check_in_time:
            raise HTTPException(status_code=400, detail="Already checked in today")
        record.check_in_time = datetime.datetime.utcnow()
        record.status = "present"
    else:
        record = models.Attendance(
            user_id=current_user.id,
            date=today,
            check_in_time=datetime.datetime.utcnow(),
            status="present"
        )
        db.add(record)

    db.commit()
    db.refresh(record)
    return record

@app.post("/api/attendance/checkout", response_model=schemas.AttendanceResponse)
def checkout(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    today = datetime.date.today()
    record = db.query(models.Attendance).filter(
        models.Attendance.user_id == current_user.id,
        models.Attendance.date == today
    ).first()

    if not record or not record.check_in_time:
        raise HTTPException(status_code=400, detail="Must check in before checking out")
    
    if record.check_out_time:
        raise HTTPException(status_code=400, detail="Already checked out today")

    record.check_out_time = datetime.datetime.utcnow()
    # Check working duration
    duration = record.check_out_time - record.check_in_time
    if duration < datetime.timedelta(hours=4):
        record.status = "half-day"
    else:
        record.status = "present"

    db.commit()
    db.refresh(record)
    return record

@app.get("/api/attendance/history", response_model=List[schemas.AttendanceResponse])
def get_attendance_history(
    user_id: Optional[int] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Standard employee can only see their own attendance
    if current_user.role != "admin":
        return db.query(models.Attendance).filter(models.Attendance.user_id == current_user.id).order_by(models.Attendance.date.desc()).all()
    
    # Admin can filter by user_id or see all
    query = db.query(models.Attendance)
    if user_id:
        query = query.filter(models.Attendance.user_id == user_id)
    return query.order_by(models.Attendance.date.desc()).all()

# ----------------- LEAVE ENDPOINTS -----------------

@app.post("/api/leave/request", response_model=schemas.LeaveResponse)
def apply_leave(
    leave_data: schemas.LeaveCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if leave_data.start_date > leave_data.end_date:
        raise HTTPException(status_code=400, detail="Start date cannot be after end date")

    # Apply
    new_request = models.LeaveRequest(
        user_id=current_user.id,
        leave_type=leave_data.leave_type,
        start_date=leave_data.start_date,
        end_date=leave_data.end_date,
        remarks=leave_data.remarks,
        status="pending"
    )
    db.add(new_request)
    db.commit()
    db.refresh(new_request)

    # Attach employee metadata for serialization
    new_request.employee_name = current_user.name
    new_request.employee_id = current_user.employee_id

    return new_request

@app.get("/api/leave/requests", response_model=List[schemas.LeaveResponse])
def get_leave_requests(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == "admin":
        requests = db.query(models.LeaveRequest).order_by(models.LeaveRequest.created_at.desc()).all()
    else:
        requests = db.query(models.LeaveRequest).filter(models.LeaveRequest.user_id == current_user.id).order_by(models.LeaveRequest.created_at.desc()).all()
    
    # Attach employee details manually
    for req in requests:
        user = db.query(models.User).filter(models.User.id == req.user_id).first()
        if user:
            req.employee_name = user.name
            req.employee_id = user.employee_id
            
    return requests

@app.put("/api/leave/requests/{leave_id}/review", response_model=schemas.LeaveResponse)
def review_leave_request(
    leave_id: int,
    review_data: schemas.LeaveReview,
    admin_user: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    req = db.query(models.LeaveRequest).filter(models.LeaveRequest.id == leave_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Leave request not found")

    req.status = review_data.status
    req.reviewed_by = admin_user.id
    req.reviewer_comments = review_data.reviewer_comments

    # If approved, insert corresponding "leave" records into Attendance database for those dates
    if review_data.status == "approved":
        current_date = req.start_date
        while current_date <= req.end_date:
            # Check if record already exists for the day
            existing = db.query(models.Attendance).filter(
                models.Attendance.user_id == req.user_id,
                models.Attendance.date == current_date
            ).first()
            if existing:
                existing.status = "leave"
            else:
                attn_leave = models.Attendance(
                    user_id=req.user_id,
                    date=current_date,
                    status="leave"
                )
                db.add(attn_leave)
            current_date += datetime.timedelta(days=1)

    db.commit()
    db.refresh(req)
    
    user = db.query(models.User).filter(models.User.id == req.user_id).first()
    if user:
        req.employee_name = user.name
        req.employee_id = user.employee_id

    return req

# ----------------- PAYROLL ENDPOINTS -----------------

@app.get("/api/payroll/me", response_model=schemas.SalaryResponse)
def read_my_payroll(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    salary = db.query(models.SalaryStructure).filter(models.SalaryStructure.user_id == current_user.id).first()
    if not salary:
        raise HTTPException(status_code=404, detail="Salary structure not found")
    return salary

@app.put("/api/payroll/{user_id}", response_model=schemas.SalaryResponse)
def admin_update_payroll(
    user_id: int,
    salary_update: schemas.SalaryUpdate,
    admin_user: models.User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    salary = db.query(models.SalaryStructure).filter(models.SalaryStructure.user_id == user_id).first()
    if not salary:
        # Create new structure if not found
        salary = models.SalaryStructure(user_id=user_id)
        db.add(salary)
        
    salary.base_salary = salary_update.base_salary
    salary.allowances = salary_update.allowances
    salary.deductions = salary_update.deductions
    salary.effective_date = salary_update.effective_date or datetime.date.today()
    salary.updated_by = admin_user.id

    db.commit()
    db.refresh(salary)
    return salary

# Mount static files for the SPA frontend
app.mount("/", StaticFiles(directory="static", html=True), name="static")
