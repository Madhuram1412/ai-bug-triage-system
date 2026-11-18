/**
 * AI Bug Triage System v1.0 - Cyber IDE & Particle Swarm Engine
 * Recreates the Cyberpunk IDE, Holographic HUD, and Particle Stream
 */

class CyberEngine {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.isSwarming = false;
    this.swarmTarget = { x: 0, y: 0 };
    this.swarmSource = { x: 0, y: 0 };

    this.files = {
      'AI_BUG_STK3_R1': {
        name: 'AI_BUG_STK3_R1',
        ext: 'java',
        isBuggy: true,
        isPatched: false,
        lines: [
          { num: 1, text: 'public feierest(uR)() {', cls: '' },
          { num: 2, text: '    Discorte.tick.singopogreNott();', cls: '' },
          { num: 3, text: '}', cls: '' },
          { num: 4, text: '', cls: '' },
          { num: 5, text: '// RiceFeest type acle rldt', cls: 'syn-comment' },
          { num: 6, text: '/* blic tat : <', cls: 'syn-comment' },
          { num: 7, text: 'public inteERoctect = llace(anOotelor ->', cls: '' },
          { num: 8, text: '    teton = av cnelonCages.wne();', cls: '' },
          { num: 9, text: '    if (vetrost == QI) {', cls: '' },
          { num: 10, text: '        return = dtldCooToct("rapmtn([*o \\"oliat\\"o, isl*, rorl");', cls: '' },
          { num: 11, text: '        return.Slaune(CocintCromemt = BigHatiCkraiss);', cls: '' },
          { num: 12, text: '    }', cls: '' },
          { num: 13, text: '', cls: '' },
          { num: 14, text: 'public Shamoment for = sCrgesBenck() {', cls: '' },
          { num: 15, text: '    Typo: Bog_triage.tocpolom("ollo, Delpo- llasertIlle" of sese);', cls: 'warning-banner' },
          { num: 16, text: '    restFect(orret = recturm.TecteNd);', cls: '' },
          { num: 17, text: '}', cls: '' },
          { num: 18, text: '', cls: '' },
          { num: 19, text: '// Contract execution handler & critical defect:', cls: 'syn-comment' },
          { num: 20, text: 'if (ontEMonsRaction: i = devalor(\'opt, Mlsck {', cls: '' },
          { num: 21, text: '    return = NareEereiEoEccorced));', cls: '' },
          { num: 22, text: '    return.Slanes(ComMaoCvas$[ "OusinStreap" \'anmpartetes");', cls: '' },
          { num: 23, text: '}', cls: '' },
          { num: 24, text: '', cls: '' },
          { num: 25, text: 'if (untKemttion = i= nul) {', cls: '' },
          { num: 26, text: '    return trement = noteFeolteExcccentis);', cls: '' },
          { num: 27, text: '    return trement = noteEroiterEsccpefletioct));', cls: '' },
          { num: 28, text: '}', cls: '' },
          { num: 29, text: '', cls: '' },
          { num: 30, text: '// Target boundary condition on line 42:', cls: 'syn-comment' },
          { num: 31, text: 'if (userDate != null) {', cls: '' },
          { num: 32, text: '    CRITICAL ERROR: NullPointerException at line 42', cls: 'error-banner', isErrorBanner: true },
          { num: 33, text: '    userDate = null;', cls: '' },
          { num: 34, text: '    userDate = 0;', cls: '' },
          { num: 35, text: '}', cls: '' },
          { num: 36, text: '', cls: '' },
          { num: 37, text: '// Readrraben dataFacetiond', cls: 'syn-comment' },
          { num: 38, text: 'return Trement = ImpleneDuatlerscesarce();', cls: '' },
          { num: 39, text: '', cls: '' },
          { num: 40, text: 'public vateCeef(fethev();', cls: '' }
        ]
      },
      'ENV01:1:1.M': {
        name: 'ENV01:1:1.M',
        ext: 'env',
        isBuggy: false,
        lines: [
          { num: 1, text: '# AI BUG TRIAGE SYSTEM CONFIGURATION', cls: 'syn-comment' },
          { num: 2, text: 'ENVIRONMENT=production', cls: 'syn-kw' },
          { num: 3, text: 'DATABASE_ENGINE=MYSQL', cls: 'syn-str' },
          { num: 4, text: 'MYSQL_HOST=127.0.0.1:3306', cls: 'syn-num' },
          { num: 5, text: 'MYSQL_DATABASE=ai_bug_triage', cls: 'syn-str' },
          { num: 6, text: 'LLM_MODEL=Cyber_AI_Triage_v1.0', cls: 'syn-fn' },
          { num: 7, text: 'AUTOROUTE_MODE=ENABLED', cls: 'syn-type' },
          { num: 8, text: 'SYSTEM_HEALTH_METRIC=98%', cls: 'syn-kw' }
        ]
      },
      'AI_Bugret.sr1': {
        name: 'AI_Bugret.sr1',
        ext: 'log',
        isBuggy: false,
        lines: [
          { num: 1, text: '[2026-11-18 12:30:14] SYSTEM_DIAGNOSTICS_START', cls: 'syn-comment' },
          { num: 2, text: '[INFO] Initializing contract neural triage watcher...', cls: '' },
          { num: 3, text: '[WARN] Typo in Bog_triage.tocpolom definition on line 15', cls: 'warning-banner' },
          { num: 4, text: '[FATAL] NullPointerException detected at line 42: field userDate is null', cls: 'error-banner' },
          { num: 5, text: '[AI_AGENT] Generating root cause analysis & code diff patch...', cls: 'syn-fn' },
          { num: 6, text: '[STATUS] Suggested patch ready for developer review.', cls: 'syn-str' }
        ]
      }
    };

