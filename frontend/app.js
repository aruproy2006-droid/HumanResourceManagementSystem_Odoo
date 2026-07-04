// App State
const state = {
    user: null,
    activeRoute: '',
    clockInterval: null,
    employeeDirectory: [], // Admin only cached employee list
};

// Toast notification helper
function showToast(message, type = 'success') {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconClass = 'fa-circle-check';
    if (type === 'error') iconClass = 'fa-circle-xmark';
    if (type === 'warning') iconClass = 'fa-triangle-exclamation';
    if (type === 'info') iconClass = 'fa-circle-info';

    toast.innerHTML = `
        <i class="fa-solid ${iconClass}"></i>
        <div style="flex-grow:1;">${message}</div>
    `;

    container.appendChild(toast);

    // Auto remove after 4 seconds
    setTimeout(() => {
        toast.style.animation = 'fadeIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Check route authorization
function checkAuth() {
    state.user = window.api.getCurrentUser();
    const hash = window.location.hash || '#dashboard';
    
    if (!state.user && hash !== '#login' && hash !== '#signup') {
        window.location.hash = '#login';
        return false;
    }
    
    if (state.user && (hash === '#login' || hash === '#signup')) {
        window.location.hash = '#dashboard';
        return false;
    }

    // Role verification
    if (state.user && state.user.role !== 'admin' && hash === '#employees') {
        showToast('Access denied. Admin role required.', 'error');
        window.location.hash = '#dashboard';
        return false;
    }
    
    return true;
}

// Navigation / View Router
async function router() {
    clearInterval(state.clockInterval); // clear any active clocks
    
    if (!checkAuth()) return;

    const hash = window.location.hash || '#dashboard';
    state.activeRoute = hash;

    const appDiv = document.getElementById('app');

    // 1. Unauthenticated layout
    if (hash === '#login' || hash === '#signup') {
        appDiv.innerHTML = getAuthLayoutHtml(hash);
        initAuthListeners(hash);
        return;
    }

    // 2. Authenticated Shell layout (adds Sidebar + Top Nav if not already rendered)
    if (!document.querySelector('.dashboard-layout')) {
        appDiv.innerHTML = getDashboardShellHtml();
        initShellListeners();
    }

    // Update active nav link
    document.querySelectorAll('.sidebar-link').forEach(link => {
        if (link.getAttribute('href') === hash) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Load active view into the content-area
    const contentArea = document.querySelector('.content-area');
    contentArea.innerHTML = `
        <div class="loader-container" style="height: 50vh;">
            <div class="loader"></div>
            <p>Loading view data...</p>
        </div>
    `;

    try {
        switch (hash) {
            case '#dashboard':
                await renderDashboard(contentArea);
                break;
            case '#profile':
                await renderProfile(contentArea);
                break;
            case '#attendance':
                await renderAttendance(contentArea);
                break;
            case '#leaves':
                await renderLeaves(contentArea);
                break;
            case '#payroll':
                await renderPayroll(contentArea);
                break;
            case '#employees':
                await renderEmployees(contentArea);
                break;
            default:
                contentArea.innerHTML = `<h2>404 - Page Not Found</h2>`;
        }
    } catch (err) {
        showToast(err.message, 'error');
        contentArea.innerHTML = `
            <div class="glass-card text-center" style="padding:3rem;">
                <i class="fa-solid fa-circle-exclamation text-danger" style="font-size:3rem;margin-bottom:1rem;"></i>
                <h3>Failed to load page data</h3>
                <p style="color:var(--text-secondary);margin-top:0.5rem;">${err.message}</p>
                <button class="btn btn-primary" onclick="router()" style="margin-top:1.5rem;">Retry</button>
            </div>
        `;
    }
}

// ----------------- HTML TEMPLATES -----------------

function getAuthLayoutHtml(hash) {
    const isLogin = hash === '#login';
    return `
        <div class="auth-page">
            <div class="auth-container">
                <div class="auth-logo"><i class="fa-solid fa-clock-rotate-left"></i> AlignHR</div>
                <div class="auth-subtitle">Every workday, perfectly aligned.</div>
                
                <div class="glass-card auth-card">
                    <h3 style="font-size: 1.5rem; margin-bottom: 1.5rem; text-align: center;">
                        ${isLogin ? 'Sign In' : 'Create Account'}
                    </h3>
                    
                    <form id="auth-form">
                        ${!isLogin ? `
                            <div class="form-group">
                                <label for="signup-id">Employee ID</label>
                                <input type="text" id="signup-id" class="form-control" placeholder="e.g. EMP123" required>
                            </div>
                            <div class="form-group">
                                <label for="signup-name">Full Name</label>
                                <input type="text" id="signup-name" class="form-control" placeholder="John Doe" required>
                            </div>
                        ` : ''}
                        
                        <div class="form-group">
                            <label for="auth-email">Corporate Email</label>
                            <input type="email" id="auth-email" class="form-control" placeholder="you@company.com" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="auth-password">Password</label>
                            <input type="password" id="auth-password" class="form-control" placeholder="••••••••" required>
                        </div>

                        ${!isLogin ? `
                            <div class="form-group">
                                <label>Your Organization Role</label>
                                <div class="role-selector">
                                    <div class="role-btn active" data-role="employee">Employee</div>
                                    <div class="role-btn" data-role="admin">HR / Admin</div>
                                </div>
                            </div>
                        ` : ''}
                        
                        <button type="submit" class="btn btn-primary" style="width:100%; margin-top: 1rem;">
                            ${isLogin ? 'Sign In' : 'Sign Up'}
                        </button>
                    </form>
                </div>
                
                <div class="auth-footer">
                    ${isLogin ? `
                        New hire onboarding? <a href="#signup">Register here</a>
                    ` : `
                        Already registered? <a href="#login">Sign In</a>
                    `}
                </div>
            </div>
        </div>
    `;
}

function getDashboardShellHtml() {
    const isHR = state.user.role === 'admin';
    return `
        <div class="dashboard-layout">
            <aside class="sidebar">
                <div class="sidebar-brand">
                    <i class="fa-solid fa-clock-rotate-left"></i> AlignHR
                </div>
                <ul class="sidebar-menu">
                    <li>
                        <a href="#dashboard" class="sidebar-link active">
                            <i class="fa-solid fa-chart-pie"></i> Dashboard
                        </a>
                    </li>
                    ${isHR ? `
                        <li>
                            <a href="#employees" class="sidebar-link">
                                <i class="fa-solid fa-users"></i> Directory
                            </a>
                        </li>
                    ` : ''}
                    <li>
                        <a href="#attendance" class="sidebar-link">
                            <i class="fa-solid fa-business-time"></i> Attendance
                        </a>
                    </li>
                    <li>
                        <a href="#leaves" class="sidebar-link">
                            <i class="fa-solid fa-calendar-minus"></i> Leaves
                        </a>
                    </li>
                    <li>
                        <a href="#payroll" class="sidebar-link">
                            <i class="fa-solid fa-file-invoice-dollar"></i> Payroll
                        </a>
                    </li>
                    <li>
                        <a href="#profile" class="sidebar-link">
                            <i class="fa-solid fa-user-gear"></i> Profile
                        </a>
                    </li>
                </ul>
                
                <div class="sidebar-user">
                    <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80" alt="avatar" class="sidebar-avatar" id="shell-avatar">
                    <div class="sidebar-user-info">
                        <div class="sidebar-username">${state.user.name}</div>
                        <div class="sidebar-role">${state.user.role === 'admin' ? 'HR Manager' : 'Employee'}</div>
                    </div>
                    <button class="btn-logout" id="logout-button" title="Log Out">
                        <i class="fa-solid fa-right-from-bracket"></i>
                    </button>
                </div>
            </aside>
            
            <div class="main-wrapper">
                <header class="top-navbar">
                    <button class="sidebar-toggle" id="menu-toggle">
                        <i class="fa-solid fa-bars"></i>
                    </button>
                    <div class="page-title">
                        <h2 id="top-title">Dashboard</h2>
                    </div>
                    <div class="navbar-actions">
                        <div class="notifications-trigger">
                            <i class="fa-solid fa-bell"></i>
                            <div class="notification-dot" id="noti-dot" style="display:none;"></div>
                        </div>
                    </div>
                </header>
                <main class="content-area">
                    <!-- Views will load here -->
                </main>
            </div>
        </div>
    `;
}

// ----------------- CONTROLLERS & INTERACTION -----------------

function initAuthListeners(hash) {
    const isLogin = hash === '#login';
    
    // Setup role button toggles for Signup
    if (!isLogin) {
        let activeRole = 'employee';
        document.querySelectorAll('.role-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeRole = btn.dataset.role;
            });
        });

        // signup form submission
        document.getElementById('auth-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('signup-id').value;
            const name = document.getElementById('signup-name').value;
            const email = document.getElementById('auth-email').value;
            const pass = document.getElementById('auth-password').value;

            // Password strength check
            if (pass.length < 6) {
                showToast('Password must be at least 6 characters long', 'error');
                return;
            }

            try {
                await window.api.signup(id, name, email, pass, activeRole);
                showToast('Sign up successful! Please check console logs for the verification link.', 'warning');
                window.location.hash = '#login';
            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    } else {
        // login form submission
        document.getElementById('auth-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('auth-email').value;
            const pass = document.getElementById('auth-password').value;

            try {
                await window.api.login(email, pass);
                showToast('Signed in successfully!', 'success');
                window.location.hash = '#dashboard';
            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    }
}

function initShellListeners() {
    // Logout button
    document.getElementById('logout-button').addEventListener('click', () => {
        window.api.logout();
        showToast('Logged out successfully', 'success');
        window.location.hash = '#login';
    });

    // Mobile Hamburger Menu
    const toggle = document.getElementById('menu-toggle');
    if (toggle) {
        toggle.addEventListener('click', () => {
            document.querySelector('.sidebar').classList.toggle('open');
        });
    }

    // Close mobile menu on click link
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.addEventListener('click', () => {
            document.querySelector('.sidebar').classList.remove('open');
            document.getElementById('top-title').innerText = link.textContent.trim();
        });
    });

    // Retrieve and set actual avatar
    window.api.getProfile().then(userProfile => {
        if (userProfile.profile && userProfile.profile.profile_picture_url) {
            document.getElementById('shell-avatar').src = userProfile.profile.profile_picture_url;
        }
    }).catch(() => {});
}

// ----------------- RENDER VIEWS -----------------

// RENDER: DASHBOARD
async function renderDashboard(container) {
    const isHR = state.user.role === 'admin';
    
    if (isHR) {
        // HR Dashboard Render
        const employees = await window.api.getEmployees();
        const leaveRequests = await window.api.getLeaveRequests();
        const attendanceLogs = await window.api.getAttendanceHistory();
        
        const todayDateStr = new Date().toISOString().split('T')[0];
        const presentToday = attendanceLogs.filter(a => a.date === todayDateStr && (a.status === 'present' || a.status === 'half-day')).length;
        const pendingLeaves = leaveRequests.filter(r => r.status === 'pending').length;

        container.innerHTML = `
            <div class="dashboard-grid">
                <div class="glass-card summary-card">
                    <div class="summary-info">
                        <span class="summary-label">Total Employees</span>
                        <span class="summary-value">${employees.length}</span>
                    </div>
                    <div class="summary-icon icon-primary">
                        <i class="fa-solid fa-users"></i>
                    </div>
                </div>
                <div class="glass-card summary-card">
                    <div class="summary-info">
                        <span class="summary-label">Present Today</span>
                        <span class="summary-value">${presentToday}</span>
                    </div>
                    <div class="summary-icon icon-success">
                        <i class="fa-solid fa-user-check"></i>
                    </div>
                </div>
                <div class="glass-card summary-card">
                    <div class="summary-info">
                        <span class="summary-label">Pending Leaves</span>
                        <span class="summary-value">${pendingLeaves}</span>
                    </div>
                    <div class="summary-icon icon-warning">
                        <i class="fa-solid fa-envelope-open-text"></i>
                    </div>
                </div>
            </div>

            <div class="detail-grid">
                <div class="glass-card section-card">
                    <div class="section-header">
                        <h3>Pending Leave Requests</h3>
                        <a href="#leaves" class="btn btn-secondary" style="padding:0.4rem 0.8rem;font-size:0.8rem;">Review All</a>
                    </div>
                    <div class="table-responsive">
                        <table class="hrms-table">
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>Type</th>
                                    <th>Duration</th>
                                    <th>Remarks</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${leaveRequests.filter(r => r.status === 'pending').slice(0, 5).map(req => `
                                    <tr>
                                        <td>
                                            <div style="font-weight:600;">${req.employee_name}</div>
                                            <div style="font-size:0.75rem;color:var(--text-secondary);">${req.employee_id}</div>
                                        </td>
                                        <td><span class="badge badge-info">${req.leave_type}</span></td>
                                        <td>${req.start_date} to ${req.end_date}</td>
                                        <td><span style="font-size:0.85rem;color:var(--text-secondary);">${req.remarks || '-'}</span></td>
                                        <td>
                                            <button class="btn btn-success btn-approve-quick" data-id="${req.id}" style="padding:0.4rem 0.8rem;font-size:0.8rem;">Approve</button>
                                        </td>
                                    </tr>
                                `).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">No pending requests</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="glass-card section-card">
                    <div class="section-header">
                        <h3>Quick Links</h3>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:0.75rem;">
                        <a href="#employees" class="btn btn-secondary" style="justify-content:flex-start;width:100%;">
                            <i class="fa-solid fa-user-pen"></i> Manage Employee Files
                        </a>
                        <a href="#payroll" class="btn btn-secondary" style="justify-content:flex-start;width:100%;">
                            <i class="fa-solid fa-calculator"></i> Edit Salary Slips
                        </a>
                        <a href="#attendance" class="btn btn-secondary" style="justify-content:flex-start;width:100%;">
                            <i class="fa-solid fa-calendar-days"></i> Workforce Attendance logs
                        </a>
                    </div>
                </div>
            </div>
        `;

        // Listen for quick approve
        document.querySelectorAll('.btn-approve-quick').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                try {
                    await window.api.reviewLeave(id, 'approved', 'Quick Approved from Dashboard');
                    showToast('Leave request approved', 'success');
                    router();
                } catch (err) {
                    showToast(err.message, 'error');
                }
            });
        });

    } else {
        // Employee Dashboard Render
        const attendance = await window.api.getAttendanceHistory();
        const leaves = await window.api.getLeaveRequests();
        const profile = await window.api.getProfile();
        
        const todayDateStr = new Date().toISOString().split('T')[0];
        const todayRecord = attendance.find(a => a.date === todayDateStr);
        
        let checkInStr = '--:--';
        let checkOutStr = '--:--';
        let isCheckedIn = false;
        let isCheckedOut = false;

        if (todayRecord) {
            if (todayRecord.check_in_time) {
                checkInStr = new Date(todayRecord.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                isCheckedIn = true;
            }
            if (todayRecord.check_out_time) {
                checkOutStr = new Date(todayRecord.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                isCheckedOut = true;
            }
        }

        const approvedLeavesCount = leaves.filter(l => l.status === 'approved').length;
        const presentDaysCount = attendance.filter(a => a.status === 'present' || a.status === 'half-day').length;

        container.innerHTML = `
            <div class="dashboard-grid">
                <div class="glass-card summary-card">
                    <div class="summary-info">
                        <span class="summary-label">Days Present</span>
                        <span class="summary-value">${presentDaysCount}</span>
                    </div>
                    <div class="summary-icon icon-success">
                        <i class="fa-solid fa-calendar-check"></i>
                    </div>
                </div>
                <div class="glass-card summary-card">
                    <div class="summary-info">
                        <span class="summary-label">Approved Leaves</span>
                        <span class="summary-value">${approvedLeavesCount}</span>
                    </div>
                    <div class="summary-icon icon-info">
                        <i class="fa-solid fa-umbrella-beach"></i>
                    </div>
                </div>
                <div class="glass-card summary-card">
                    <div class="summary-info">
                        <span class="summary-label">Basic Takehome</span>
                        <span class="summary-value">₹${profile.salary_structure ? (profile.salary_structure.base_salary + profile.salary_structure.allowances - profile.salary_structure.deductions).toLocaleString() : '0'}</span>
                    </div>
                    <div class="summary-icon icon-primary">
                        <i class="fa-solid fa-wallet"></i>
                    </div>
                </div>
            </div>

            <div class="detail-grid">
                <div class="glass-card attendance-card">
                    <div class="attendance-status">ATTENDANCE CHECK-IN SERVICE</div>
                    <div class="clock-display" id="live-clock">00:00:00</div>
                    <div class="info-grid" style="width:100%;max-width:320px;margin: 1rem 0;">
                        <div>
                            <div style="font-size:0.75rem;color:var(--text-secondary);">Check In Time</div>
                            <div style="font-weight:600;font-size:1.1rem;color:var(--success);" id="checkin-lbl">${checkInStr}</div>
                        </div>
                        <div>
                            <div style="font-size:0.75rem;color:var(--text-secondary);">Check Out Time</div>
                            <div style="font-weight:600;font-size:1.1rem;color:var(--danger);" id="checkout-lbl">${checkOutStr}</div>
                        </div>
                    </div>
                    <div class="attendance-btn-container">
                        ${!isCheckedIn ? `
                            <button class="btn btn-primary btn-pulse" id="btn-checkin" style="width:100%;padding:1rem;">
                                <i class="fa-solid fa-right-to-bracket"></i> Register Check-In
                            </button>
                        ` : ''}
                        ${isCheckedIn && !isCheckedOut ? `
                            <button class="btn btn-danger" id="btn-checkout" style="width:100%;padding:1rem;">
                                <i class="fa-solid fa-right-from-bracket"></i> Register Check-Out
                            </button>
                        ` : ''}
                        ${isCheckedIn && isCheckedOut ? `
                            <div class="badge badge-success" style="padding:1rem;display:flex;justify-content:center;gap:0.5rem;font-size:0.95rem;width:100%;">
                                <i class="fa-solid fa-circle-check"></i> Shift Completed Successfully
                            </div>
                        ` : ''}
                    </div>
                </div>

                <div class="glass-card section-card">
                    <div class="section-header">
                        <h3>Pending Leave Tracks</h3>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:1rem;">
                        ${leaves.filter(l => l.status === 'pending').slice(0, 3).map(l => `
                            <div style="padding:0.75rem;border-radius:8px;border:1px solid var(--border-color);background:rgba(255,255,255,0.01);">
                                <div style="display:flex;justify-content:between;margin-bottom:0.25rem;">
                                    <span style="font-weight:600;text-transform:capitalize;">${l.leave_type} Leave</span>
                                    <span class="badge badge-warning">${l.status}</span>
                                </div>
                                <div style="font-size:0.8rem;color:var(--text-secondary);">${l.start_date} to ${l.end_date}</div>
                            </div>
                        `).join('') || '<p style="text-align:center;color:var(--text-muted);font-size:0.9rem;">No pending leave approvals.</p>'}
                    </div>
                </div>
            </div>
        `;

        // Start Live Clock
        function updateTime() {
            const clock = document.getElementById('live-clock');
            if (clock) {
                clock.innerText = new Date().toLocaleTimeString([], { hour12: false });
            }
        }
        updateTime();
        state.clockInterval = setInterval(updateTime, 1000);

        // Checkin action
        const btnIn = document.getElementById('btn-checkin');
        if (btnIn) {
            btnIn.addEventListener('click', async () => {
                try {
                    await window.api.checkIn();
                    showToast('Checked in successfully!', 'success');
                    router();
                } catch (err) {
                    showToast(err.message, 'error');
                }
            });
        }

        // Checkout action
        const btnOut = document.getElementById('btn-checkout');
        if (btnOut) {
            btnOut.addEventListener('click', async () => {
                try {
                    await window.api.checkOut();
                    showToast('Checked out successfully!', 'success');
                    router();
                } catch (err) {
                    showToast(err.message, 'error');
                }
            });
        }
    }
}

// RENDER: PROFILE
async function renderProfile(container) {
    const profile = await window.api.getProfile();
    
    container.innerHTML = `
        <div class="glass-card profile-layout">
            <div class="profile-sidebar">
                <img src="${profile.profile.profile_picture_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'}" class="profile-large-avatar" alt="profile image">
                <div>
                    <h3 class="profile-name">${profile.name}</h3>
                    <div class="profile-title">${profile.profile.job_title || 'Software Engineer'}</div>
                    <div class="profile-dept">${profile.profile.department || 'Engineering'}</div>
                </div>
            </div>

            <div class="profile-main-info">
                <div class="info-section">
                    <h4 class="info-section-title">Personal Profile Details</h4>
                    <form id="profile-edit-form">
                        <div class="info-grid">
                            <div class="form-group">
                                <label>Corporate Email</label>
                                <input type="text" class="form-control" value="${profile.email}" disabled>
                            </div>
                            <div class="form-group">
                                <label>Employee ID</label>
                                <input type="text" class="form-control" value="${profile.employee_id}" disabled>
                            </div>
                            <div class="form-group">
                                <label>Phone Contact</label>
                                <input type="text" id="prof-phone" class="form-control" value="${profile.profile.phone || ''}" placeholder="e.g. +91 98765 43210">
                            </div>
                            <div class="form-group">
                                <label>Registered Address</label>
                                <input type="text" id="prof-address" class="form-control" value="${profile.profile.address || ''}" placeholder="123 Street Name, City">
                            </div>
                        </div>
                        <button type="submit" class="btn btn-primary" style="margin-top:0.5rem;">Save General Details</button>
                    </form>
                </div>

                <div class="info-section">
                    <h4 class="info-section-title">Employment & Joining</h4>
                    <div class="info-grid">
                        <div class="info-item">
                            <label>Date of Joining</label>
                            <span>${profile.profile.date_of_joining || 'Not Available'}</span>
                        </div>
                        <div class="info-item">
                            <label>Designation Title</label>
                            <span>${profile.profile.job_title || 'Software Trainee'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('profile-edit-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const phone = document.getElementById('prof-phone').value;
        const address = document.getElementById('prof-address').value;

        try {
            await window.api.updateProfile({ phone, address });
            showToast('Profile updated successfully!', 'success');
            router();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });
}

// RENDER: ATTENDANCE
async function renderAttendance(container) {
    const isHR = state.user.role === 'admin';
    const history = await window.api.getAttendanceHistory();

    container.innerHTML = `
        <div class="glass-card section-card">
            <div class="section-header">
                <h3>${isHR ? 'Workforce Attendance Registry' : 'My Attendance History'}</h3>
            </div>
            
            <div class="table-responsive">
                <table class="hrms-table">
                    <thead>
                        <tr>
                            ${isHR ? '<th>Employee ID</th>' : ''}
                            <th>Date</th>
                            <th>Check-In</th>
                            <th>Check-Out</th>
                            <th>Work Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${history.map(record => {
                            const dateStr = new Date(record.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
                            const checkInTime = record.check_in_time ? new Date(record.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
                            const checkOutTime = record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
                            
                            let badgeClass = 'badge-success';
                            if (record.status === 'absent') badgeClass = 'badge-danger';
                            if (record.status === 'half-day') badgeClass = 'badge-warning';
                            if (record.status === 'leave') badgeClass = 'badge-info';

                            return `
                                <tr>
                                    ${isHR ? `<td>EMP${record.user_id}</td>` : ''}
                                    <td><strong>${dateStr}</strong></td>
                                    <td>${checkInTime}</td>
                                    <td>${checkOutTime}</td>
                                    <td><span class="badge ${badgeClass}">${record.status}</span></td>
                                </tr>
                            `;
                        }).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:2rem;">No attendance records found</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// RENDER: LEAVES
async function renderLeaves(container) {
    const isHR = state.user.role === 'admin';
    const requests = await window.api.getLeaveRequests();

    container.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:2rem;">
            ${!isHR ? `
                <div class="glass-card section-card">
                    <div class="section-header">
                        <h3>Apply for Leave</h3>
                    </div>
                    <form id="leave-apply-form">
                        <div class="info-grid">
                            <div class="form-group">
                                <label for="leave-type">Leave Category</label>
                                <select id="leave-type" class="form-control" required>
                                    <option value="paid">Paid Time Off (PTO)</option>
                                    <option value="sick">Sick Leave</option>
                                    <option value="unpaid">Unpaid Leave</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="leave-start">Start Date</label>
                                <input type="date" id="leave-start" class="form-control" required>
                            </div>
                            <div class="form-group">
                                <label for="leave-end">End Date</label>
                                <input type="date" id="leave-end" class="form-control" required>
                            </div>
                            <div class="form-group">
                                <label for="leave-remarks">Remarks/Reason</label>
                                <input type="text" id="leave-remarks" class="form-control" placeholder="Brief reason for time-off" required>
                            </div>
                        </div>
                        <button type="submit" class="btn btn-primary">Submit Time-Off Application</button>
                    </form>
                </div>
            ` : ''}

            <div class="glass-card section-card">
                <div class="section-header">
                    <h3>${isHR ? 'Manage Organization Leave Applications' : 'Time-Off Log history'}</h3>
                </div>
                
                <div class="table-responsive">
                    <table class="hrms-table">
                        <thead>
                            <tr>
                                ${isHR ? '<th>Employee</th>' : ''}
                                <th>Category</th>
                                <th>Period</th>
                                <th>Reason</th>
                                <th>Status</th>
                                ${isHR ? '<th>Review Comments</th>' : '<th>Review Comments</th>'}
                            </tr>
                        </thead>
                        <tbody>
                            ${requests.map(req => {
                                let badgeClass = 'badge-warning';
                                if (req.status === 'approved') badgeClass = 'badge-success';
                                if (req.status === 'rejected') badgeClass = 'badge-danger';

                                const canApprove = isHR && req.status === 'pending';

                                return `
                                    <tr>
                                        ${isHR ? `
                                            <td>
                                                <div style="font-weight:600;">${req.employee_name}</div>
                                                <div style="font-size:0.75rem;color:var(--text-secondary);">${req.employee_id}</div>
                                            </td>
                                        ` : ''}
                                        <td><span class="badge badge-info">${req.leave_type}</span></td>
                                        <td>${req.start_date} to ${req.end_date}</td>
                                        <td>${req.remarks || '-'}</td>
                                        <td><span class="badge ${badgeClass}">${req.status}</span></td>
                                        <td>
                                            ${canApprove ? `
                                                <div style="display:flex;gap:0.5rem;align-items:center;">
                                                    <input type="text" id="comm-${req.id}" class="form-control" placeholder="Comments" style="width:140px;padding:0.4rem;">
                                                    <button class="btn btn-success btn-approve" data-id="${req.id}" style="padding:0.4rem;font-size:0.8rem;"><i class="fa-solid fa-check"></i></button>
                                                    <button class="btn btn-danger btn-reject" data-id="${req.id}" style="padding:0.4rem;font-size:0.8rem;"><i class="fa-solid fa-xmark"></i></button>
                                                </div>
                                            ` : `
                                                <span style="font-size:0.85rem;color:var(--text-secondary);">${req.reviewer_comments || '-'}</span>
                                            `}
                                        </td>
                                    </tr>
                                `;
                            }).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:2rem;">No leave requests found</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    // Form Listener
    const leaveForm = document.getElementById('leave-apply-form');
    if (leaveForm) {
        leaveForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const type = document.getElementById('leave-type').value;
            const start = document.getElementById('leave-start').value;
            const end = document.getElementById('leave-end').value;
            const remarks = document.getElementById('leave-remarks').value;

            try {
                await window.api.applyLeave({
                    leave_type: type,
                    start_date: start,
                    end_date: end,
                    remarks: remarks
                });
                showToast('Leave request submitted successfully!', 'success');
                router();
            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    }

    // Approve/Reject Listeners (Admin Only)
    if (isHR) {
        document.querySelectorAll('.btn-approve').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                const comments = document.getElementById(`comm-${id}`).value;
                try {
                    await window.api.reviewLeave(id, 'approved', comments || 'Approved');
                    showToast('Leave request approved', 'success');
                    router();
                } catch (err) {
                    showToast(err.message, 'error');
                }
            });
        });

        document.querySelectorAll('.btn-reject').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                const comments = document.getElementById(`comm-${id}`).value;
                try {
                    await window.api.reviewLeave(id, 'rejected', comments || 'Rejected');
                    showToast('Leave request rejected', 'danger');
                    router();
                } catch (err) {
                    showToast(err.message, 'error');
                }
            });
        });
    }
}

