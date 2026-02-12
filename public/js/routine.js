const DAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const FREQ_LABELS = { daily: 'Diária', weekly: 'Semanal', monthly: 'Mensal', custom: 'Custom' };
let routineChart = null;

function initDaySelector() {
  const container = document.getElementById('day-selector');
  container.innerHTML = '';
  const today = new Date();
  for (let i = -3; i <= 3; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dow = d.getDay();
    const btn = document.createElement('button');
    btn.className = 'day-btn' + (i === 0 ? ' active' : '');
    btn.dataset.date = dateStr;
    btn.innerHTML = `<span>${DAYS_PT[dow]}</span><small>${d.getDate()}</small>`;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentDate = dateStr;
      loadDailyGoals(dateStr);
    });
    container.appendChild(btn);
  }
}

async function loadDailyGoals(date) {
  try {
    const res = await fetch(`/api/goals/daily?date=${date}`);
    const data = await res.json();
    renderGoals(data);
    updateProgress(data.completedCount, data.totalCount);
  } catch (e) {
    console.error('Error loading goals:', e);
  }
}

function renderGoals(data) {
  const list = document.getElementById('goals-list');
  list.innerHTML = '';

  if (!data.goals || data.goals.length === 0) {
    list.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:20px">Nenhuma meta para este dia</p>';
    return;
  }

  data.goals.forEach((goal, i) => {
    const card = document.createElement('div');
    card.className = `goal-card animate-in${goal.completed ? ' completed' : ''}`;
    card.style.animationDelay = `${i * 0.05}s`;

    const freqType = goal.frequency?.type || 'daily';
    const freqLabel = FREQ_LABELS[freqType] || freqType;
    const streakIcon = goal.currentStreak > 0 ? '🔥' : '💤';
    const streakClass = goal.currentStreak > 0 ? 'streak-fire' : '';

    card.innerHTML = `
      <div class="goal-checkbox ${goal.completed ? 'checked' : ''}" data-id="${goal._id}">
        ${goal.completed ? '✓' : ''}
      </div>
      <div class="goal-info">
        <div class="goal-name-row">
          <span class="goal-icon">${goal.icon}</span>
          <span class="goal-name">${goal.name}</span>
        </div>
        <div class="goal-streak">Streak: <span class="${streakClass}">${streakIcon}</span> ${goal.currentStreak} dias</div>
      </div>
      <div class="goal-meta">
        ${goal.time ? `<span class="goal-time">🕐 ${goal.time}</span>` : ''}
        <span class="goal-freq">${freqLabel}</span>
      </div>
    `;

    const checkbox = card.querySelector('.goal-checkbox');
    checkbox.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleGoal(goal._id, !goal.completed, checkbox);
    });

    list.appendChild(card);
  });
}

async function toggleGoal(goalId, completed, checkboxEl) {
  try {
    const res = await fetch('/api/goals/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goalId, date: state.currentDate, completed })
    });
    const data = await res.json();

    if (data.success) {
      if (completed) {
        checkboxEl.classList.add('checked');
        checkboxEl.textContent = '✓';
        checkboxEl.closest('.goal-card').classList.add('completed');
        miniConfetti(checkboxEl);

        if (data.xp_gained > 0) {
          const rect = checkboxEl.getBoundingClientRect();
          showXPFloat(data.xp_gained, rect.left, rect.top);
        }
      } else {
        checkboxEl.classList.remove('checked');
        checkboxEl.textContent = '';
        checkboxEl.closest('.goal-card').classList.remove('completed');
      }

      updateProgress(data.completed_count, data.total_count);

      // Handle level up
      if (data.level_up) {
        const titles = {1:'Iniciante',2:'Aprendiz',3:'Praticante',5:'Disciplinado',7:'Forjador de Hábitos',10:'Máquina',15:'Imparável',20:'Lendário',25:'Transcendente',30:'Mito',50:'Deus da Disciplina',100:'Ascendido'};
        let title = 'Iniciante';
        Object.keys(titles).sort((a,b)=>a-b).forEach(k=>{ if(data.new_level>=k) title=titles[k]; });
        showLevelUp(data.new_level, title);
      }

      // Handle new achievements
      if (data.new_achievements && data.new_achievements.length > 0) {
        data.new_achievements.forEach(ach => {
          queueAchievement(ach.badge, ach.xpAwarded);
        });
      }

      // Update user data
      window.USER.xp = data.new_xp;
      window.USER.level = data.new_level;
    }
  } catch (e) {
    console.error('Checkin error:', e);
  }
}

function updateProgress(completed, total) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  document.getElementById('progress-text').textContent = `${pct}% (${completed}/${total})`;
  document.getElementById('progress-fill').style.width = pct + '%';
}

