/**
 * AI Bug Triage System - API Client
 */

const API_BASE = '/api';

class ApiClient {
  constructor() {
    this.tokenKey = 'bug_triage_jwt_token';
    this.userKey = 'bug_triage_user_data';
  }

  getToken() {
    return localStorage.getItem(this.tokenKey);
  }

  setSession(token, user) {
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  clearSession() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }

  getCurrentUser() {
    const data = localStorage.getItem(this.userKey);
    try {
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = options.headers || {};

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(url, config);

      if (response.status === 401) {
        this.clearSession();
        window.dispatchEvent(new CustomEvent('auth-expired'));
        throw new Error('Session expired. Please log in again.');
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg = data.detail || `Request failed with status ${response.status}`;
        throw new Error(errorMsg);
      }

      return data;
    } catch (err) {
      console.error(`API Error on ${endpoint}:`, err);
      throw err;
    }
  }

  // Auth Endpoints
  async login(email, password, role_requested = null) {
    const payload = { email, password };
    if (role_requested) payload.role_requested = role_requested;
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    this.setSession(res.access_token, res.user);
    return res;
  }

  async register(email, full_name, password, role = 'developer', team_id = null) {
    const res = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, full_name, password, role, team_id })
    });
    this.setSession(res.access_token, res.user);
    return res;
  }

  async getMe() {
    return await this.request('/auth/me');
  }

  // Bug Endpoints
  async getBugs(params = {}) {
    const query = new URLSearchParams();
    if (params.status && params.status !== 'All') query.append('status', params.status);
    if (params.severity && params.severity !== 'All') query.append('severity', params.severity);
    if (params.team_id) query.append('team_id', params.team_id);
    if (params.search) query.append('search', params.search);
    if (params.assigned_to_me) query.append('assigned_to_me', 'true');
    if (params.assigned_to_my_team) query.append('assigned_to_my_team', 'true');
    
    const qs = query.toString() ? `?${query.toString()}` : '';
    return await this.request(`/bugs${qs}`);
  }

  async getBugById(id) {
    return await this.request(`/bugs/${id}`);
  }

  async createBug(bugData) {
    return await this.request('/bugs', {
      method: 'POST',
      body: JSON.stringify(bugData)
    });
  }

  async updateBugStatus(id, status, notes = '', resolution_notes = '') {
    return await this.request(`/bugs/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes, resolution_notes })
    });
  }

  async overrideSeverity(id, severity, reason) {
    return await this.request(`/bugs/${id}/severity`, {
      method: 'PUT',
      body: JSON.stringify({ severity, reason })
    });
  }

  async reassignBug(id, team_id, developer_id = null, reason = '') {
    return await this.request(`/bugs/${id}/reassign`, {
      method: 'PUT',
      body: JSON.stringify({ team_id, developer_id, reason })
    });
  }

  async addComment(id, message, is_technical = false) {
    return await this.request(`/bugs/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ message, is_technical })
    });
  }

  async uploadAttachment(id, file) {
    const formData = new FormData();
    formData.append('file', file);
    return await this.request(`/bugs/${id}/upload`, {
      method: 'POST',
      body: formData
    });
  }

  // AI Feedback & Re-analysis
  async recordAIFeedback(bugId, is_helpful, feedback_text = '') {
    return await this.request(`/ai/feedback/${bugId}`, {
      method: 'POST',
      body: JSON.stringify({ is_helpful, feedback_text })
    });
  }

  async reanalyzeBug(bugId) {
    return await this.request(`/ai/re-analyze/${bugId}`, {
      method: 'POST'
    });
  }

  // Teams & Users
  async getTeams() {
    return await this.request('/teams');
  }

  async createTeam(teamData) {
    return await this.request('/teams', {
      method: 'POST',
      body: JSON.stringify(teamData)
    });
  }

  async getUsers() {
    return await this.request('/users');
  }

  async updateUserRole(id, role, team_id = null) {
    return await this.request(`/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role, team_id })
    });
  }

  // Analytics & Stats
  async getOverviewStats() {
    return await this.request('/stats/overview');
  }

  async getChartsData() {
    return await this.request('/stats/charts');
  }

  // Notifications
  async getNotifications() {
    return await this.request('/notifications');
  }

  async markNotificationRead(id) {
    return await this.request(`/notifications/${id}/read`, {
      method: 'PUT'
    });
  }

  async markAllNotificationsRead() {
    return await this.request('/notifications/read-all', {
      method: 'PUT'
    });
  }

  // Audit Logs
  async getAuditLogs() {
    return await this.request('/audit-logs');
  }
}

window.api = new ApiClient();
