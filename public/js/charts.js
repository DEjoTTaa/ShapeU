let evolutionChart = null, comparisonChart = null, distributionChart = null;
let currentStatsPeriod = 'daily';

function getThemeColors() {
  const style = getComputedStyle(document.documentElement);
  return {
    primary: style.getPropertyValue('--primary').trim(),
    primaryLight: style.getPropertyValue('--primary-light').trim(),
    primaryRgb: style.getPropertyValue('--primary-rgb').trim(),
  };
}

async function loadStats(period) {
  currentStatsPeriod = period;
  await Promise.all([
    loadSummary(period),
    loadStrengths(period),
    loadEvolutionChart(period),
    loadComparisonChart(period),
    loadDistributionChart(period),
    loadHeatmap(period),
    loadAnalysis(period)
  ]);
}

async function loadSummary(period) {
  try {
    const res = await fetch(`/api/stats/summary?period=${period}`);
    const d = await res.json();

    const rateCard = document.getElementById('summary-rate');
    rateCard.querySelector('.summary-value').textContent = d.completionRate + '%';
    const changeEl = rateCard.querySelector('.summary-change');
    if (d.rateChange > 0) {
      changeEl.textContent = `↑ +${d.rateChange}% vs anterior`;
      changeEl.className = 'summary-change up';
      rateCard.className = 'summary-card positive';
    } else if (d.rateChange < 0) {
      changeEl.textContent = `↓ ${d.rateChange}% vs anterior`;
      changeEl.className = 'summary-change down';
      rateCard.className = 'summary-card negative';
    } else {
      changeEl.textContent = '→ estável';
      changeEl.className = 'summary-change';
      rateCard.className = 'summary-card';
    }

    const streakCard = document.getElementById('summary-streak');
    streakCard.querySelector('.summary-value').textContent = `🔥 ${d.bestStreak.days}`;
    streakCard.querySelector('.summary-sublabel').textContent = d.bestStreak.goalName;

    const totalCard = document.getElementById('summary-total');
    totalCard.querySelector('.summary-value').textContent = d.totalCompleted;
    totalCard.querySelector('.summary-sublabel').textContent = 'metas neste período';

    const conCard = document.getElementById('summary-consistency');
    const stars = '★'.repeat(d.consistency) + '☆'.repeat(5 - d.consistency);
    conCard.querySelector('.summary-value').textContent = stars;
    conCard.querySelector('.summary-sublabel').textContent = d.consistencyLabel;
  } catch (e) {
    console.error('Summary error:', e);
  }
}

async function loadStrengths(period) {
  try {
    const res = await fetch(`/api/stats/strengths?period=${period}`);
    const d = await res.json();

    const sList = document.getElementById('strengths-list');
    const iList = document.getElementById('improvements-list');
    sList.innerHTML = '';
    iList.innerHTML = '';

    (d.strengths || []).forEach(g => {
      sList.innerHTML += `<div class="strength-item good">
        <span>${g.icon} ${g.name}</span>
        <span class="strength-rate good">${g.rate}% ↑</span>
      </div>`;
    });

    (d.improvements || []).forEach(g => {
      iList.innerHTML += `<div class="strength-item bad">
        <span>${g.icon} ${g.name}</span>
        <span class="strength-rate bad">${g.rate}% ↓</span>
      </div>`;
    });

    (d.neutral || []).forEach(g => {
      iList.innerHTML += `<div class="strength-item neutral">
        <span>${g.icon} ${g.name}</span>
        <span class="strength-rate neutral">${g.rate}%</span>
      </div>`;
    });

    if (!d.strengths?.length) sList.innerHTML = '<p style="color:#666;font-size:13px">Nenhum ponto forte ainda</p>';
    if (!d.improvements?.length && !d.neutral?.length) iList.innerHTML = '<p style="color:#666;font-size:13px">Tudo ótimo!</p>';
  } catch (e) {}
}

async function loadEvolutionChart(period) {
  try {
    const res = await fetch(`/api/stats/charts?period=${period}&type=evolution`);
    const d = await res.json();
    if (evolutionChart) evolutionChart.destroy();
    const ctx = document.getElementById('evolution-chart');
    if (!ctx) return;
    const { primaryRgb, primary } = getThemeColors();
    evolutionChart = new Chart(ctx, {
      type: d.type || 'bar',
      data: {
        labels: d.labels || [],
        datasets: [{
          label: 'Conclusão %',
          data: d.data || [],
          backgroundColor: (d.data||[]).map(v => v >= (d.average||50) ? 'rgba(0,230,118,0.6)' : 'rgba(255,82,82,0.6)'),
          borderColor: primary,
          borderWidth: d.type==='line'?2:0,
          borderRadius: 6, tension: .3, fill: d.type==='line',
          pointBackgroundColor: primary, pointRadius: d.type==='line'?4:0
        }]
      },
      options: chartOptions()
    });
  } catch (e) {}
}

