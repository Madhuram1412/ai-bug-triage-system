/**
 * AI Bug Triage System - Main SPA Controller
 */

class BugTriageApp {
  constructor() {
    this.currentUser = null;
    this.currentView = 'overview';
    this.allBugs = [];
    this.allTeams = [];
    this.allUsers = [];
    this.selectedBug = null;
    this.uploadedFiles = [];
    this.monacoNewBugEditor = null;
    this.monacoDiffEditor = null;
    this.diffSideBySide = true;

    this.init();
  }

  async init() {
    this.initTheme();
    this.bindEvents();
    await this.checkAuth();
  }

  // ==========================================
  // THEME MANAGEMENT (Dark / Light Mode)
  // ==========================================
  initTheme() {
    const saved = localStorage.getItem('bug_triage_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    this.updateThemeIcon(saved);
  }

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('bug_triage_theme', next);
    this.updateThemeIcon(next);

    // Update charts & Monaco editor themes
    if (window.MonacoHelper) window.MonacoHelper.updateAllThemes();
    if (this.currentView === 'overview') this.loadAnalyticsCharts();
  }

  updateThemeIcon(theme) {
    const btn = document.getElementById('themeToggleBtn');
    if (!btn) return;
    if (theme === 'light') {
      btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
      btn.title = "Switch to Dark Mode";
    } else {
      btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
      btn.title = "Switch to Light Mode";
    }
  }

  // ==========================================
  // TOAST NOTIFICATIONS
  // ==========================================
  showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';

    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-text">${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // ==========================================
  // AUTHENTICATION & SESSIONS
  // ==========================================
  async checkAuth() {
    const token = window.api.getToken();
    if (!token) {
      this.renderAuthPage();
      return;
    }

    try {
      const user = await window.api.getMe();
      this.currentUser = user;
      this.renderDashboardLayout();
    } catch (e) {
      window.api.clearSession();
      this.renderAuthPage();
    }
  }

  renderAuthPage() {
    document.getElementById('authContainer').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';
  }

  renderDashboardLayout() {
    document.getElementById('authContainer').style.display = 'none';
    document.getElementById('appContainer').style.display = 'flex';

    // Populate user topbar info
    document.getElementById('topbarUserName').textContent = this.currentUser.full_name;
    document.getElementById('topbarUserRole').textContent = this.currentUser.role;
    document.getElementById('topbarAvatar').textContent = this.currentUser.full_name.charAt(0).toUpperCase();

    // Populate dropdown info if present
    const ddName = document.getElementById('dropdownUserFullName');
    const ddEmail = document.getElementById('dropdownUserEmail');
    if (ddName) ddName.textContent = this.currentUser.full_name;
    if (ddEmail) ddEmail.textContent = this.currentUser.email;

    // Configure sidebar items visibility based on role
    this.configureRoleSidebar();

    // Load initial views
    this.switchView('overview');
    this.loadNotifications();
  }

  configureRoleSidebar() {
    const role = this.currentUser.role;
    const adminNavs = document.querySelectorAll('.nav-admin-only');
    const devNavs = document.querySelectorAll('.nav-dev-only');

    if (role === 'admin') {
      adminNavs.forEach(el => el.style.display = 'flex');
      devNavs.forEach(el => el.style.display = 'flex');
    } else if (role === 'developer') {
      adminNavs.forEach(el => el.style.display = 'none');
      devNavs.forEach(el => el.style.display = 'flex');
    } else {
      // Reporter
      adminNavs.forEach(el => el.style.display = 'none');
      devNavs.forEach(el => el.style.display = 'none');
    }
  }

  async logout() {
    window.api.clearSession();
    this.currentUser = null;
    this.selectedBug = null;
    this.allBugs = [];

    // Close any open modals and dropdown drawers
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
    document.getElementById('notificationsDrawer')?.classList.remove('active');
    document.getElementById('userDropdownMenu')?.classList.remove('active');

    // Reset view state
    this.currentView = 'overview';

    this.showToast('You have been logged out.', 'info');
    this.renderAuthPage();
  }

  toggleUserMenu() {
    const menu = document.getElementById('userDropdownMenu');
    if (menu) menu.classList.toggle('active');
  }

