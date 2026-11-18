/**
 * AI Bug Triage System v1.0 - MySQL Connection Manager Modal
 * Handles live status checking, configuration testing, and modal interaction
 */

const MySQLManager = {
  status: null,

  init() {
    this.checkStatus();
    this.bindEvents();
    // Poll every 30s
    setInterval(() => this.checkStatus(), 30000);
  },

  async checkStatus() {
    try {
      const res = await fetch('/api/database/status');
      const data = await res.json();
      this.status = data;
      this.updateNavbarIndicator(data);
    } catch (e) {
      console.warn("Could not fetch database status:", e);
    }
  },

  updateNavbarIndicator(data) {
    const pill = document.getElementById('mysqlStatusIndicator');
    if (!pill) return;

    if (data.active_engine === 'MySQL') {
      pill.innerHTML = `
        <span class="status-dot online"></span>
        <span>MySQL: Connected (${data.mysql_info.host})</span>
      `;
      pill.className = 'cyber-pill mysql-connected';
      pill.title = `Connected to MySQL database: ${data.mysql_info.database}`;
    } else {
      pill.innerHTML = `
        <span class="status-dot fallback"></span>
        <span>DB: SQLite Active (MySQL Standby)</span>
      `;
      pill.className = 'cyber-pill mysql-standby';
      pill.title = 'Click to configure MySQL connection credentials or run database.sql';
    }
  },

  openModal() {
    const modal = document.getElementById('mysqlConfigModal');
    if (!modal) return;
    modal.style.display = 'flex';

    if (this.status && this.status.mysql_info) {
      document.getElementById('mysqlHostInput').value = this.status.mysql_info.host || 'localhost';
      document.getElementById('mysqlPortInput').value = this.status.mysql_info.port || 3306;
      document.getElementById('mysqlUserInput').value = this.status.mysql_info.user || 'root';
      document.getElementById('mysqlDbInput').value = this.status.mysql_info.database || 'ai_bug_triage';
    }

    this.renderStatusBox();
  },

  closeModal() {
    const modal = document.getElementById('mysqlConfigModal');
    if (modal) modal.style.display = 'none';
  },

  renderStatusBox() {
    const box = document.getElementById('mysqlStatusBox');
    if (!box) return;

    if (!this.status) {
      box.innerHTML = `<div class="mysql-status-line">Checking database status...</div>`;
      return;
    }

    const isMysql = this.status.active_engine === 'MySQL';
    box.innerHTML = `
      <div class="mysql-status-card ${isMysql ? 'connected' : 'standby'}">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
          <strong>Active Engine: ${this.status.active_engine}</strong>
          <span class="cyber-badge ${isMysql ? 'badge-p3' : 'badge-p2'}">${isMysql ? 'LIVE' : 'FALLBACK READY'}</span>
        </div>
        <p style="font-size: 12.5px; color: var(--text-secondary); line-height: 1.5;">
          ${this.status.message}
        </p>
        ${!isMysql ? `
          <div style="margin-top: 10px; padding: 10px; background: rgba(0, 240, 255, 0.05); border: 1px dashed var(--cyan-border); border-radius: 6px; font-size: 12px;">
            <strong style="color: var(--cyan-neon);">MySQL Setup Tip:</strong>
            <p style="margin: 4px 0 0 0;">Ensure MySQL service (or XAMPP/WAMP) is running on port 3306. You can also import the generated <code>database.sql</code> file into MySQL Workbench or phpMyAdmin.</p>
          </div>
        ` : ''}
      </div>
    `;
  },

  async testConnection(e) {
    if (e) e.preventDefault();

    const btn = document.getElementById('btnTestMysql');
    const resultBox = document.getElementById('mysqlTestResult');

    const host = document.getElementById('mysqlHostInput').value.trim();
    const port = parseInt(document.getElementById('mysqlPortInput').value.trim()) || 3306;
    const user = document.getElementById('mysqlUserInput').value.trim();
    const password = document.getElementById('mysqlPasswordInput').value;
    const database = document.getElementById('mysqlDbInput').value.trim();

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span>⏳ Testing Connection...</span>`;
    }
    if (resultBox) {
      resultBox.style.display = 'block';
      resultBox.className = 'mysql-result-banner info';
      resultBox.innerHTML = `Attempting handshake with MySQL server at ${host}:${port}...`;
    }

    try {
      const res = await fetch('/api/database/test-mysql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, port, user, password, database })
      });
      const data = await res.json();

      if (data.status === 'success') {
        resultBox.className = 'mysql-result-banner success';
        resultBox.innerHTML = `✓ <strong>Connected Successfully!</strong> ${data.message} (Version: ${data.server_version || '8.x'})`;
        this.checkStatus();
      } else {
        resultBox.className = 'mysql-result-banner error';
        resultBox.innerHTML = `✕ <strong>Connection Failed:</strong> ${data.message}<br><small style="opacity: 0.85;">SQLite fallback remains seamlessly active so your system won't crash.</small>`;
      }
    } catch (err) {
      resultBox.className = 'mysql-result-banner error';
      resultBox.innerHTML = `✕ <strong>Error:</strong> ${err.message}`;
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<span>⚡ Test Connection</span>`;
      }
    }
  },

  bindEvents() {
    document.getElementById('mysqlStatusIndicator')?.addEventListener('click', () => {
      this.openModal();
    });

    document.getElementById('closeMysqlModalBtn')?.addEventListener('click', () => {
      this.closeModal();
    });

    document.getElementById('mysqlConfigForm')?.addEventListener('submit', (e) => {
      this.testConnection(e);
    });
  }
};

window.MySQLManager = MySQLManager;
