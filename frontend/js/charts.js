/**
 * AI Bug Triage System - Chart.js Visualizations
 */

const ChartsHelper = {
  activeCharts: {},

  getChartColors() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    return {
      textColor: isLight ? '#475569' : '#94a3b8',
      gridColor: isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.06)',
      p0: '#ef4444',
      p1: '#f97316',
      p2: '#f59e0b',
      p3: '#10b981',
      p4: '#06b6d4',
      blue: '#3b82f6',
      purple: '#8b5cf6',
      indigo: '#6366f1'
    };
  },

  destroyChart(canvasId) {
    if (this.activeCharts[canvasId]) {
      this.activeCharts[canvasId].destroy();
      delete this.activeCharts[canvasId];
    }
  },

  renderSeverityChart(canvasId, severityDist) {
    const ctx = document.getElementById(canvasId);
    if (!ctx || !window.Chart) return;
    this.destroyChart(canvasId);

    const colors = this.getChartColors();
    const labels = ['P0 – Critical', 'P1 – High', 'P2 – Medium', 'P3 – Low', 'P4 – Info'];
    const data = [
      severityDist['P0'] || 0,
      severityDist['P1'] || 0,
      severityDist['P2'] || 0,
      severityDist['P3'] || 0,
      severityDist['P4'] || 0
    ];

    this.activeCharts[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: [colors.p0, colors.p1, colors.p2, colors.p3, colors.p4],
          borderColor: 'transparent',
          borderWidth: 2,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { color: colors.textColor, font: { family: 'Inter', size: 12 } }
          }
        },
        cutout: '70%'
      }
    });
  },

  renderStatusChart(canvasId, statusDist) {
    const ctx = document.getElementById(canvasId);
    if (!ctx || !window.Chart) return;
    this.destroyChart(canvasId);

    const colors = this.getChartColors();
    const labels = Object.keys(statusDist);
    const data = Object.values(statusDist);

    this.activeCharts[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Bugs in State',
          data: data,
          backgroundColor: 'rgba(99, 102, 241, 0.75)',
          hoverBackgroundColor: 'rgba(99, 102, 241, 1)',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: colors.textColor, font: { size: 11 } }
          },
          y: {
            grid: { color: colors.gridColor },
            ticks: { color: colors.textColor, stepSize: 1, precision: 0 }
          }
        }
      }
    });
  },

  renderTimelineChart(canvasId, timeline) {
    const ctx = document.getElementById(canvasId);
    if (!ctx || !window.Chart) return;
    this.destroyChart(canvasId);

    const colors = this.getChartColors();
    const labels = timeline.map(t => t.date);
    const data = timeline.map(t => t.bugs);

    this.activeCharts[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Bugs Reported',
          data: data,
          borderColor: colors.purple,
          backgroundColor: 'rgba(139, 92, 246, 0.15)',
          fill: true,
          tension: 0.35,
          pointBackgroundColor: colors.purple,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: colors.textColor, font: { size: 11 } }
          },
          y: {
            grid: { color: colors.gridColor },
            ticks: { color: colors.textColor, stepSize: 2, precision: 0 }
          }
        }
      }
    });
  },

  renderTeamsChart(canvasId, teamsData) {
    const ctx = document.getElementById(canvasId);
    if (!ctx || !window.Chart) return;
    this.destroyChart(canvasId);

    const colors = this.getChartColors();
    const labels = teamsData.map(t => t.team_name.replace(' Team', ''));
    const data = teamsData.map(t => t.count);
    const bgColors = teamsData.map(t => t.color || colors.blue);

    this.activeCharts[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Active Bugs',
          data: data,
          backgroundColor: bgColors,
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            grid: { color: colors.gridColor },
            ticks: { color: colors.textColor, precision: 0 }
          },
          y: {
            grid: { display: false },
            ticks: { color: colors.textColor, font: { size: 11 } }
          }
        }
      }
    });
  },

  renderAccuracyChart(canvasId, metrics) {
    const ctx = document.getElementById(canvasId);
    if (!ctx || !window.Chart) return;
    this.destroyChart(canvasId);

    const colors = this.getChartColors();
    this.activeCharts[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Helpful Fixes', 'Adjustments Requested'],
        datasets: [{
          data: [metrics.helpful, metrics.unhelpful],
          backgroundColor: [colors.p3, colors.p1],
          borderColor: 'transparent',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: colors.textColor, font: { size: 11 } }
          }
        },
        cutout: '65%'
      }
    });
  }
};

window.ChartsHelper = ChartsHelper;
