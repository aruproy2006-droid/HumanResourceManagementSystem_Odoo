class HRMSApi {
    constructor(baseUrl = '') {
        this.baseUrl = baseUrl;
    }

    _getToken() {
        return localStorage.getItem('hrms_token');
    }

    _getHeaders(isMultipart = false) {
        const headers = {};
        if (!isMultipart) {
            headers['Content-Type'] = 'application/json';
        }
        
        const token = this._getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    }

    async _request(endpoint, method = 'GET', body = null, isMultipart = false) {
        const url = `${this.baseUrl}${endpoint}`;
        const options = {
            method,
            headers: this._getHeaders(isMultipart)
        };

        if (body) {
            if (isMultipart) {
                options.body = body;
            } else {
                options.body = JSON.stringify(body);
            }
        }

        try {
            const response = await fetch(url, options);
            
            // Check if response is HTML (for email verification redirection endpoint)
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('text/html')) {
                return await response.text();
            }

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.detail || 'Something went wrong');
            }
            return data;
        } catch (error) {
            console.error(`API Error on ${method} ${endpoint}:`, error);
            throw error;
        }
    }

    // Auth Services
    async signup(employeeId, name, email, password, role) {
        return this._request('/api/auth/signup', 'POST', {
            employee_id: employeeId,
            name,
            email,
            password,
            role
        });
    }

    async login(email, password) {
        const response = await this._request('/api/auth/login', 'POST', { email, password });
        if (response.access_token) {
            localStorage.setItem('hrms_token', response.access_token);
            localStorage.setItem('hrms_user', JSON.stringify({
                name: response.name,
                email: response.email,
                role: response.role,
                employee_id: response.employee_id
            }));
        }
        return response;
    }

    logout() {
        localStorage.removeItem('hrms_token');
        localStorage.removeItem('hrms_user');
    }

    getCurrentUser() {
        try {
            return JSON.parse(localStorage.getItem('hrms_user'));
        } catch {
            return null;
        }
    }

    // Profile Services
    async getProfile() {
        return this._request('/api/users/me', 'GET');
    }

    async updateProfile(profileData) {
        return this._request('/api/users/me', 'PUT', profileData);
    }

    // Admin-Specific User Directory Services
    async getEmployees() {
        return this._request('/api/users', 'GET');
    }

    async updateEmployee(userId, userData) {
        return this._request(`/api/users/${userId}`, 'PUT', userData);
    }

    async updateEmployeeProfile(userId, profileData) {
        return this._request(`/api/users/${userId}/profile`, 'PUT', profileData);
    }

    // Attendance Services
    async checkIn() {
        return this._request('/api/attendance/checkin', 'POST');
    }

    async checkOut() {
        return this._request('/api/attendance/checkout', 'POST');
    }

    async getAttendanceHistory(userId = null) {
        const endpoint = userId ? `/api/attendance/history?user_id=${userId}` : '/api/attendance/history';
        return this._request(endpoint, 'GET');
    }

    // Leave Services
    async applyLeave(leaveData) {
        return this._request('/api/leave/request', 'POST', leaveData);
    }

    async getLeaveRequests() {
        return this._request('/api/leave/requests', 'GET');
    }

    async reviewLeave(leaveId, status, reviewerComments = '') {
        return this._request(`/api/leave/requests/${leaveId}/review`, 'PUT', {
            status,
            reviewer_comments: reviewerComments
        });
    }

    // Payroll Services
    async getMyPayroll() {
        return this._request('/api/payroll/me', 'GET');
    }

    async updatePayroll(userId, payrollData) {
        return this._request(`/api/payroll/${userId}`, 'PUT', payrollData);
    }
}

// Instantiate and expose globally
const api = new HRMSApi();
window.api = api;
