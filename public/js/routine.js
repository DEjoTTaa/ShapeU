const DAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const FREQ_LABELS = { daily: 'Diária', weekly: 'Semanal', monthly: 'Mensal', custom: 'Custom' };
let routineChart = null;
let checkinInProgress = {};
let weekOffset = 0;

function getWeekDays(offset) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dow === 0 ? 7 : dow) - 1) + (offset * 7));
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }
  return days;
}

function initDaySelector() {
  renderWeek(weekOffset);
}

function renderWeek(offset) {
  const container = document.getElementById('day-selector');
  if (!container) return;
  container.innerHTML = '';

  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];
  const days = getWeekDays(offset);

  // Disable forward button if already on current week
  const nextBtn = document.getElementById('week-next-btn');
  if (nextBtn) {
    nextBtn.disabled = offset >= 0;
    nextBtn.classList.toggle('disabled', offset >= 0);
  }

  days.forEach(d => {
    const dateStr = d.toISOString().split('T')[0];
    const dow = d.getDay();
    const isToday = dateStr === todayStr;
    const isSelected = dateStr === state.currentDate;
    const btn = document.createElement('button');
    btn.className = 'day-btn' + (isSelected ? ' active' : '') + (isToday && !isSelected ? ' today' : '');
    btn.dataset.date = dateStr;
    btn.innerHTML = `<span>${DAYS_PT[dow]}</span><small>${d.getDate()}</small>`;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.day-btn').forEach(b => {
        b.classList.remove('active');
        // Restore today highlight if it lost it
        if (b.dataset.date === todayStr) b.classList.add('today');
      });
      btn.classList.add('active');
      btn.classList.remove('today');
      state.currentDate = dateStr;
      loadDailyGoals(dateStr);
    });
    container.appendChild(btn);
  });
}

