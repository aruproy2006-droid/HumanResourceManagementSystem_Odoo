# 👨‍💼 Human Resource Management System (HRMS)

A modern **Human Resource Management System (HRMS)** built during a hackathon to simplify employee management through automation. The application provides a centralized platform for HR administrators and employees to manage attendance, leave requests, employee records, and payroll efficiently.

---

## 🚀 Features

### 👤 Employee Management

* Add, update, and remove employee records
* Manage employee profiles
* Department and designation management

### 🔐 Authentication

* Secure login system
* Role-based access (Admin & Employee)
* Password hashing and authentication

### 📅 Attendance Management

* Daily check-in/check-out
* Attendance history
* Working hours tracking

### 📝 Leave Management

* Apply for leave
* Approve or reject leave requests
* Leave status tracking

### 💰 Payroll Management

* Salary information
* Bonus and deduction calculation
* Payroll records

### 📊 Dashboard

* Total employees
* Attendance overview
* Pending leave requests
* Employee statistics

### 🗄️ Database

* SQLite database
* Organized relational data
* Easy setup for development

---

# 🏗️ Project Structure

```text
HRMS/
│
├── backend/
│   ├── auth.py
│   ├── database.py
│   ├── hrms.db
│   ├── main.py
│   ├── models.py
│   ├── requirements.txt
│   ├── schemas.py
│   └── seed.py
│
└── frontend/
    ├── index.html
    ├── style.css
    ├── api.js
    └── app.js
```

---

# 🛠️ Tech Stack

## Frontend

* HTML5
* CSS3
* JavaScript (ES6)

## Backend

* Python
* FastAPI

## Database

* SQLite
* SQLAlchemy ORM

## Authentication

* JWT Authentication
* Password Hashing

---

# 📂 File Overview

## Backend

| File               | Description                        |
| ------------------ | ---------------------------------- |
| `main.py`          | FastAPI application and API routes |
| `auth.py`          | Authentication and authorization   |
| `database.py`      | Database connection                |
| `models.py`        | Database models                    |
| `schemas.py`       | Request and response schemas       |
| `seed.py`          | Initial database seeding           |
| `requirements.txt` | Python dependencies                |
| `hrms.db`          | SQLite database                    |

## Frontend

| File         | Description                |
| ------------ | -------------------------- |
| `index.html` | Main application interface |
| `style.css`  | UI styling                 |
| `api.js`     | API communication          |
| `app.js`     | Frontend application logic |

---

# ⚙️ Installation

## 1. Clone the Repository

```bash
git clone https://github.com/your-username/hrms.git
cd hrms
```

---

## 2. Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

---

## 3. Seed the Database

```bash
python seed.py
```

---

## 4. Start the Backend Server

```bash
uvicorn main:app --reload
```

Backend runs on:

```
http://127.0.0.1:8000
```

---

## 5. Launch the Frontend

Open `frontend/index.html` in your browser, or run a local web server:

```bash
cd frontend
python -m http.server 5500
```

Open:

```
http://127.0.0.1:5500
```

---

# 🔄 System Workflow

```
Employee/Admin Login
        │
        ▼
Authentication
        │
        ▼
Dashboard
        │
 ┌──────┼─────────┐
 │      │         │
 ▼      ▼         ▼
Attendance Leave Employee
Management  Requests  Records
        │
        ▼
Database
        │
        ▼
Reports & Dashboard
```

---

# 🎯 Future Enhancements

* Face Recognition Attendance
* QR Code Attendance
* AI Resume Screening
* Email Notifications
* Performance Analytics
* Multi-Company Support
* Mobile Responsive UI
* PDF Report Generation
* Excel Export
* Dark Mode

---

# 👥 Team

Developed during a Hackathon by:

* Arup Roy
* Abhay Roy
* Rounak Paul
* Mainak Ghosh

---

# 📄 License

This project was created for educational and hackathon purposes.

---

## ⭐ If you found this project useful, consider giving it a star!