async function loadComparisonChart(period) {
  try {
    const res = await fetch(`/api/stats/charts?period=${period}&type=comparison`);
    const d = await res.json();
    if (comparisonChart) comparisonChart.destroy();
    const ctx = document.getElementById('comparison-chart');
    if (!ctx) return;
    comparisonChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: d.labels || [],
        datasets: [
          { label: 'Atual', data: d.current || [], backgroundColor: 'rgba(0,230,118,0.6)', borderRadius: 6 },
          { label: 'Anterior', data: d.previous || [], backgroundColor: 'rgba(255,82,82,0.4)', borderRadius: 6 }
        ]
      },
      options: chartOptions()
    });
  } catch (e) {}
}

async function loadDistributionChart(period) {
  try {
    const res = await fetch(`/api/stats/charts?period=${period}&type=distribution`);
    const d = await res.json();
    if (distributionChart) distributionChart.destroy();
    const ctx = document.getElementById('distribution-chart');
    if (!ctx) return;
    const avg = d.data?.length ? Math.round(d.data.reduce((s,v)=>s+v,0)/d.data.length) : 0;
    distributionChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: d.labels || [],
        datasets: [{
          data: d.data || [],
          backgroundColor: d.colors || [],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 1000, easing: 'easeOutQuart' },
        plugins: {
          legend: { position: 'bottom', labels: { color: '#B0B0B0', font: { size: 11, family: 'Inter' }, padding: 12 }},
          tooltip: {
            backgroundColor: 'rgba(20,20,20,0.95)',
            titleColor: '#fff', bodyColor: '#B0B0B0',
            cornerRadius: 8, padding: 10,
          }
        },
        cutout: '65%'
      },
      plugins: [{
        id: 'centerText',
        afterDraw(chart) {
          const {ctx: c, width, height} = chart;
          c.save();
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          c.fillStyle = '#fff';
          c.font = "bold 24px 'Inter', sans-serif";
          c.fillText(avg + '%', width/2, height/2 - 8);
          c.font = "12px 'Inter', sans-serif";
          c.fillStyle = '#B0B0B0';
          c.fillText('média', width/2, height/2 + 14);
          c.restore();
        }
      }]
    });
  } catch (e) {}
}

async function loadHeatmap(period) {
  try {
    const res = await fetch(`/api/stats/charts?period=${period}&type=heatmap`);
    const d = await res.json();
    const container = document.getElementById('heatmap-container');
    if (!container) return;

    const start = new Date(d.startDate + 'T12:00:00');
    const end = new Date(d.endDate + 'T12:00:00');
    const dayLabels = ['', 'Seg', '', 'Qua', '', 'Sex', ''];

    let html = '<div style="display:flex"><div class="heatmap-labels">';
    dayLabels.forEach(l => html += `<div class="heatmap-label">${l}</div>`);
    html += '</div><div class="heatmap-grid">';

    const cur = new Date(start);
    cur.setDate(cur.getDate() - cur.getDay());

    while (cur <= end) {
      html += '<div class="heatmap-week">';
      for (let dow = 0; dow < 7; dow++) {
        const dateStr = cur.toISOString().split('T')[0];
        const rate = d.data[dateStr];
        let rateClass = 'none';
        if (rate !== undefined) {
          if (rate === 100) rateClass = '100';
          else if (rate >= 70) rateClass = 'high';
          else if (rate >= 50) rateClass = 'mid';
          else rateClass = 'low';
        }
        const show = cur >= start && cur <= end;
        html += `<div class="heatmap-cell" data-rate="${show ? rateClass : 'none'}" style="${show ? '' : 'visibility:hidden'}">
          ${show ? `<div class="heatmap-tooltip">${dateStr.split('-').reverse().join('/')}: ${rate !== undefined ? rate+'%' : 'Sem dados'}</div>` : ''}
        </div>`;
        cur.setDate(cur.getDate() + 1);
      }
      html += '</div>';
    }
    html += '</div></div>';
    container.innerHTML = html;
  } catch (e) {}
}

async function loadAnalysis(period) {
  try {
    const res = await fetch(`/api/ai/analysis?period=${period}`);
    const d = await res.json();
    const el = document.getElementById('analysis-text');
    if (d.analysis) typewriter(el, d.analysis, 20);
    else el.textContent = 'Continue fazendo check-ins para gerar análises!';
  } catch (e) {
    document.getElementById('analysis-text').textContent = 'Análise indisponível no momento.';
  }
}

function chartOptions() {
  const { primaryRgb } = getThemeColors();
  return {
    responsive: true, maintainAspectRatio: false,
    animation: { duration: 1000, easing: 'easeOutQuart' },
    plugins: { legend: { display: false }, tooltip: {
      backgroundColor: 'rgba(20,20,20,0.95)',
      titleColor: '#fff', bodyColor: '#B0B0B0',
      borderColor: `rgba(${primaryRgb},0.2)`, borderWidth: 1,
      cornerRadius: 8, padding: 10,
      titleFont: { family: 'Inter' },
      bodyFont: { family: 'Inter' },
    }},
    scales: {
      y: { beginAtZero: true, max: 100, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#B0B0B0', callback: v => v+'%', font: { family: 'Inter' } }},
      x: { grid: { display: false }, ticks: { color: '#B0B0B0', maxRotation: 45, font: { family: 'Inter' } }}
    }
  };
}

// Stats period selector
document.querySelectorAll('#stats-period-selector .period-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#stats-period-selector .period-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadStats(btn.dataset.period);
  });
});