    this.activeFileKey = 'AI_BUG_STK3_R1';
    this.initCanvas();
    this.renderActiveFile();
    this.bindEvents();
  }

  initCanvas() {
    this.canvas = document.getElementById('cyberParticleCanvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // Create initial floating particles
    this.particles = [];
    const count = window.innerWidth < 768 ? 40 : 85;
    for (let i = 0; i < count; i++) {
      this.particles.push(this.createParticle());
    }

    requestAnimationFrame(() => this.animateParticles());
  }

  resizeCanvas() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  createParticle(x, y, vx, vy) {
    return {
      x: x !== undefined ? x : Math.random() * window.innerWidth,
      y: y !== undefined ? y : Math.random() * window.innerHeight,
      vx: vx !== undefined ? vx : (Math.random() - 0.5) * 0.8,
      vy: vy !== undefined ? vy : (Math.random() - 0.5) * 0.8,
      size: Math.random() * 2.8 + 1.2,
      alpha: Math.random() * 0.7 + 0.3,
      color: Math.random() > 0.3 ? '#00f0ff' : '#38bdf8'
    };
  }

  triggerSwarmAnimation() {
    this.isSwarming = true;

    // Find position of line 32 in editor (source) and HUD box (target)
    const errLine = document.querySelector('.code-line.error-banner');
    const hudBox = document.getElementById('floatingAiHud');

    if (errLine && hudBox) {
      const errRect = errLine.getBoundingClientRect();
      const hudRect = hudBox.getBoundingClientRect();

      this.swarmSource = { x: errRect.left + errRect.width / 2, y: errRect.top + errRect.height / 2 };
      this.swarmTarget = { x: hudRect.left + 50, y: hudRect.top + 100 };
    } else {
      this.swarmSource = { x: window.innerWidth * 0.3, y: window.innerHeight * 0.4 };
      this.swarmTarget = { x: window.innerWidth * 0.7, y: window.innerHeight * 0.3 };
    }

    // Spawn 80 high-energy particles at source
    for (let i = 0; i < 80; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 2;
      this.particles.push({
        x: this.swarmSource.x + (Math.random() - 0.5) * 40,
        y: this.swarmSource.y + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 4 + 2,
        alpha: 1,
        color: '#00f0ff',
        isSwarm: true,
        life: 0
      });
    }

    setTimeout(() => {
      this.isSwarming = false;
    }, 2500);
  }

  animateParticles() {
    if (!this.ctx || !this.canvas) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      if (p.isSwarm) {
        // Gravitate towards target
        const dx = this.swarmTarget.x - p.x;
        const dy = this.swarmTarget.y - p.y;
        p.vx += dx * 0.003;
        p.vy += dy * 0.003;
        p.vx *= 0.94;
        p.vy *= 0.94;
        p.x += p.vx;
        p.y += p.vy;
        p.life++;

        if (p.life > 140) {
          this.particles.splice(i, 1);
          continue;
        }
      } else {
        // Gentle ambient drift
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = this.canvas.width;
        if (p.x > this.canvas.width) p.x = 0;
        if (p.y < 0) p.y = this.canvas.height;
        if (p.y > this.canvas.height) p.y = 0;
      }

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.alpha;
      this.ctx.shadowBlur = p.isSwarm ? 14 : 6;
      this.ctx.shadowColor = '#00f0ff';
      this.ctx.fill();
    }

    this.ctx.shadowBlur = 0;
    this.ctx.globalAlpha = 1;

    requestAnimationFrame(() => this.animateParticles());
  }

  renderActiveFile() {
    const file = this.files[this.activeFileKey];
    if (!file) return;

    // Gutter numbers
    const gutter = document.getElementById('editorLineGutter');
    const codeBody = document.getElementById('editorCodeBody');
    if (!gutter || !codeBody) return;

    let gutterHtml = '';
    let codeHtml = '';

    file.lines.forEach((line) => {
      gutterHtml += `<span class="gutter-num">${line.num}</span>`;
      let lineCls = line.cls || '';

      if (line.isErrorBanner) {
        codeHtml += `
          <div class="code-line ${lineCls}">
            <span style="margin-right: 8px;">⚠️</span>
            <span>CRITICAL ERROR: NullPointerException at line 42</span>
          </div>`;
      } else {
        codeHtml += `<div class="code-line ${lineCls}">${this.escapeHtml(line.text)}</div>`;
      }
    });

    gutter.innerHTML = gutterHtml;
    codeBody.innerHTML = codeHtml;

    // Show or hide HUD based on file
    const hud = document.getElementById('floatingAiHud');
    if (hud) {
      if (file.name === 'AI_BUG_STK3_R1') {
        hud.style.display = 'block';
      } else {
        hud.style.display = 'none';
      }
    }

    // Update active tab styles
    document.querySelectorAll('.editor-tab-item').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.file === this.activeFileKey);
    });

    // Update active file tree styles
    document.querySelectorAll('.tree-file-item').forEach(item => {
      item.classList.toggle('active', item.dataset.file === this.activeFileKey);
    });
  }

  applySuggestedFix() {
    const file = this.files['AI_BUG_STK3_R1'];
    if (!file || file.isPatched) return;

    // Trigger particle swarm animation (Screenshot 3)
    this.triggerSwarmAnimation();

    const btn = document.getElementById('btnApplyFix');
    if (btn) {
      btn.innerHTML = `<span>⚡ Applying Neural Patch...</span>`;
      btn.disabled = true;
    }

    // Call backend API
    fetch('/api/triage/apply-fix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_id: 'AI_BUG_STK3_R1', bug_id: 1 })
    }).catch(() => {});

    setTimeout(() => {
      file.isPatched = true;

      // Replace lines 30-35 with safe patched code
      file.lines = file.lines.map(line => {
        if (line.num === 31) {
          return { num: 31, text: 'if (userData != null) {', cls: 'patched-banner' };
        }
        if (line.num === 32) {
          return { num: 32, text: '    (userData = null;', cls: 'patched-banner' };
        }
        if (line.num === 33) {
          return { num: 33, text: '    recont null));', cls: 'patched-banner' };
        }
        if (line.num === 34) {
          return { num: 34, text: '}', cls: 'patched-banner' };
        }
        if (line.num === 35) {
          return { num: 35, text: '// Null check defensive assertions verified by AI', cls: 'syn-comment' };
        }
        return line;
      });

      this.renderActiveFile();

      // Show Patched Banner & Generate Report button (Screenshot 5)
      const successToast = document.getElementById('patchSuccessToast');
      const genReportBtn = document.getElementById('btnGenerateReport');
      if (successToast) successToast.style.display = 'flex';
      if (genReportBtn) genReportBtn.style.display = 'flex';

      if (btn) {
        btn.innerHTML = `<span>✓ Fix Applied Successfully</span>`;
        btn.style.borderColor = 'var(--green-neon)';
        btn.style.color = 'var(--green-neon)';
      }

      if (window.app && window.app.showToast) {
        window.app.showToast("Code patched successfully! Null safety verified.", "success");
      }
    }, 700);
  }

  switchToFile(fileKey) {
    if (this.files[fileKey]) {
      this.activeFileKey = fileKey;
      this.renderActiveFile();
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  bindEvents() {
    // Apply Fix button
    document.getElementById('btnApplyFix')?.addEventListener('click', () => {
      this.applySuggestedFix();
    });

    // Close HUD button
    document.getElementById('hudCloseBtn')?.addEventListener('click', () => {
      const hud = document.getElementById('floatingAiHud');
      if (hud) hud.style.display = 'none';
    });

    // Generate Report button (transitions to Screenshot 4/6 view)
    document.getElementById('btnGenerateReport')?.addEventListener('click', () => {
      this.openTriageReportView();
    });

    // Tab clicks
    document.querySelectorAll('.editor-tab-item').forEach(tab => {
      tab.addEventListener('click', () => {
        this.switchToFile(tab.dataset.file);
      });
    });

    // File tree clicks
    document.querySelectorAll('.tree-file-item').forEach(item => {
      item.addEventListener('click', () => {
        const fileKey = item.dataset.file;
        if (fileKey && this.files[fileKey]) {
          this.switchToFile(fileKey);
        } else {
          // Create virtual tab for other items
          const name = item.innerText.trim();
          this.files[name] = {
            name: name,
            ext: name.split('.').pop() || 'txt',
            lines: [
              { num: 1, text: `// Source file: ${name}`, cls: 'syn-comment' },
              { num: 2, text: `package com.system.triage.contracts;`, cls: 'syn-kw' },
              { num: 3, text: `public class ${name.replace(/[^a-zA-Z0-9]/g, '_')} {`, cls: 'syn-fn' },
              { num: 4, text: `    // System contract logic initialized`, cls: 'syn-comment' },
              { num: 5, text: `}`, cls: '' }
            ]
          };
          this.switchToFile(name);
        }
      });
    });

    // View switch buttons
    document.getElementById('switchBtnIde')?.addEventListener('click', () => {
      this.openIdeView();
    });

    document.getElementById('switchBtnReport')?.addEventListener('click', () => {
      this.openTriageReportView();
    });
  }

  openIdeView() {
    document.getElementById('cyberIdeContainer').style.display = 'flex';
    document.getElementById('triageReportContainer').style.display = 'none';
    document.getElementById('allBugsContainer').style.display = 'none';
    document.getElementById('switchBtnIde')?.classList.add('active');
    document.getElementById('switchBtnReport')?.classList.remove('active');
    document.getElementById('switchBtnAllBugs')?.classList.remove('active');
  }

  openTriageReportView() {
    document.getElementById('cyberIdeContainer').style.display = 'none';
    document.getElementById('triageReportContainer').style.display = 'block';
    document.getElementById('allBugsContainer').style.display = 'none';
    document.getElementById('switchBtnReport')?.classList.add('active');
    document.getElementById('switchBtnIde')?.classList.remove('active');
    document.getElementById('switchBtnAllBugs')?.classList.remove('active');

    // Render report charts
    if (window.ReportCharts) {
      window.ReportCharts.renderAllReportCharts();
    }
  }

  openAllBugsView() {
    document.getElementById('cyberIdeContainer').style.display = 'none';
    document.getElementById('triageReportContainer').style.display = 'none';
    document.getElementById('allBugsContainer').style.display = 'block';
    document.getElementById('switchBtnAllBugs')?.classList.add('active');
    document.getElementById('switchBtnIde')?.classList.remove('active');
    document.getElementById('switchBtnReport')?.classList.remove('active');
  }
}

window.CyberEngine = CyberEngine;
