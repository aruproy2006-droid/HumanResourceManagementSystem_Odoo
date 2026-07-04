import datetime
from database import SessionLocal, engine, Base
import models
from auth import get_password_hash

def seed_db():
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    # Check if admin already exists
    admin_user = db.query(models.User).filter(models.User.email == "admin@hrms.com").first()
    if admin_user:
        print("Database already seeded.")
        db.close()
        return

    print("Seeding users...")

    # 1. Create Admin User (Priya)
    admin = models.User(
        employee_id="EMP001",
        name="Priya Sharma",
        email="admin@hrms.com",
        password_hash=get_password_hash("Admin@123"),
        role="admin",
        is_verified=True
    )
    db.add(admin)
    db.flush()  # gets admin.id

    admin_profile = models.Profile(
        user_id=admin.id,
        phone="+919876543210",
        address="Flat 402, Skyline Towers, Sector 62, Noida, UP",
        profile_picture_url="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
        job_title="HR Director",
        department="Human Resources",
        date_of_joining=datetime.date(2022, 5, 15)
    )
    admin_salary = models.SalaryStructure(
        user_id=admin.id,
        base_salary=120000.00,
        allowances=30000.00,
        deductions=10000.00,
        effective_date=datetime.date(2026, 1, 1),
        updated_by=admin.id
    )
    db.add(admin_profile)
    db.add(admin_salary)

    # 2. Create Standard Employee (Arjun)
    employee = models.User(
        employee_id="EMP002",
        name="Arjun Mehta",
        email="employee@hrms.com",
        password_hash=get_password_hash("Employee@123"),
        role="employee",
        is_verified=True
    )
    db.add(employee)
    db.flush()

    emp_profile = models.Profile(
        user_id=employee.id,
        phone="+919988776655",
        address="12B, Green Glen Layout, Bellandur, Bengaluru, KA",
        profile_picture_url="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
        job_title="Senior Software Engineer",
        department="Engineering",
        date_of_joining=datetime.date(2024, 2, 10)
    )
    emp_salary = models.SalaryStructure(
        user_id=employee.id,
        base_salary=95000.00,
        allowances=15000.00,
        deductions=5000.00,
        effective_date=datetime.date(2026, 1, 1),
        updated_by=admin.id
    )
    db.add(emp_profile)
    db.add(emp_salary)

    # 3. Create a New Hire (Meera) who is registered but not verified
    new_hire = models.User(
        employee_id="EMP003",
        name="Meera Nair",
        email="meera@hrms.com",
        password_hash=get_password_hash("Meera@123"),
        role="employee",
        is_verified=False
    )
    db.add(new_hire)
    db.flush()

    new_profile = models.Profile(
        user_id=new_hire.id,
        phone="+919898989898",
        address="Penthouse B, Maple Woods, Kochi, KL",
        profile_picture_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        job_title="Marketing Associate",
        department="Marketing",
        date_of_joining=datetime.date(2026, 7, 1)
    )
    new_salary = models.SalaryStructure(
        user_id=new_hire.id,
        base_salary=50000.00,
        allowances=8000.00,
        deductions=2000.00,
        effective_date=datetime.date(2026, 7, 1),
        updated_by=admin.id
    )
    db.add(new_profile)
    db.add(new_salary)

    # 4. Seed Attendance Records for Arjun (EMP002) for the last 5 weekdays
    today = datetime.date.today()
    for i in range(1, 6):
        date_offset = today - datetime.timedelta(days=i)
        # Check if weekday (0-4 are Monday-Friday)
        if date_offset.weekday() < 5:
            check_in = datetime.datetime.combine(date_offset, datetime.time(9, 15, 0))
            check_out = datetime.datetime.combine(date_offset, datetime.time(18, 5, 0))
            attn = models.Attendance(
                user_id=employee.id,
                date=date_offset,
                check_in_time=check_in,
                check_out_time=check_out,
                status="present"
            )
            db.add(attn)

    # 5. Seed Leave Requests for Arjun
    leave1 = models.LeaveRequest(
        user_id=employee.id,
        leave_type="sick",
        start_date=today - datetime.timedelta(days=12),
        end_date=today - datetime.timedelta(days=11),
        remarks="Caught a severe flu",
        status="approved",
        reviewed_by=admin.id,
        reviewer_comments="Get well soon!",
        created_at=datetime.datetime.utcnow() - datetime.timedelta(days=13)
    )
    # Also add the corresponding approved leave to attendance
    attn_leave1 = models.Attendance(
        user_id=employee.id,
        date=today - datetime.timedelta(days=12),
        status="leave"
    )
    attn_leave2 = models.Attendance(
        user_id=employee.id,
        date=today - datetime.timedelta(days=11),
        status="leave"
    )
    db.add(leave1)
    db.add(attn_leave1)
    db.add(attn_leave2)

    # A pending leave request
    leave2 = models.LeaveRequest(
        user_id=employee.id,
        leave_type="paid",
        start_date=today + datetime.timedelta(days=10),
        end_date=today + datetime.timedelta(days=14),
        remarks="Family vacation to Himachal",
        status="pending",
        created_at=datetime.datetime.utcnow()
    )
    db.add(leave2)

    db.commit()
    print("Database seeding completed successfully.")
    db.close()

if __name__ == "__main__":
    seed_db()