// RENDER: PAYROLL
async function renderPayroll(container) {
    const isHR = state.user.role === 'admin';

    if (isHR) {
        // Admin Payroll Management
        const employees = await window.api.getEmployees();
        
        container.innerHTML = `
            <div class="glass-card section-card">
                <div class="section-header">
                    <h3>Employee Salary Configuration</h3>
                </div>
                
                <div class="table-responsive">
                    <table class="hrms-table">
                        <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Department</th>
                                <th>Designation</th>
                                <th>Base Salary</th>
                                <th>Allowances</th>
                                <th>Deductions</th>
                                <th>Net Pay</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${employees.map(emp => {
                                const sal = emp.salary_structure || { base_salary: 0, allowances: 0, deductions: 0 };
                                const netPay = sal.base_salary + sal.allowances - sal.deductions;
                                return `
                                    <tr>
                                        <td>
                                            <div style="font-weight:600;">${emp.name}</div>
                                            <div style="font-size:0.75rem;color:var(--text-secondary);">${emp.employee_id}</div>
                                        </td>
                                        <td>${emp.profile.department || '-'}</td>
                                        <td>${emp.profile.job_title || '-'}</td>
                                        <td>₹${sal.base_salary.toLocaleString()}</td>
                                        <td>₹${sal.allowances.toLocaleString()}</td>
                                        <td>₹${sal.deductions.toLocaleString()}</td>
                                        <td><strong>₹${netPay.toLocaleString()}</strong></td>
                                        <td>
                                            <button class="btn btn-primary btn-edit-sal" data-id="${emp.id}" data-name="${emp.name}" data-base="${sal.base_salary}" data-allow="${sal.allowances}" data-deduct="${sal.deductions}" style="padding:0.4rem 0.8rem;font-size:0.8rem;">
                                                Configure
                                            </button>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- Salary Edit Modal Holder -->
            <div id="modal-container"></div>
        `;

        // Attach modal listeners
        document.querySelectorAll('.btn-edit-sal').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const name = btn.dataset.name;
                const base = btn.dataset.base;
                const allow = btn.dataset.allow;
                const deduct = btn.dataset.deduct;

                showSalaryModal(id, name, base, allow, deduct);
            });
        });

    } else {
        // Read-only Employee Payroll
        const payroll = await window.api.getMyPayroll();
        const base = payroll.base_salary;
        const allowances = payroll.allowances;
        const deductions = payroll.deductions;
        const total = base + allowances - deductions;

        container.innerHTML = `
            <div class="glass-card section-card" style="max-width:600px;margin: 0 auto;">
                <div class="section-header" style="border-bottom:1px solid var(--border-color);padding-bottom:1rem;">
                    <div>
                        <h3>My Current Pay Slip Details</h3>
                        <p style="font-size:0.85rem;color:var(--text-secondary);margin-top:0.25rem;">Effective Date: ${payroll.effective_date}</p>
                    </div>
                    <i class="fa-solid fa-receipt" style="font-size:2rem;color:var(--secondary);"></i>
                </div>
                
                <div style="display:flex;flex-direction:column;gap:1rem;margin: 1.5rem 0;">
                    <div style="display:flex;justify-content:space-between;">
                        <span>Base Earnings (Salary)</span>
                        <strong>₹${base.toLocaleString()}</strong>
                    </div>
                    <div style="display:flex;justify-content:space-between;color:var(--success);">
                        <span>Allowances (HRA, Travel, Special)</span>
                        <strong>+ ₹${allowances.toLocaleString()}</strong>
                    </div>
                    <div style="display:flex;justify-content:space-between;color:var(--danger);">
                        <span>Deductions (Taxes, Provident Fund)</span>
                        <strong>- ₹${deductions.toLocaleString()}</strong>
                    </div>
                    <div style="display:flex;justify-content:space-between;border-top:1px dashed var(--border-color);padding-top:1rem;font-size:1.2rem;">
                        <span>Estimated Take-home Net Pay</span>
                        <strong style="color:var(--secondary);">₹${total.toLocaleString()}</strong>
                    </div>
                </div>
                
                <div class="badge badge-success" style="justify-content:center;padding:0.75rem;font-size:0.85rem;">
                    <i class="fa-solid fa-circle-check" style="margin-right:0.5rem;"></i> Confirmed and Audited by Human Resources
                </div>
            </div>
        `;
    }
}

function showSalaryModal(userId, name, base, allow, deduct) {
    const modalHolder = document.getElementById('modal-container');
    modalHolder.innerHTML = `
        <div class="modal-overlay">
            <div class="glass-card modal-content">
                <div class="modal-header">
                    <h3>Configure Salary: ${name}</h3>
                    <button class="modal-close" id="modal-close-btn">&times;</button>
                </div>
                <form id="modal-sal-form">
                    <div class="form-group">
                        <label for="mod-base">Base Salary (₹)</label>
                        <input type="number" id="mod-base" class="form-control" value="${base}" required>
                    </div>
                    <div class="form-group">
                        <label for="mod-allow">Allowances (₹)</label>
                        <input type="number" id="mod-allow" class="form-control" value="${allow}" required>
                    </div>
                    <div class="form-group">
                        <label for="mod-deduct">Deductions (₹)</label>
                        <input type="number" id="mod-deduct" class="form-control" value="${deduct}" required>
                    </div>
                    
                    <button type="submit" class="btn btn-primary" style="width:100%;margin-top:1rem;">Save Salary Structure</button>
                </form>
            </div>
        </div>
    `;

    // Close button
    document.getElementById('modal-close-btn').addEventListener('click', () => {
        modalHolder.innerHTML = '';
    });

    // Form submit
    document.getElementById('modal-sal-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newBase = parseFloat(document.getElementById('mod-base').value);
        const newAllow = parseFloat(document.getElementById('mod-allow').value);
        const newDeduct = parseFloat(document.getElementById('mod-deduct').value);

        try {
            await window.api.updatePayroll(userId, {
                base_salary: newBase,
                allowances: newAllow,
                deductions: newDeduct
            });
            showToast('Salary structure updated successfully!', 'success');
            modalHolder.innerHTML = '';
            router();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });
}

// RENDER: DIRECTORY (ADMIN ONLY)
async function renderEmployees(container) {
    const employees = await window.api.getEmployees();

    container.innerHTML = `
        <div class="glass-card section-card">
            <div class="section-header">
                <h3>Employee Directory</h3>
                <button class="btn btn-primary btn-add-emp" style="padding:0.4rem 0.8rem;font-size:0.8rem;">
                    <i class="fa-solid fa-plus"></i> Add Employee
                </button>
            </div>
            
            <div class="employee-list">
                ${employees.map(emp => `
                    <div class="employee-item">
                        <div class="employee-info-main">
                            <img src="${emp.profile.profile_picture_url || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'}" class="employee-list-avatar" alt="avatar">
                            <div class="employee-details-block">
                                <h4>${emp.name}</h4>
                                <p>${emp.profile.job_title || 'Software Trainee'} • ${emp.profile.department || 'Engineering'}</p>
                                <p style="font-size:0.75rem;color:var(--text-muted);">${emp.email} | ID: ${emp.employee_id} | Role: ${emp.role}</p>
                            </div>
                        </div>
                        <div style="display:flex;gap:0.5rem;">
                            <button class="btn btn-secondary btn-edit-emp" data-id="${emp.id}" data-name="${emp.name}" data-email="${emp.email}" data-empid="${emp.employee_id}" data-role="${emp.role}" data-title="${emp.profile.job_title || ''}" data-dept="${emp.profile.department || ''}" style="padding:0.4rem 0.8rem;font-size:0.8rem;">
                                Edit Details
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>

        <div id="modal-container-dir"></div>
    `;

    // Listen edit details button
    document.querySelectorAll('.btn-edit-emp').forEach(btn => {
        btn.addEventListener('click', () => {
            const data = btn.dataset;
            showEditEmployeeModal(data.id, data.name, data.email, data.empid, data.role, data.title, data.dept);
        });
    });

    // Listen add employee button
    const btnAdd = document.querySelector('.btn-add-emp');
    if (btnAdd) {
        btnAdd.addEventListener('click', () => {
            showAddEmployeeModal();
        });
    }
}

function showEditEmployeeModal(userId, name, email, employeeId, role, title, department) {
    const modalHolder = document.getElementById('modal-container-dir');
    modalHolder.innerHTML = `
        <div class="modal-overlay">
            <div class="glass-card modal-content" style="max-width:550px;">
                <div class="modal-header">
                    <h3>Edit Employee: ${name}</h3>
                    <button class="modal-close" id="modal-close-dir-btn">&times;</button>
                </div>
                <form id="modal-edit-emp-form">
                    <div class="info-grid">
                        <div class="form-group">
                            <label for="ed-name">Full Name</label>
                            <input type="text" id="ed-name" class="form-control" value="${name}" required>
                        </div>
                        <div class="form-group">
                            <label for="ed-email">Email Address</label>
                            <input type="email" id="ed-email" class="form-control" value="${email}" required>
                        </div>
                        <div class="form-group">
                            <label for="ed-empid">Employee ID</label>
                            <input type="text" id="ed-empid" class="form-control" value="${employeeId}" required>
                        </div>
                        <div class="form-group">
                            <label for="ed-role">Access Role</label>
                            <select id="ed-role" class="form-control" required>
                                <option value="employee" ${role === 'employee' ? 'selected' : ''}>Employee</option>
                                <option value="admin" ${role === 'admin' ? 'selected' : ''}>HR Admin</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="ed-title">Job Title</label>
                            <input type="text" id="ed-title" class="form-control" value="${title}" required>
                        </div>
                        <div class="form-group">
                            <label for="ed-dept">Department</label>
                            <input type="text" id="ed-dept" class="form-control" value="${department}" required>
                        </div>
                    </div>
                    
                    <button type="submit" class="btn btn-primary" style="width:100%;margin-top:1rem;">Save Changes</button>
                </form>
            </div>
        </div>
    `;

    document.getElementById('modal-close-dir-btn').addEventListener('click', () => {
        modalHolder.innerHTML = '';
    });

    document.getElementById('modal-edit-emp-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newName = document.getElementById('ed-name').value;
        const newEmail = document.getElementById('ed-email').value;
        const newEmpId = document.getElementById('ed-empid').value;
        const newRole = document.getElementById('ed-role').value;
        const newTitle = document.getElementById('ed-title').value;
        const newDept = document.getElementById('ed-dept').value;

        try {
            // Save user details
            await window.api.updateEmployee(userId, {
                employee_id: newEmpId,
                name: newName,
                email: newEmail,
                password: '', // leave empty, password unchanged
                role: newRole
            });
            // Save profile details
            await window.api.updateEmployeeProfile(userId, {
                job_title: newTitle,
                department: newDept
            });

            showToast('Employee file updated successfully!', 'success');
            modalHolder.innerHTML = '';
            router();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });
}

function showAddEmployeeModal() {
    const modalHolder = document.getElementById('modal-container-dir');
    modalHolder.innerHTML = `
        <div class="modal-overlay">
            <div class="glass-card modal-content" style="max-width:550px;">
                <div class="modal-header">
                    <h3>Add New Employee</h3>
                    <button class="modal-close" id="modal-close-dir-btn">&times;</button>
                </div>
                <form id="modal-add-emp-form">
                    <div class="info-grid">
                        <div class="form-group">
                            <label for="add-name">Full Name</label>
                            <input type="text" id="add-name" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label for="add-email">Email Address</label>
                            <input type="email" id="add-email" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label for="add-empid">Employee ID</label>
                            <input type="text" id="add-empid" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label for="add-role">Access Role</label>
                            <select id="add-role" class="form-control" required>
                                <option value="employee" selected>Employee</option>
                                <option value="admin">HR Admin</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="add-pass">Initial Password</label>
                            <input type="password" id="add-pass" class="form-control" value="Welcome@123" required>
                        </div>
                    </div>
                    
                    <button type="submit" class="btn btn-primary" style="width:100%;margin-top:1rem;">Add Employee Account</button>
                </form>
            </div>
        </div>
    `;

    document.getElementById('modal-close-dir-btn').addEventListener('click', () => {
        modalHolder.innerHTML = '';
    });

    document.getElementById('modal-add-emp-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('add-name').value;
        const email = document.getElementById('add-email').value;
        const empId = document.getElementById('add-empid').value;
        const role = document.getElementById('add-role').value;
        const pass = document.getElementById('add-pass').value;

        try {
            await window.api.signup(empId, name, email, pass, role);
            showToast('Employee account created! (Verification email logged in terminal)', 'warning');
            modalHolder.innerHTML = '';
            router();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });
}

// ----------------- ROOT APP BOOTSTRAP -----------------

// Listen to window hash change
window.addEventListener('hashchange', router);

// Boot app on window load
window.addEventListener('DOMContentLoaded', () => {
    // If the hash is blank, redirect to dashboard or login
    if (!window.location.hash) {
        window.location.hash = '#dashboard';
    }
    router();
});
