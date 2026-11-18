/**
 * AI Bug Triage System v1.0 - Report Charts Renderer
 * Implements the exact charts and HUD telemetry from Screenshots 4 & 6:
 * 1. Bugs Detected vs. Resolved (Multi-color bar chart + orange trendline)
 * 2. Severity Breakdown (Cyber Donut with Critical, Major, Minor, Info + callout counts)
 * 3. System Health (Speedometer radial gauge at 98% + glowing sparkline)
 * 4. Augs Hugel Trindown (Sine waveform with 47.91%, 39.93%, 53.39% peak nodes)
 * 5. System Health Timeline (Green neon filled area chart over Feb-Fet)
 * 6. Telemetry Metrics (Analysis Time: 1.2s, Fix Efficiency: 100%, Security Score: A+)
 */

const ReportCharts = {
  instances: {},

  renderAllReportCharts() {
    this.renderBugsDetectedVsResolved();
    this.renderSeverityBreakdown();
    this.renderSystemHealthGauge();
    this.renderAugsHugelTrindown();
    this.renderSystemHealthTimeline();
    this.renderTelemetryMetrics();
  },

  // 1. Bugs Detected vs. Resolved (Screenshot 4 & 6 - Top Left)
  renderBugsDetectedVsResolved() {
    const canvas = document.getElementById('chartBugsDetectedReport');
    if (!canvas) return;

    if (this.instances.bugsDetected) {
      this.instances.bugsDetected.destroy();
    }

    const months = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
    const detectedData = [32, 45, 58, 62, 40, 75, 88, 70, 92, 105, 82, 95];
    const resolvedData = [28, 41, 52, 59, 38, 71, 84, 67, 89, 101, 80, 94];

    // Colorful gradient bars matching screenshot
    const barColors = [
      '#00f0ff', '#f97316', '#3b82f6', '#ef4444', '#10b981',
      '#8b5cf6', '#00f0ff', '#f59e0b', '#06b6d4', '#ec4899', '#10b981', '#00f0ff'
    ];

    const ctx = canvas.getContext('2d');
    this.instances.bugsDetected = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [
          {
            type: 'line',
            label: 'Resolved Bugs (Trendline)',
            data: resolvedData,
            borderColor: '#f97316',
            backgroundColor: '#f97316',
            borderWidth: 2.5,
            pointBackgroundColor: '#f97316',
            pointBorderColor: '#ffffff',
            pointRadius: 4,
            pointHoverRadius: 6,
            tension: 0.35,
            order: 1
          },
          {
            type: 'bar',
            label: 'Detected Bugs',
            data: detectedData,
            backgroundColor: barColors,
            borderRadius: 4,
            borderSkipped: false,
            order: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#94a3b8',
              font: { family: "'Inter', sans-serif", size: 11 }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            borderColor: '#00f0ff',
            borderWidth: 1,
            titleColor: '#00f0ff',
            bodyColor: '#f1f5f9'
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#64748b', font: { size: 10 } }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#64748b', font: { size: 10 } }
          }
        }
      }
    });
  },

  // 2. Severity Breakdown Donut (Screenshot 4 & 6 - Top Center)
  renderSeverityBreakdown() {
    const canvas = document.getElementById('chartSeverityBreakdownReport');
    if (!canvas) return;

    if (this.instances.severityBreakdown) {
      this.instances.severityBreakdown.destroy();
    }

    const ctx = canvas.getContext('2d');
    this.instances.severityBreakdown = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Critical (P0)', 'Major (P1)', 'Minor (P2)', 'Info (P3)'],
        datasets: [{
          data: [35, 28, 22, 15],
          backgroundColor: [
            '#ef4444', // Red
            '#10b981', // Green
            '#8b5cf6', // Purple
            '#f59e0b'  // Yellow
          ],
          borderColor: '#0b1329',
          borderWidth: 3,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#94a3b8',
              font: { family: "'JetBrains Mono', monospace", size: 11 },
              boxWidth: 12
            }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            borderColor: '#38bdf8',
            borderWidth: 1
          }
        }
      }
    });
  },

  // 3. System Health Speedometer Radial Gauge at 98% (Screenshot 4 & 6 - Top Right)
  renderSystemHealthGauge() {
    const canvas = document.getElementById('chartHealthGaugeReport');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.parentElement.clientWidth || 280;
    const height = canvas.height = 190;

    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height - 25;
    const radius = Math.min(centerX - 20, 110);

    // Draw background arc (dark track)
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, 2 * Math.PI, false);
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#1e293b';
    ctx.lineCap = 'round';
    ctx.stroke();

    // Draw glowing health arc (Cyan to Neon Green up to 98%)
    const healthPercent = 0.98;
    const endAngle = Math.PI + (Math.PI * healthPercent);

    const grad = ctx.createLinearGradient(centerX - radius, centerY, centerX + radius, centerY);
    grad.addColorStop(0, '#00f0ff');
    grad.addColorStop(0.5, '#10b981');
    grad.addColorStop(1, '#00ff88');

    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, endAngle, false);
    ctx.lineWidth = 14;
    ctx.strokeStyle = grad;
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 12;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();

    // Draw ticks around the dial
    for (let i = 0; i <= 10; i++) {
      const tickAngle = Math.PI + (i / 10) * Math.PI;
      const x1 = centerX + Math.cos(tickAngle) * (radius - 16);
      const y1 = centerY + Math.sin(tickAngle) * (radius - 16);
      const x2 = centerX + Math.cos(tickAngle) * (radius - 23);
      const y2 = centerY + Math.sin(tickAngle) * (radius - 23);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineWidth = i % 2 === 0 ? 2 : 1;
      ctx.strokeStyle = i >= 8 ? '#10b981' : '#64748b';
      ctx.stroke();
    }

    // Draw Gauge Needle pointing towards 98%
    const needleAngle = Math.PI + (Math.PI * healthPercent);
    const needleLength = radius - 18;
    const nx = centerX + Math.cos(needleAngle) * needleLength;
    const ny = centerY + Math.sin(needleAngle) * needleLength;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(nx, ny);
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#ffffff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Needle center pivot hub
    ctx.beginPath();
    ctx.arc(centerX, centerY, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#00f0ff';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();

    // Digital readout 98%
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('98%', centerX, centerY - 35);

    ctx.fillStyle = '#00ff88';
    ctx.font = '10px "Inter", sans-serif';
    ctx.fillText('OPTIMAL STABILITY', centerX, centerY - 18);

    // Draw mini glowing sparkline underneath
    const sparkCanvas = document.getElementById('chartHealthSparkline');
    if (sparkCanvas) {
      const sCtx = sparkCanvas.getContext('2d');
      const sW = sparkCanvas.width = sparkCanvas.parentElement.clientWidth || 220;
      const sH = sparkCanvas.height = 36;
      sCtx.clearRect(0, 0, sW, sH);

      sCtx.beginPath();
      const points = [15, 12, 18, 14, 22, 16, 25, 20, 28, 22, 30, 27, 32];
      const step = sW / (points.length - 1);

      points.forEach((val, idx) => {
        const x = idx * step;
        const y = sH - val;
        if (idx === 0) sCtx.moveTo(x, y);
        else sCtx.lineTo(x, y);
      });

      sCtx.strokeStyle = '#00ff88';
      sCtx.lineWidth = 2;
      sCtx.shadowColor = '#00ff88';
      sCtx.shadowBlur = 6;
      sCtx.stroke();
    }
  },

  // 4. Augs Hugel Trindown (Sine Waveform with 47.91%, 39.93%, 53.39% nodes - Screenshot 4 & 6)
  renderAugsHugelTrindown() {
    const canvas = document.getElementById('chartTrindownReport');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.parentElement.clientWidth || 550;
    const height = canvas.height = 200;

    ctx.clearRect(0, 0, width, height);

    // Draw subtle grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let y = 20; y < height; y += 35) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Sine waveform mathematical path
    const points = [];
    const step = 4;
    for (let x = 0; x <= width; x += step) {
      const t = (x / width) * Math.PI * 4.2;
      const y = (height / 2) + Math.sin(t) * 45 + Math.cos(t * 0.6) * 15;
      points.push({ x, y });
    }

    // Waveform glow and gradient
    const grad = ctx.createLinearGradient(0, 0, width, 0);
    grad.addColorStop(0, '#00f0ff');
    grad.addColorStop(0.35, '#8b5cf6');
    grad.addColorStop(0.7, '#ec4899');
    grad.addColorStop(1, '#00ff88');

    ctx.save();
    ctx.beginPath();
    points.forEach((p, idx) => {
      if (idx === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.strokeStyle = grad;
    ctx.lineWidth = 3;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.restore();

    // 3 Highlight Nodes with labels matching screenshot: 47.91%, 39.93%, 53.39%
    const peakNodes = [
      { x: width * 0.22, y: height * 0.28, label: '47.91%' },
      { x: width * 0.52, y: height * 0.35, label: '39.93%' },
      { x: width * 0.82, y: height * 0.22, label: '53.39%' }
    ];

    peakNodes.forEach(node => {
      // Outer glow pulse circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 12;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(node.x, node.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#00f0ff';
      ctx.fill();

      // Tooltip pill tag
      const text = node.label;
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      const textWidth = ctx.measureText(text).width;
      const boxW = textWidth + 14;
      const boxH = 20;
      const boxX = node.x - boxW / 2;
      const boxY = node.y - 28;

      ctx.fillStyle = 'rgba(11, 19, 41, 0.9)';
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#00f0ff';
      ctx.textAlign = 'center';
      ctx.fillText(text, node.x, boxY + 14);
    });
  },

  // 5. System Health Timeline (Green Area Chart over Feb-Fet - Screenshot 4 & 6)
  renderSystemHealthTimeline() {
    const canvas = document.getElementById('chartHealthTimelineReport');
    if (!canvas) return;

    if (this.instances.healthTimeline) {
      this.instances.healthTimeline.destroy();
    }

    const labels = ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Fet'];
    const dataPoints = [82, 85, 89, 87, 92, 94, 91, 96, 98];

    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 180);
    gradient.addColorStop(0, 'rgba(0, 255, 136, 0.45)');
    gradient.addColorStop(1, 'rgba(0, 255, 136, 0.0)');

    this.instances.healthTimeline = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Health Metric (%)',
          data: dataPoints,
          borderColor: '#00ff88',
          borderWidth: 2.5,
          fill: true,
          backgroundColor: gradient,
          tension: 0.4,
          pointBackgroundColor: '#00ff88',
          pointBorderColor: '#ffffff',
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            borderColor: '#00ff88',
            borderWidth: 1,
            titleColor: '#00ff88'
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#64748b', font: { size: 10 } }
          },
          y: {
            min: 70,
            max: 100,
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: {
              color: '#64748b',
              font: { size: 10 },
              callback: (val) => val + '%'
            }
          }
        }
      }
    });
  },

  // 6. Telemetry Metrics Card (Screenshot 4 & 6 - Bottom Right)
  renderTelemetryMetrics() {
    const el = document.getElementById('reportTelemetryContainer');
    if (!el) return;

    fetch('/api/triage/report-telemetry')
      .then(res => res.json())
      .then(data => {
        el.innerHTML = `
          <div class="telemetry-hud-card">
            <div class="telemetry-item">
              <span class="telemetry-label">Analysis Time:</span>
              <span class="telemetry-val" style="color: var(--cyan-neon);">${data.analysis_time || '1.2s'}</span>
            </div>
            <div class="telemetry-item">
              <span class="telemetry-label">Fix Efficiency:</span>
              <span class="telemetry-val" style="color: var(--green-neon);">${data.fix_efficiency || '100%'}</span>
            </div>
            <div class="telemetry-item">
              <span class="telemetry-label">Security Score:</span>
              <span class="telemetry-val" style="color: var(--green-neon);">${data.security_score || 'A+'}</span>
            </div>
            <div class="telemetry-item">
              <span class="telemetry-label">Database Status:</span>
              <span class="telemetry-val" style="color: #38bdf8;">${data.database_engine || 'MySQL Active'}</span>
            </div>
            <div class="telemetry-item">
              <span class="telemetry-label">Assigned Team:</span>
              <span class="telemetry-val" style="color: var(--purple-neon);">${data.assigned_team || 'Backend API Team'}</span>
            </div>
          </div>
        `;
      })
      .catch(() => {
        el.innerHTML = `
          <div class="telemetry-hud-card">
            <div class="telemetry-item">
              <span class="telemetry-label">Analysis Time:</span>
              <span class="telemetry-val" style="color: var(--cyan-neon);">1.2s</span>
            </div>
            <div class="telemetry-item">
              <span class="telemetry-label">Fix Efficiency:</span>
              <span class="telemetry-val" style="color: var(--green-neon);">100%</span>
            </div>
            <div class="telemetry-item">
              <span class="telemetry-label">Security Score:</span>
              <span class="telemetry-val" style="color: var(--green-neon);">A+</span>
            </div>
          </div>
        `;
      });
  }
};

window.ReportCharts = ReportCharts;