function navigateWeek(direction) {
  if (direction > 0 && weekOffset >= 0) return;
  weekOffset += direction;
  renderWeek(weekOffset);
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

// Debounced check-in to prevent double clicks
async function toggleGoal(goalId, completed, checkboxEl) {
  // Prevent double-click
  if (checkinInProgress[goalId]) return;
  checkinInProgress[goalId] = true;

  try {
    const res = await fetch('/api/goals/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goalId, date: state.currentDate, completed })
    });
    const data = await res.json();

    if (data.success) {
      const card = checkboxEl.closest('.goal-card');

      if (completed) {
        checkboxEl.classList.add('checked');
        checkboxEl.textContent = '✓';
        card.classList.add('completed');
        miniConfetti(checkboxEl);

        card.classList.add('goal-flash');
        setTimeout(() => card.classList.remove('goal-flash'), 400);

        if (data.xp_gained > 0) {
          const rect = checkboxEl.getBoundingClientRect();
          showXPFloat(data.xp_gained, rect.left, rect.top);
        }
      } else {
        checkboxEl.classList.remove('checked');
        checkboxEl.textContent = '';
        card.classList.remove('completed');
      }

      updateProgress(data.completed_count, data.total_count);

      if (data.level_up) {
        const titles = {1:'Iniciante',2:'Aprendiz',3:'Praticante',5:'Disciplinado',7:'Forjador de Hábitos',10:'Máquina',15:'Imparável',20:'Lendário',25:'Transcendente',30:'Mito',50:'Deus da Disciplina',100:'Ascendido'};
        let title = 'Iniciante';
        Object.keys(titles).sort((a,b)=>a-b).forEach(k=>{ if(data.new_level>=k) title=titles[k]; });
        showLevelUp(data.new_level, title);
      }

      if (data.new_achievements && data.new_achievements.length > 0) {
        data.new_achievements.forEach(ach => {
          queueAchievement(ach.badge, ach.xpAwarded);
        });
      }

      window.USER.xp = data.new_xp;
      window.USER.level = data.new_level;

      // Refresh metas after checkin (debounced)
      setTimeout(() => {
        if (typeof loadMetas === 'function') loadMetas();
      }, 300);
    }
  } catch (e) {
    console.error('Checkin error:', e);
  } finally {
    // Release lock after short delay to prevent rapid re-clicks
    setTimeout(() => { delete checkinInProgress[goalId]; }, 500);
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

// Manage goals modal
let deleteGoalId = null;

async function openManageGoals() {
  document.getElementById('manage-goals-modal').classList.remove('hidden');
  const list = document.getElementById('manage-goals-list');
  list.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:20px">Carregando...</p>';

  try {
    const res = await fetch('/api/goals');
    const goals = await res.json();

    if (!goals || goals.length === 0) {
      list.innerHTML = '<p style="text-align:center;color:var(--text-secondary);padding:20px">Nenhuma meta criada ainda</p>';
      return;
    }

    list.innerHTML = '';
    goals.forEach(goal => {
      const item = document.createElement('div');
      item.className = 'manage-goal-item';
      const freqType = goal.frequency?.type || 'daily';
      const freqLabel = FREQ_LABELS[freqType] || freqType;
      item.innerHTML = `
        <div class="manage-goal-info">
          <span style="font-size:20px">${goal.icon || '🎯'}</span>
          <div>
            <div style="font-weight:500;color:var(--text)">${goal.name}</div>
            <div style="font-size:11px;color:var(--text-secondary)">${freqLabel}${goal.time ? ' · 🕐 ' + goal.time : ''}</div>
          </div>
        </div>
        <div class="manage-goal-actions">
          <button title="Excluir" onclick="requestDeleteGoal('${goal._id}', '${goal.name.replace(/'/g, "\\'")}')">🗑️</button>
        </div>
      `;
      list.appendChild(item);
    });
  } catch (e) {
    list.innerHTML = '<p style="text-align:center;color:var(--negative);padding:20px">Erro ao carregar metas</p>';
  }
}

function closeManageGoals() {
  document.getElementById('manage-goals-modal').classList.add('hidden');
}

function requestDeleteGoal(id, name) {
  deleteGoalId = id;
  document.getElementById('delete-goal-name').textContent = name;
  document.getElementById('delete-goal-confirm').classList.remove('hidden');
}

function cancelDeleteGoal() {
  deleteGoalId = null;
  document.getElementById('delete-goal-confirm').classList.add('hidden');
}

async function confirmDeleteGoal() {
  if (!deleteGoalId) return;
  try {
    const res = await fetch(`/api/goals/${deleteGoalId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      document.getElementById('delete-goal-confirm').classList.add('hidden');
      deleteGoalId = null;
      openManageGoals();
      loadDailyGoals(state.currentDate);
    }
  } catch (e) {
    console.error('Delete goal error:', e);
  }
}

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

document.querySelectorAll('.emoji-option:not(.meta-emoji)').forEach(el => {
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

    const style = getComputedStyle(document.documentElement);
    const primary = style.getPropertyValue('--primary').trim();
    const primaryRgb = style.getPropertyValue('--primary-rgb').trim();

    routineChart = new Chart(ctx, {
      type: data.type || 'bar',
      data: {
        labels: data.labels || [],
        datasets: [{
          label: 'Taxa de Conclusão (%)',
          data: data.data || [],
          backgroundColor: (data.data||[]).map(v => v >= (data.average||50) ? `rgba(${primaryRgb},0.7)` : `rgba(${primaryRgb},0.3)`),
          borderColor: primary,
          borderWidth: data.type === 'line' ? 2 : 0,
          borderRadius: 6,
          fill: data.type === 'line',
          tension: 0.3,
          pointBackgroundColor: primary,
          pointRadius: data.type === 'line' ? 4 : 0,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 800, easing: 'easeOutQuart' },
        plugins: { legend: { display: false }, tooltip: {
          backgroundColor: 'rgba(20,20,20,0.95)',
          titleColor: '#fff', bodyColor: '#B0B0B0',
          borderColor: `rgba(${primaryRgb},0.2)`, borderWidth: 1,
          cornerRadius: 8,
          padding: 10,
        }},
        scales: {
          y: { beginAtZero: true, max: 100, grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#B0B0B0', callback: v => v + '%' }},
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

// Load initial chart with slight delay to prioritize content
setTimeout(() => loadRoutineChart('daily'), 400);
