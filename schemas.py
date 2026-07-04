from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime, date

# Auth Schemas
class UserCreate(BaseModel):
    employee_id: str
    name: str
    email: EmailStr
    password: str
    role: str = "employee"  # "admin" or "employee"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    name: str
    email: str
    employee_id: str

# Profile Schemas
class ProfileBase(BaseModel):
    phone: Optional[str] = None
    address: Optional[str] = None
    profile_picture_url: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    date_of_joining: Optional[date] = None

class ProfileUpdate(BaseModel):
    phone: Optional[str] = None
    address: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    date_of_joining: Optional[date] = None

class ProfileResponse(ProfileBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

# Salary Schemas
class SalaryBase(BaseModel):
    base_salary: float
    allowances: float
    deductions: float
    effective_date: date

class SalaryUpdate(BaseModel):
    base_salary: float
    allowances: float
    deductions: float
    effective_date: Optional[date] = None

class SalaryResponse(SalaryBase):
    id: int
    user_id: int
    updated_by: Optional[int] = None

    class Config:
        from_attributes = True

# Attendance Schemas
class AttendanceBase(BaseModel):
    date: date
    check_in_time: Optional[datetime] = None
    check_out_time: Optional[datetime] = None
    status: str

class AttendanceResponse(AttendanceBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

# Leave Schemas
class LeaveCreate(BaseModel):
    leave_type: str  # "paid", "sick", "unpaid"
    start_date: date
    end_date: date
    remarks: Optional[str] = None

class LeaveReview(BaseModel):
    status: str  # "approved", "rejected"
    reviewer_comments: Optional[str] = None

class LeaveResponse(BaseModel):
    id: int
    user_id: int
    employee_name: Optional[str] = None
    employee_id: Optional[str] = None
    leave_type: str
    start_date: date
    end_date: date
    remarks: Optional[str] = None
    status: str
    reviewed_by: Optional[int] = None
    reviewer_comments: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Document Schemas
class DocumentResponse(BaseModel):
    id: int
    user_id: int
    document_type: str
    file_url: str
    uploaded_at: datetime

    class Config:
        from_attributes = True

# Comprehensive User Response (Admin View)
class UserResponse(BaseModel):
    id: int
    employee_id: str
    name: str
    email: EmailStr
    role: str
    is_verified: bool
    created_at: datetime
    profile: Optional[ProfileBase] = None
    salary_structure: Optional[SalaryBase] = None

    class Config:
        from_attributes = True