async function loadMotivation() {
  try {
    const res = await fetch('/api/ai/motivation');
    const data = await res.json();
    const el = document.getElementById('motivation-text');
    if (data.quote) typewriter(el, data.quote);
    else el.textContent = 'Continue evoluindo!';
  } catch (e) {
    document.getElementById('motivation-text').textContent = 'Continue evoluindo, cada passo conta!';
  }
}

document.getElementById('refresh-motivation')?.addEventListener('click', async () => {
  try {
    const res = await fetch('/api/ai/refresh-motivation', { method: 'POST' });
    const data = await res.json();
    if (data.error) {
      alert(data.error);
      return;
    }
    const el = document.getElementById('motivation-text');
    typewriter(el, data.quote);
  } catch (e) {
    alert('Erro ao gerar frase');
  }
});

// Goal modal
function openGoalModal() {
  document.getElementById('goal-modal').classList.remove('hidden');
  document.getElementById('goal-name').value = '';
  document.getElementById('goal-icon').value = '';
  document.getElementById('goal-time').value = '';
  document.querySelector('input[name="frequency"][value="daily"]').checked = true;
  document.getElementById('freq-days').classList.add('hidden');
  document.getElementById('freq-custom').classList.add('hidden');
  document.querySelectorAll('.day-chip').forEach(c => c.classList.remove('selected'));
}

function closeGoalModal() {
  document.getElementById('goal-modal').classList.add('hidden');
}

document.querySelectorAll('.emoji-option').forEach(el => {
  el.addEventListener('click', () => {
    document.getElementById('goal-icon').value = el.dataset.emoji;
  });
});

document.querySelectorAll('input[name="frequency"]').forEach(radio => {
  radio.addEventListener('change', () => {
    const v = radio.value;
    document.getElementById('freq-days').classList.toggle('hidden', v !== 'weekly' && v !== 'custom');
    document.getElementById('freq-custom').classList.toggle('hidden', v !== 'custom');
  });
});

document.querySelectorAll('.day-chip').forEach(chip => {
  chip.addEventListener('click', () => chip.classList.toggle('selected'));
});

document.getElementById('goal-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('goal-name').value.trim();
  if (!name) return;

  const icon = document.getElementById('goal-icon').value || '🎯';
  const time = document.getElementById('goal-time').value;
  const freqType = document.querySelector('input[name="frequency"]:checked').value;

  const frequency = { type: freqType };
  if (freqType === 'weekly' || freqType === 'custom') {
    frequency.specificDays = [...document.querySelectorAll('.day-chip.selected')].map(c => c.dataset.day);
  }
  if (freqType === 'custom') {
    frequency.daysPerWeek = parseInt(document.getElementById('freq-days-per-week').value) || 3;
  }

  try {
    const res = await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, icon, time, frequency })
    });
    const data = await res.json();
    if (data._id) {
      closeGoalModal();
      loadDailyGoals(state.currentDate);
    }
  } catch (e) {
    console.error('Create goal error:', e);
  }
});

// Routine chart
async function loadRoutineChart(period) {
  try {
    const res = await fetch(`/api/stats/charts?period=${period}&type=evolution`);
    const data = await res.json();

    if (routineChart) routineChart.destroy();

    const ctx = document.getElementById('routine-chart');
    if (!ctx) return;

    routineChart = new Chart(ctx, {
      type: data.type || 'bar',
      data: {
        labels: data.labels || [],
        datasets: [{
          label: 'Taxa de Conclusão (%)',
          data: data.data || [],
          backgroundColor: data.data?.map(v => v >= (data.average||50) ? 'rgba(212,175,55,0.7)' : 'rgba(212,175,55,0.3)') || [],
          borderColor: 'rgba(212,175,55,1)',
          borderWidth: data.type === 'line' ? 2 : 0,
          borderRadius: 4,
          fill: data.type === 'line',
          tension: 0.3,
          pointBackgroundColor: 'rgba(212,175,55,1)',
          pointRadius: data.type === 'line' ? 4 : 0,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 1000, easing: 'easeOutQuart' },
        plugins: { legend: { display: false }, tooltip: {
          backgroundColor: '#1A1A1A', titleColor: '#fff', bodyColor: '#B0B0B0',
          borderColor: '#333', borderWidth: 1
        }},
        scales: {
          y: { beginAtZero: true, max: 100, grid: { color: '#333' }, ticks: { color: '#B0B0B0', callback: v => v + '%' }},
          x: { grid: { display: false }, ticks: { color: '#B0B0B0' }}
        }
      }
    });
  } catch (e) {
    console.error('Chart error:', e);
  }
}

document.querySelectorAll('#routine-period-selector .period-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#routine-period-selector .period-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadRoutineChart(btn.dataset.period);
  });
});

// Load initial chart
setTimeout(() => loadRoutineChart('daily'), 500);