  // ==========================================
  // NAVIGATION & VIEW SWITCHING
  // ==========================================
  switchView(viewName) {
    this.currentView = viewName;

    // Update active state in sidebar
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.view === viewName);
    });

    // Update breadcrumb
    const crumb = document.getElementById('breadcrumbCurrent');
    if (crumb) {
      const titles = {
        overview: 'Overview Dashboard',
        bugs: 'Bug Triage Repository',
        teams: 'Engineering Teams',
        users: 'Users & Permissions',
        analytics: 'Analytics & Model Metrics',
        logs: 'Audit & Activity Trail',
        settings: 'System Configuration'
      };
      crumb.textContent = titles[viewName] || 'Dashboard';
    }

    // Hide all view panels
    document.querySelectorAll('.view-panel').forEach(panel => panel.style.display = 'none');

    // Show target view panel
    const target = document.getElementById(`view-${viewName}`);
    if (target) target.style.display = 'block';

    // Fetch and render data for view
    if (viewName === 'overview') {
      this.loadOverviewDashboard();
    } else if (viewName === 'bugs') {
      this.loadBugsView();
    } else if (viewName === 'teams') {
      this.loadTeamsView();
    } else if (viewName === 'users') {
      this.loadUsersView();
    } else if (viewName === 'analytics') {
      this.loadAnalyticsCharts();
    } else if (viewName === 'logs') {
      this.loadLogsView();
    } else if (viewName === 'settings') {
      this.loadSettingsView();
    }
  }

  // ==========================================
  // OVERVIEW DASHBOARD
  // ==========================================
  async loadOverviewDashboard() {
    try {
      const stats = await window.api.getOverviewStats();
      
      document.getElementById('statTotalBugs').textContent = stats.total_bugs;
      document.getElementById('statOpenBugs').textContent = stats.open_bugs;
      document.getElementById('statCriticalBugs').textContent = stats.critical_bugs;
      document.getElementById('statResolvedBugs').textContent = stats.resolved_bugs;
      document.getElementById('statAvgResolution').textContent = `${stats.avg_resolution_time_hours} hrs`;
      document.getElementById('statAiAccuracy').textContent = `${stats.ai_accuracy_percent}%`;

      // Load charts
      await this.loadAnalyticsCharts();

      // Load recent bugs table
      this.loadBugsTable('recentBugsTableBody', { limit: 5 });
    } catch (e) {
      this.showToast('Failed to load overview metrics: ' + e.message, 'error');
    }
  }

  async loadAnalyticsCharts() {
    try {
      const chartsData = await window.api.getChartsData();
      if (!window.ChartsHelper) return;

      window.ChartsHelper.renderSeverityChart('chartSeverity', chartsData.severity_distribution);
      window.ChartsHelper.renderStatusChart('chartStatus', chartsData.status_distribution);
      window.ChartsHelper.renderTimelineChart('chartTimeline', chartsData.bugs_over_time);
      window.ChartsHelper.renderTeamsChart('chartTeams', chartsData.bugs_by_team);
      window.ChartsHelper.renderAccuracyChart('chartAccuracy', chartsData.ai_accuracy_metrics);
    } catch (e) {
      console.warn('Charts render failed:', e);
    }
  }

  // ==========================================
  // BUGS REPOSITORY & FILTERING
  // ==========================================
  async loadBugsView() {
    await this.loadBugsTable('allBugsTableBody');
    this.populateTeamFilters();
  }

  async populateTeamFilters() {
    try {
      if (this.allTeams.length === 0) {
        this.allTeams = await window.api.getTeams();
      }
      const select = document.getElementById('filterTeamSelect');
      if (select) {
        select.innerHTML = '<option value="">All Teams</option>' +
          this.allTeams.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
      }
    } catch (e) {
      console.warn(e);
    }
  }

  async loadBugsTable(tableBodyId, options = {}) {
    const tbody = document.getElementById(tableBodyId);
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 30px; color: var(--text-muted);">
      <div class="loading-spinner"></div> Loading bugs...</td></tr>`;

    try {
      const params = {};
      const statusFilter = document.getElementById('filterStatusSelect');
      const severityFilter = document.getElementById('filterSeveritySelect');
      const teamFilter = document.getElementById('filterTeamSelect');
      const searchInput = document.getElementById('tableSearchInput');

      if (statusFilter && statusFilter.value) params.status = statusFilter.value;
      if (severityFilter && severityFilter.value) params.severity = severityFilter.value;
      if (teamFilter && teamFilter.value) params.team_id = teamFilter.value;
      if (searchInput && searchInput.value) params.search = searchInput.value;

      // Role specific scoping
      if (this.currentUser.role === 'developer' && options.assigned_to_me) {
        params.assigned_to_me = true;
      }

      this.allBugs = await window.api.getBugs(params);
      const displayBugs = options.limit ? this.allBugs.slice(0, options.limit) : this.allBugs;

      if (displayBugs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 40px; color: var(--text-muted);">No bugs found matching current criteria.</td></tr>`;
        return;
      }

      tbody.innerHTML = displayBugs.map(b => `
        <tr>
          <td><span class="bug-code-pill">${b.bug_code}</span></td>
          <td>
            <a class="bug-title-link" onclick="app.openBugDetailModal(${b.id})">${this.escapeHtml(b.title)}</a>
            <span style="font-size: 11.5px; color: var(--text-muted);">${b.language || 'Code'} ${b.framework ? '• ' + b.framework : ''}</span>
          </td>
          <td><span class="severity-badge ${b.severity}">${b.severity}</span></td>
          <td><span class="status-badge ${b.status.replace(/\s+/g, '')}">${b.status}</span></td>
          <td>
            <span class="team-pill">
              <span class="team-dot" style="background-color: ${b.assigned_team_color};"></span>
              ${this.escapeHtml(b.assigned_team_name)}
            </span>
          </td>
          <td style="color: var(--text-secondary);">${this.escapeHtml(b.reporter_name || 'Reporter')}</td>
          <td style="color: var(--text-muted); font-size: 12px;">${new Date(b.created_at).toLocaleDateString()}</td>
          <td>
            <button class="action-btn-sm" onclick="app.openBugDetailModal(${b.id})">Triage View</button>
          </td>
        </tr>
      `).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color: var(--p0-critical);">Failed to load bugs: ${e.message}</td></tr>`;
    }
  }

  // ==========================================
  // BUG SUBMISSION FLOW & MONACO EDITOR
  // ==========================================
  async openReportBugModal() {
    const modal = document.getElementById('reportBugModal');
    if (!modal) return;
    modal.classList.add('active');

    // Initialize Monaco code editor in modal
    setTimeout(async () => {
      if (window.MonacoHelper) {
        this.monacoNewBugEditor = await window.MonacoHelper.createCodeEditor(
          'newBugMonacoContainer',
          '# Paste or write your problematic code snippet here\ndef process_transaction(user_id, amount):\n    # TODO: Implement\n    pass\n',
          'python'
        );
      }
    }, 150);

    this.uploadedFiles = [];
    this.renderUploadedFilesList();
  }

  closeReportBugModal() {
    const modal = document.getElementById('reportBugModal');
    if (modal) modal.classList.remove('active');
    if (window.MonacoHelper) window.MonacoHelper.disposeEditor('newBugMonacoContainer');
  }

  renderUploadedFilesList() {
    const container = document.getElementById('uploadedFilesList');
    if (!container) return;
    if (this.uploadedFiles.length === 0) {
      container.innerHTML = '';
      return;
    }
    container.innerHTML = this.uploadedFiles.map((f, idx) => `
      <div class="file-chip" style="display:inline-flex; align-items:center; gap:6px; background:var(--bg-card); padding:4px 8px; border-radius:6px; font-size:12px; margin:4px;">
        <span>📄 ${f.name} (${(f.size / 1024).toFixed(1)} KB)</span>
        <button type="button" onclick="app.removeUploadedFile(${idx})" style="background:none; border:none; color:var(--text-muted); cursor:pointer;">&times;</button>
      </div>
    `).join('');
  }

  removeUploadedFile(index) {
    this.uploadedFiles.splice(index, 1);
    this.renderUploadedFilesList();
  }

  async submitNewBug(e) {
    e.preventDefault();

    const title = document.getElementById('bugTitleInput').value.trim();
    const description = document.getElementById('bugDescInput').value.trim();
    const language = document.getElementById('bugLangSelect').value;
    const framework = document.getElementById('bugFrameworkInput').value.trim();
    const steps = document.getElementById('bugStepsInput').value.trim();
    const expected = document.getElementById('bugExpectedInput').value.trim();
    const actual = document.getElementById('bugActualInput').value.trim();
    const errorTrace = document.getElementById('bugErrorTraceInput').value.trim();
    const envInfo = document.getElementById('bugEnvInput').value.trim();

    let codeSnippet = '';
    if (this.monacoNewBugEditor) {
      codeSnippet = this.monacoNewBugEditor.getValue();
    }

    if (!title || !description) {
      this.showToast('Please provide both bug title and description.', 'error');
      return;
    }

    // Show Progress Triage Animation
    const btn = document.getElementById('submitBugBtn');
    const originalText = btn.innerHTML;
    btn.disabled = true;

    const progressOverlay = document.getElementById('triageProgressOverlay');
    const progressStatus = document.getElementById('triageProgressStatus');
    if (progressOverlay) progressOverlay.style.display = 'flex';

    const stepsList = [
      '1/4 Sanitizing context & scanning parameters...',
      '2/4 Engaging AI Engine for Root Cause Analysis...',
      '3/4 Classifying Incident Severity (P0 - P4)...',
      '4/4 Formulating Code Diff & Routing to Engineering Team...'
    ];

    let stepIdx = 0;
    const stepInterval = setInterval(() => {
      if (progressStatus && stepIdx < stepsList.length) {
        progressStatus.textContent = stepsList[stepIdx++];
      }
    }, 700);

    try {
      const payload = {
        title,
        description,
        language,
        framework,
        steps_to_reproduce: steps,
        expected_behavior: expected,
        actual_behavior: actual,
        error_trace: errorTrace,
        environment_info: envInfo,
        code_snippet: codeSnippet
      };

      const createdBug = await window.api.createBug(payload);

      // Upload any attachments if present
      for (const file of this.uploadedFiles) {
        try {
          await window.api.uploadAttachment(createdBug.id, file);
        } catch (uploadErr) {
          console.warn('Attachment upload failed:', uploadErr);
        }
      }

      clearInterval(stepInterval);
      if (progressOverlay) progressOverlay.style.display = 'none';

      btn.disabled = false;
      btn.innerHTML = originalText;

      this.closeReportBugModal();
      this.showToast(`Bug ${createdBug.bug_code} created and triaged successfully!`, 'success');

      // Refresh table and open triage view
      await this.loadOverviewDashboard();
      this.openBugDetailModal(createdBug.id);
    } catch (err) {
      clearInterval(stepInterval);
      if (progressOverlay) progressOverlay.style.display = 'none';
      btn.disabled = false;
      btn.innerHTML = originalText;
      this.showToast('Failed to triage bug: ' + err.message, 'error');
    }
  }

  // ==========================================
  // BUG DETAIL MODAL & AI ANALYSIS
  // ==========================================
  async openBugDetailModal(bugId) {
    const modal = document.getElementById('bugDetailModal');
    if (!modal) return;
    modal.classList.add('active');

    const modalBody = document.getElementById('bugDetailModalBody');
    modalBody.innerHTML = `<div style="text-align:center; padding: 40px;"><div class="loading-spinner"></div> Loading bug details and AI triage...</div>`;

    try {
      const bug = await window.api.getBugById(bugId);
      this.selectedBug = bug;
      this.renderBugDetailContent(bug);
    } catch (e) {
      modalBody.innerHTML = `<div style="color: var(--p0-critical); padding: 20px;">Failed to load bug details: ${e.message}</div>`;
    }
  }

  closeBugDetailModal() {
    const modal = document.getElementById('bugDetailModal');
    if (modal) modal.classList.remove('active');
    if (window.MonacoHelper) window.MonacoHelper.disposeEditor('diffEditorContainer');
    this.selectedBug = null;
  }

  renderBugDetailContent(bug) {
    const modalBody = document.getElementById('bugDetailModalBody');
    const analysis = bug.ai_analysis;

    // Visual Timeline Steps
    const statusOrder = ['Submitted', 'Triaged', 'Assigned', 'In Progress', 'In Review', 'Resolved', 'Closed'];
    const currentStatusIdx = statusOrder.indexOf(bug.status);

    const timelineHtml = `
      <div class="lifecycle-timeline">
        ${statusOrder.map((st, idx) => {
          let statusClass = '';
          if (idx < currentStatusIdx) statusClass = 'completed';
          else if (idx === currentStatusIdx) statusClass = 'active';
          return `
            <div class="lifecycle-step ${statusClass}">
              <div class="step-circle">${idx + 1}</div>
              <div class="step-label">${st}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    // AI Analysis Block
    let aiContentHtml = '';
    if (analysis) {
      const solutionSteps = Array.isArray(analysis.solution_steps) ? analysis.solution_steps : [analysis.solution_steps];
      aiContentHtml = `
        <div class="ai-badge-banner">
          <div class="ai-badge-left">
            <span class="ai-sparkle-icon">✨</span>
            <div>
              <strong style="color: var(--text-primary); font-size: 14px;">AI Triage & Root Cause Intelligence</strong>
              <div style="font-size: 12px; color: var(--text-secondary);">Model: ${analysis.model_name} ${analysis.is_demo_mode ? '• <span style="color:#f59e0b;">(Demo AI Mode Active)</span>' : ''} • Confidence: ${(analysis.confidence_score * 100).toFixed(0)}%</div>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <button class="action-btn-sm" onclick="app.recordFeedback(${bug.id}, true)">👍 Helpful (${analysis.helpful_count})</button>
            <button class="action-btn-sm" onclick="app.recordFeedback(${bug.id}, false)">👎 Not Helpful (${analysis.unhelpful_count})</button>
          </div>
        </div>

        <!-- Section A: Bug Summary & Type -->
        <div class="analysis-section">
          <div class="analysis-section-title"><span>📌</span> A. Bug Summary & Classification</div>
          <p style="font-size: 13.5px; margin-bottom: 8px;">${this.escapeHtml(analysis.summary)}</p>
          <div style="display: flex; gap: 8px; align-items: center; margin-top: 6px;">
            <span style="font-size: 12px; color: var(--text-muted);">Detected Category:</span>
            <span class="status-badge Analyzing" style="font-size: 12px;">${analysis.bug_type}</span>
          </div>
        </div>

        <!-- Section C: Root Cause Analysis -->
        <div class="analysis-section">
          <div class="analysis-section-title"><span>🔍</span> B. Root Cause Analysis</div>
          <p style="font-size: 13.5px; margin-bottom: 6px;"><strong>Identified Cause:</strong> ${this.escapeHtml(analysis.root_cause)}</p>
          <p style="font-size: 12.5px; color: var(--text-secondary);"><strong>Target Code Location:</strong> ${analysis.line_numbers || 'Not specified'}</p>
          <p style="font-size: 12.5px; color: var(--text-secondary); margin-top: 4px;"><strong>Trigger Conditions:</strong> ${this.escapeHtml(analysis.trigger_conditions || 'Edge conditions')}</p>
          <div style="margin-top: 8px;">
            <span style="font-size: 11px; padding: 2px 8px; border-radius: 4px; background: rgba(59, 130, 246, 0.15); color: var(--accent-blue);">
              ${analysis.is_hypothesis ? 'AI-Generated Hypothesis' : 'Confirmed Finding'}
            </span>
          </div>
        </div>

        <!-- Section D: Severity Classification -->
        <div class="analysis-section">
          <div class="analysis-section-title" style="justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span>🚨</span> C. Severity Classification
            </div>
            <button class="action-btn-sm" onclick="app.promptSeverityOverride(${bug.id}, '${bug.severity}')">Override Severity</button>
          </div>
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
            <span class="severity-badge ${bug.severity}" style="font-size: 13px;">${bug.severity}</span>
            <span style="font-size: 13px; font-weight: 500;">${this.escapeHtml(analysis.severity_reasoning)}</span>
          </div>
          <p style="font-size: 12.5px; color: var(--text-muted);"><strong>Evidence:</strong> ${this.escapeHtml(analysis.severity_evidence)}</p>
          ${bug.severity_override_reason ? `
            <div style="margin-top: 8px; padding: 8px 12px; background: rgba(245, 158, 11, 0.1); border-left: 3px solid #f59e0b; border-radius: 4px; font-size: 12px;">
              <strong>Manual Override Justification:</strong> ${this.escapeHtml(bug.severity_override_reason)}
            </div>
          ` : ''}
        </div>

        <!-- Section E: Solution & Monaco Code Diff -->
        <div class="analysis-section">
          <div class="analysis-section-title" style="justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span>🛠️</span> D. AI-Generated Solution & Code Diff
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="action-btn-sm" onclick="app.toggleDiffSideBySide()">Toggle Diff View</button>
              <button class="action-btn-sm" onclick="app.copyFixToClipboard()">Copy Patch</button>
            </div>
          </div>
          <p style="font-size: 13px; margin-bottom: 8px;"><strong>Fix Rationale:</strong> ${this.escapeHtml(analysis.fix_explanation)}</p>

          <div style="margin: 12px 0;">
            <strong style="font-size: 12.5px; color: var(--text-secondary);">Step-by-step Debugging Instructions:</strong>
            <ul style="margin: 6px 0 12px 20px; font-size: 13px; line-height: 1.6;">
              ${solutionSteps.map(s => `<li>${this.escapeHtml(s)}</li>`).join('')}
            </ul>
          </div>

          <div class="diff-toolbar">
            <span>Visual Code Comparison (Original vs Patched)</span>
            <span style="font-family: var(--font-mono); font-size: 11px;">${bug.language || 'Python'}</span>
          </div>
          <div id="diffEditorContainer" class="monaco-editor-box"></div>

          ${analysis.suggested_unit_tests ? `
            <div style="margin-top: 14px;">
              <strong style="font-size: 12.5px; color: var(--text-secondary);">Suggested Unit & Regression Tests:</strong>
              <pre style="background: var(--bg-card); padding: 12px; border-radius: 6px; font-family: var(--font-mono); font-size: 12px; margin-top: 6px; overflow-x: auto; border: 1px solid var(--border-color);">${this.escapeHtml(analysis.suggested_unit_tests)}</pre>
            </div>
          ` : ''}

          <div style="margin-top: 10px; font-size: 12px; color: var(--text-muted);">
            <strong>Notice:</strong> AI-generated code patches are suggestions and require engineer review before committing to production.
          </div>
        </div>

        <!-- Section F: Automatic Team Assignment -->
        <div class="analysis-section">
          <div class="analysis-section-title" style="justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span>👥</span> E. Team Assignment & Routing
            </div>
            <button class="action-btn-sm" onclick="app.promptReassignment(${bug.id})">Reassign</button>
          </div>
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
            <span class="team-pill" style="font-size: 13px;">
              <span class="team-dot" style="background-color: ${bug.assigned_team_color};"></span>
              ${this.escapeHtml(bug.assigned_team_name)}
            </span>
            <span style="font-size: 13px; color: var(--text-secondary);"><strong>Assigned Developer:</strong> ${bug.assigned_developer_name || 'Unassigned'}</span>
          </div>
          <p style="font-size: 13px; margin-bottom: 4px;"><strong>Routing Reason:</strong> ${this.escapeHtml(analysis.team_routing_reason)}</p>
          <p style="font-size: 12.5px; color: var(--text-muted);"><strong>Required Expertise:</strong> ${this.escapeHtml(analysis.required_expertise || 'General')}</p>
        </div>
      `;
    }

    modalBody.innerHTML = `
      <div style="margin-bottom: 16px;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
          <h2 style="font-size: 20px; font-weight: 700;">${this.escapeHtml(bug.title)}</h2>
          <div style="display:flex; gap:8px;">
            <span class="bug-code-pill" style="font-size:13px;">${bug.bug_code}</span>
            <span class="severity-badge ${bug.severity}">${bug.severity}</span>
            <span class="status-badge ${bug.status.replace(/\s+/g, '')}">${bug.status}</span>
          </div>
        </div>
        <div style="font-size: 12.5px; color: var(--text-muted);">
          Reported by <strong>${this.escapeHtml(bug.reporter_name || 'User')}</strong> on ${new Date(bug.created_at).toLocaleString()}
        </div>
      </div>

      ${timelineHtml}

      <!-- Status Action Bar for Developers / Admin -->
      ${['admin', 'developer'].includes(this.currentUser.role) ? `
        <div style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 12px 16px; border-radius: var(--radius-md); margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
          <span style="font-size: 13px; font-weight: 600;">Update Bug Lifecycle Status:</span>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            ${bug.status !== 'In Progress' ? `<button class="action-btn-sm" onclick="app.updateStatus(${bug.id}, 'In Progress')">Take Bug (In Progress)</button>` : ''}
            ${bug.status !== 'In Review' ? `<button class="action-btn-sm" onclick="app.updateStatus(${bug.id}, 'In Review')">Submit Fix for Review</button>` : ''}
            ${bug.status !== 'Resolved' ? `<button class="action-btn-sm" style="background: var(--p3-low); color:#fff;" onclick="app.promptResolve(${bug.id})">Mark as Resolved</button>` : ''}
            ${bug.status === 'Resolved' ? `<button class="action-btn-sm" onclick="app.updateStatus(${bug.id}, 'Closed')">Close Bug</button>` : ''}
            ${bug.status === 'Closed' ? `<button class="action-btn-sm" onclick="app.updateStatus(${bug.id}, 'Reopened')">Reopen Bug</button>` : ''}
          </div>
        </div>
      ` : ''}

      <!-- Original Bug Report Description -->
      <div class="analysis-section">
        <div class="analysis-section-title"><span>📋</span> Original Bug Description & Environment</div>
        <p style="font-size: 13.5px; white-space: pre-wrap; margin-bottom: 12px;">${this.escapeHtml(bug.description)}</p>

        ${bug.steps_to_reproduce ? `
          <div style="margin-bottom: 8px;">
            <strong style="font-size: 12.5px; color: var(--text-secondary);">Steps to Reproduce:</strong>
            <p style="font-size: 13px; white-space: pre-wrap; margin-top: 4px;">${this.escapeHtml(bug.steps_to_reproduce)}</p>
          </div>
        ` : ''}

        ${bug.error_trace ? `
          <div style="margin-top: 10px;">
            <strong style="font-size: 12.5px; color: var(--text-secondary);">Stack Trace / Error Output:</strong>
            <pre style="background: var(--bg-card); padding: 10px; border-radius: 6px; font-family: var(--font-mono); font-size: 11.5px; margin-top: 4px; overflow-x: auto; color: #f87171;">${this.escapeHtml(bug.error_trace)}</pre>
          </div>
        ` : ''}
      </div>

      <!-- AI Triage Intelligence -->
      ${aiContentHtml}

      <!-- Comments Thread -->
      <div class="analysis-section">
        <div class="analysis-section-title"><span>💬</span> Discussion & Resolution Notes</div>
        <div id="bugCommentsList" style="margin-bottom: 16px;">
          ${bug.comments.length === 0 ? '<p style="color: var(--text-muted); font-size: 13px;">No comments yet.</p>' :
            bug.comments.map(c => `
              <div style="padding: 10px 14px; background: var(--bg-card); border-radius: 6px; margin-bottom: 8px; border-left: 3px solid ${c.is_technical ? 'var(--accent-blue)' : 'var(--border-color)'};">
                <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
                  <strong style="color: var(--text-primary);">${this.escapeHtml(c.user_name)} <span style="font-weight: 400; color: var(--text-muted);">(${c.user_role})</span></strong>
                  <span style="color: var(--text-muted);">${new Date(c.created_at).toLocaleTimeString()}</span>
                </div>
                <p style="font-size: 13px;">${this.escapeHtml(c.message)}</p>
              </div>
            `).join('')
          }
        </div>

        <form onsubmit="app.postComment(event, ${bug.id})" style="display: flex; flex-direction: column; gap: 8px;">
          <textarea id="newCommentInput" class="form-input" placeholder="Add a comment or technical note..." rows="2" style="resize: vertical;"></textarea>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label class="checkbox-label" style="font-size: 12px;">
              <input type="checkbox" id="commentTechnicalCheckbox"> Technical note
            </label>
            <button type="submit" class="action-btn-sm" style="background: var(--accent-gradient); color:#fff;">Post Comment</button>
          </div>
        </form>
      </div>
    `;

    // Initialize Monaco Diff Editor for the code patch
    if (analysis && (analysis.original_snippet || analysis.patched_snippet)) {
      setTimeout(async () => {
        if (window.MonacoHelper) {
          this.monacoDiffEditor = await window.MonacoHelper.createDiffEditor(
            'diffEditorContainer',
            analysis.original_snippet || '# Original code unavailable',
            analysis.patched_snippet || '# Patched code unavailable',
            bug.language || 'python',
            this.diffSideBySide
          );
        }
      }, 150);
    }
  }

  toggleDiffSideBySide() {
    this.diffSideBySide = !this.diffSideBySide;
    if (this.selectedBug && this.selectedBug.ai_analysis && window.MonacoHelper) {
      const a = this.selectedBug.ai_analysis;
      window.MonacoHelper.createDiffEditor(
        'diffEditorContainer',
        a.original_snippet,
        a.patched_snippet,
        this.selectedBug.language,
        this.diffSideBySide
      );
    }
  }

  copyFixToClipboard() {
    if (this.selectedBug && this.selectedBug.ai_analysis) {
      const patch = this.selectedBug.ai_analysis.patched_snippet;
      if (patch) {
        navigator.clipboard.writeText(patch);
        this.showToast('Patched code copied to clipboard!', 'success');
      }
    }
  }

  async recordFeedback(bugId, isHelpful) {
    try {
      const res = await window.api.recordAIFeedback(bugId, isHelpful);
      this.showToast(res.message, 'success');
      this.openBugDetailModal(bugId);
    } catch (e) {
      this.showToast('Failed to record feedback: ' + e.message, 'error');
    }
  }

  async updateStatus(bugId, newStatus, notes = '', resolutionNotes = '') {
    try {
      await window.api.updateBugStatus(bugId, newStatus, notes, resolutionNotes);
      this.showToast(`Bug status updated to ${newStatus}`, 'success');
      this.openBugDetailModal(bugId);
      this.loadOverviewDashboard();
    } catch (e) {
      this.showToast('Failed to update status: ' + e.message, 'error');
    }
  }

  promptResolve(bugId) {
    const notes = prompt("Enter resolution notes or developer fix comments:");
    if (notes !== null) {
      this.updateStatus(bugId, 'Resolved', 'Resolved by engineer', notes);
    }
  }

  async promptSeverityOverride(bugId, currentSev) {
    const newSev = prompt(`Override severity for BUG (Current: ${currentSev})\nEnter new severity: P0, P1, P2, P3, or P4:`, currentSev);
    if (!newSev) return;
    const cleanSev = newSev.trim().toUpperCase();
    if (!['P0', 'P1', 'P2', 'P3', 'P4'].includes(cleanSev)) {
      this.showToast('Invalid severity. Must be one of P0, P1, P2, P3, P4.', 'error');
      return;
    }
    const reason = prompt("Enter mandatory justification reason for overriding severity:");
    if (!reason || reason.trim().length < 5) {
      this.showToast('Override cancelled. A reason of at least 5 characters is required.', 'error');
      return;
    }

    try {
      await window.api.overrideSeverity(bugId, cleanSev, reason);
      this.showToast(`Severity updated to ${cleanSev}`, 'success');
      this.openBugDetailModal(bugId);
      this.loadOverviewDashboard();
    } catch (e) {
      this.showToast('Failed to override severity: ' + e.message, 'error');
    }
  }

  async promptReassignment(bugId) {
    try {
      const teams = await window.api.getTeams();
      const options = teams.map((t, idx) => `${idx + 1}. ${t.name}`).join('\n');
      const choice = prompt(`Select Team Number for Reassignment:\n${options}`);
      if (!choice) return;
      const num = parseInt(choice, 10);
      if (isNaN(num) || num < 1 || num > teams.length) {
        this.showToast('Invalid selection.', 'error');
        return;
      }
      const selectedTeam = teams[num - 1];
      const reason = prompt(`Reason for reassigning to ${selectedTeam.name}:`, "Manual engineer review");

      await window.api.reassignBug(bugId, selectedTeam.id, null, reason);
      this.showToast(`Bug reassigned to ${selectedTeam.name}`, 'success');
      this.openBugDetailModal(bugId);
      this.loadOverviewDashboard();
    } catch (e) {
      this.showToast('Failed to reassign: ' + e.message, 'error');
    }
  }

  async postComment(e, bugId) {
    e.preventDefault();
    const input = document.getElementById('newCommentInput');
    const technical = document.getElementById('commentTechnicalCheckbox');
    if (!input || !input.value.trim()) return;

    try {
      await window.api.addComment(bugId, input.value.trim(), technical ? technical.checked : false);
      input.value = '';
      this.showToast('Comment posted', 'success');
      this.openBugDetailModal(bugId);
    } catch (err) {
      this.showToast('Failed to post comment: ' + err.message, 'error');
    }
  }

  // ==========================================
  // TEAMS & USERS VIEWS
  // ==========================================
  async loadTeamsView() {
    const grid = document.getElementById('teamsCardsGrid');
    if (!grid) return;
    grid.innerHTML = '<div style="text-align:center; padding: 30px;"><div class="loading-spinner"></div> Loading teams...</div>';

    try {
      this.allTeams = await window.api.getTeams();
      grid.innerHTML = this.allTeams.map(t => `
        <div class="stat-card" style="flex-direction:column; align-items:flex-start; position:relative;">
          <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="team-dot" style="background-color: ${t.color}; width:12px; height:12px;"></span>
              <strong style="font-size: 15px;">${this.escapeHtml(t.name)}</strong>
            </div>
            <span class="badge-counter" style="position:static; background:var(--accent-blue);">${t.bug_count} bugs</span>
          </div>
          <p style="font-size: 12.5px; color: var(--text-secondary); margin: 8px 0;">${this.escapeHtml(t.description || 'No description.')}</p>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: auto; border-top: 1px solid var(--border-color); padding-top: 8px; width:100%;">
            <strong>Members (${t.member_count}):</strong>
            <div style="margin-top: 4px;">
              ${t.members && t.members.length > 0 ?
                t.members.map(m => `<span style="font-size:11px; padding:2px 6px; background:var(--bg-secondary); border-radius:4px; margin-right:4px;">${this.escapeHtml(m.full_name)}</span>`).join('') :
                '<em>No members assigned yet</em>'
              }
            </div>
          </div>
        </div>
      `).join('');
    } catch (e) {
      grid.innerHTML = `<div style="color:var(--p0-critical);">Failed to load teams: ${e.message}</div>`;
    }
  }

  async loadUsersView() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 30px;"><div class="loading-spinner"></div> Loading users...</td></tr>';

    try {
      this.allUsers = await window.api.getUsers();
      tbody.innerHTML = this.allUsers.map(u => `
        <tr>
          <td>
            <div style="display:flex; align-items:center; gap:8px;">
              <div class="user-avatar" style="width:28px; height:28px; font-size:12px; background:${u.avatar_color || '#3b82f6'};">${u.full_name.charAt(0)}</div>
              <strong>${this.escapeHtml(u.full_name)}</strong>
            </div>
          </td>
          <td>${this.escapeHtml(u.email)}</td>
          <td><span class="role-badge ${u.role}">${u.role}</span></td>
          <td>${this.escapeHtml(u.team_name || 'None')}</td>
          <td>${u.is_active ? '<span style="color:var(--p3-low);">Active</span>' : '<span style="color:var(--text-muted);">Inactive</span>'}</td>
          <td>
            ${this.currentUser.role === 'admin' ? `
              <button class="action-btn-sm" onclick="app.editUserRole(${u.id}, '${u.role}')">Change Role</button>
            ` : '-'}
          </td>
        </tr>
      `).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="6" style="color:var(--p0-critical);">Failed to load users: ${e.message}</td></tr>`;
    }
  }

  async editUserRole(userId, currentRole) {
    const newRole = prompt(`Change role for user ID #${userId} (admin, reporter, developer):`, currentRole);
    if (!newRole) return;
    const cleanRole = newRole.trim().toLowerCase();
    if (!['admin', 'reporter', 'developer'].includes(cleanRole)) {
      this.showToast('Invalid role specified.', 'error');
      return;
    }

    try {
      await window.api.updateUserRole(userId, cleanRole);
      this.showToast('User role updated successfully', 'success');
      this.loadUsersView();
    } catch (e) {
      this.showToast('Failed to update user: ' + e.message, 'error');
    }
  }

  // ==========================================
  // AUDIT LOGS VIEW
  // ==========================================
  async loadLogsView() {
    const tbody = document.getElementById('auditLogsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 30px;"><div class="loading-spinner"></div> Loading audit trail...</td></tr>';

    try {
      const logs = await window.api.getAuditLogs();
      tbody.innerHTML = logs.map(l => `
        <tr>
          <td style="font-family: var(--font-mono); font-size: 12px; color: var(--text-muted);">${new Date(l.created_at).toLocaleString()}</td>
          <td><strong>${this.escapeHtml(l.user_name || 'System')}</strong></td>
          <td><span style="font-family: var(--font-mono); font-size: 12px; color: var(--accent-indigo);">${l.action}</span></td>
          <td style="font-size: 13px;">${this.escapeHtml(l.details || '')}</td>
          <td style="font-family: var(--font-mono); font-size: 11.5px; color: var(--text-muted);">${l.ip_address}</td>
        </tr>
      `).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="5" style="color:var(--p0-critical);">Failed to load audit logs: ${e.message}</td></tr>`;
    }
  }

  loadSettingsView() {
    // Populate settings view with current status
    const statusEl = document.getElementById('settingsAiStatus');
    if (statusEl) {
      statusEl.innerHTML = `
        <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; padding: 18px; margin-top: 10px;">
          <h4 style="font-size: 15px; margin-bottom: 8px;">LLM Intelligence Configuration</h4>
          <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 12px;">The platform supports Gemini 1.5 Pro, OpenAI GPT-4o, or an intelligent built-in heuristic analysis engine.</p>
          <div style="display:flex; gap:12px; font-size: 13px;">
            <div><strong>Active Mode:</strong> <span style="color:var(--accent-purple);">Adaptive Demo / Heuristic Mode</span></div>
            <div><strong>Rate Limit:</strong> <span>60 req/min</span></div>
            <div><strong>Upload Limit:</strong> <span>15 MB</span></div>
          </div>
        </div>
      `;
    }
  }

  // ==========================================
  // NOTIFICATIONS
  // ==========================================
  async loadNotifications() {
    try {
      const notifs = await window.api.getNotifications();
      const unreadCount = notifs.filter(n => !n.is_read).length;
      const counterEl = document.getElementById('notifBadgeCounter');
      if (counterEl) {
        counterEl.textContent = unreadCount;
        counterEl.style.display = unreadCount > 0 ? 'flex' : 'none';
      }

      const listEl = document.getElementById('notifDrawerList');
      if (listEl) {
        if (notifs.length === 0) {
          listEl.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-muted);">No notifications</div>';
        } else {
          listEl.innerHTML = notifs.map(n => `
            <div class="notification-item ${n.is_read ? '' : 'unread'}" onclick="app.handleNotifClick(${n.id}, ${n.bug_id})">
              <div style="font-weight:600; font-size:12.5px; margin-bottom:2px;">${this.escapeHtml(n.title)}</div>
              <div style="color:var(--text-secondary); font-size:12px;">${this.escapeHtml(n.message)}</div>
              <div style="color:var(--text-muted); font-size:10.5px; margin-top:4px;">${new Date(n.created_at).toLocaleTimeString()}</div>
            </div>
          `).join('');
        }
      }
    } catch (e) {
      console.warn('Notifications fetch error:', e);
    }
  }

  toggleNotificationsDrawer() {
    const drawer = document.getElementById('notificationsDrawer');
    if (drawer) drawer.classList.toggle('active');
  }

  async handleNotifClick(notifId, bugId) {
    try {
      await window.api.markNotificationRead(notifId);
      this.loadNotifications();
      if (bugId) this.openBugDetailModal(bugId);
    } catch (e) {
      console.warn(e);
    }
  }

  async markAllNotificationsRead() {
    try {
      await window.api.markAllNotificationsRead();
      this.loadNotifications();
      this.showToast('All notifications marked as read', 'info');
    } catch (e) {
      console.warn(e);
    }
  }

  // ==========================================
  // UTILITIES & EVENT BINDINGS
  // ==========================================
  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  bindEvents() {
    // Theme toggle
    document.getElementById('themeToggleBtn')?.addEventListener('click', () => this.toggleTheme());

    // Sidebar collapse
    document.getElementById('sidebarToggleBtn')?.addEventListener('click', () => {
      document.getElementById('appSidebar')?.classList.toggle('collapsed');
    });

    // Navigation item clicks (both sidebar-nav and sidebar-footer)
    document.querySelectorAll('.sidebar .nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const view = item.dataset.view;
        if (view === 'logout') {
          e.preventDefault();
          this.logout();
        } else if (view) {
          this.switchView(view);
        }
      });
    });

    // Explicit listeners for all logout buttons
    document.getElementById('sidebarLogoutBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.logout();
    });

    document.getElementById('topbarLogoutBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.logout();
    });

    // Handle token expiry broadcast
    window.addEventListener('auth-expired', () => {
      this.logout();
    });

    // Notification bell toggle
    document.getElementById('notifBellBtn')?.addEventListener('click', () => this.toggleNotificationsDrawer());
    document.getElementById('markAllReadBtn')?.addEventListener('click', () => this.markAllNotificationsRead());

    // Report bug form submit
    document.getElementById('newBugForm')?.addEventListener('submit', (e) => this.submitNewBug(e));

    // File Drag & Drop in Bug Report Modal
    const dropzone = document.getElementById('bugDropzone');
    const fileInput = document.getElementById('bugFileInput');

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());

      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });

      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));

      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files) {
          this.handleFileSelection(e.dataTransfer.files);
        }
      });

      fileInput.addEventListener('change', (e) => {
        if (e.target.files) {
          this.handleFileSelection(e.target.files);
        }
      });
    }

    // Auth Login & Register Form Submissions
    document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;
      const roleSelected = document.querySelector('.role-pill-btn.active')?.dataset.role || null;
      const btn = document.getElementById('loginSubmitBtn');

      btn.disabled = true;
      btn.innerHTML = `<span class="loading-spinner"></span> Authenticating...`;

      try {
        await window.api.login(email, password, roleSelected);
        this.showToast('Login successful! Welcome back.', 'success');
        await this.checkAuth();
      } catch (err) {
        this.showToast(err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = `<span>Sign In to Dashboard</span>`;
      }
    });

    document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('regName').value.trim();
      const email = document.getElementById('regEmail').value.trim();
      const password = document.getElementById('regPassword').value;
      const role = document.getElementById('regRole').value;
      const btn = document.getElementById('regSubmitBtn');

      btn.disabled = true;
      btn.innerHTML = `<span class="loading-spinner"></span> Creating Account...`;

      try {
        await window.api.register(email, name, password, role);
        this.showToast('Account created successfully!', 'success');
        await this.checkAuth();
      } catch (err) {
        this.showToast(err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = `<span>Create Account</span>`;
      }
    });

    // Password show/hide toggles
    document.getElementById('togglePasswordBtn')?.addEventListener('click', () => {
      const input = document.getElementById('loginPassword');
      if (input.type === 'password') {
        input.type = 'text';
      } else {
        input.type = 'password';
      }
    });

    // Quick Role Demo fill buttons on login page
    document.querySelectorAll('.role-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.role-pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.fillDemoCredentials(btn.dataset.role);
      });
    });

    // Filter table inputs
    const filterIds = ['filterStatusSelect', 'filterSeveritySelect', 'filterTeamSelect', 'tableSearchInput'];
    filterIds.forEach(id => {
      document.getElementById(id)?.addEventListener('change', () => this.loadBugsTable('allBugsTableBody'));
      if (id === 'tableSearchInput') {
        document.getElementById(id)?.addEventListener('input', () => this.loadBugsTable('allBugsTableBody'));
      }
    });

    // Close modals and drawers on click outside
    window.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
      }
      const notifDrawer = document.getElementById('notificationsDrawer');
      const notifBtn = document.getElementById('notifBellBtn');
      if (notifDrawer && notifDrawer.classList.contains('active') && !notifDrawer.contains(e.target) && !notifBtn?.contains(e.target)) {
        notifDrawer.classList.remove('active');
      }
      const userMenu = document.getElementById('userDropdownMenu');
      const userBtn = document.getElementById('userProfileMenuBtn');
      if (userMenu && userMenu.classList.contains('active') && !userMenu.contains(e.target) && !userBtn?.contains(e.target)) {
        userMenu.classList.remove('active');
      }
    });
  }

  handleFileSelection(fileList) {
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.size > 15 * 1024 * 1024) {
        this.showToast(`File ${file.name} exceeds 15MB limit.`, 'error');
        continue;
      }
      this.uploadedFiles.push(file);
    }
    this.renderUploadedFilesList();
    this.showToast(`Added ${fileList.length} attachment(s).`, 'info');
  }

  fillDemoCredentials(role) {
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const demoInfoBox = document.getElementById('demoQuickFillBox');

    if (role === 'admin') {
      emailInput.value = 'admin@bugtriage.io';
      passwordInput.value = 'AdminPass123!';
      if (demoInfoBox) demoInfoBox.innerHTML = `<strong>Alex Rivera (Admin)</strong> Manage users, routing rules, and enterprise analytics.`;
    } else if (role === 'reporter') {
      emailInput.value = 'reporter@bugtriage.io';
      passwordInput.value = 'ReporterPass123!';
      if (demoInfoBox) demoInfoBox.innerHTML = `<strong>Sarah Chen (QA Lead)</strong> Submit bug reports, track triage, and add logs.`;
    } else {
      emailInput.value = 'dev@bugtriage.io';
      passwordInput.value = 'DevPass123!';
      if (demoInfoBox) demoInfoBox.innerHTML = `<strong>Marcus Vance (Principal Dev)</strong> Review AI code diffs, unit tests, and resolve bugs.`;
    }
  }

  toggleAuthMode(mode) {
    const loginCard = document.getElementById('loginCardBlock');
    const registerCard = document.getElementById('registerCardBlock');
    if (mode === 'register') {
      loginCard.style.display = 'none';
      registerCard.style.display = 'block';
    } else {
      loginCard.style.display = 'block';
      registerCard.style.display = 'none';
    }
  }
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
  window.app = new BugTriageApp();
});
