// Metas (Long-term Goals) Feature
let metasData = [];
let deleteMetaId = null;

async function loadMetas() {
  try {
    const res = await fetch('/api/metas');
    metasData = await res.json();
    renderMetas(metasData);
  } catch (e) {
    console.error('Error loading metas:', e);
  }
}

function renderMetas(metas) {
  const list = document.getElementById('metas-list');
  if (!list) return;

  if (!metas || metas.length === 0) {
    list.innerHTML = '<p class="metas-empty">Nenhuma meta de longo prazo criada ainda.<br>Crie uma meta para acompanhar seu progresso!</p>';
    return;
  }

  list.innerHTML = '';
  metas.forEach((meta, i) => {
    const card = document.createElement('div');
    card.className = 'meta-card animate-in';
    card.style.animationDelay = `${i * 0.08}s`;

    const progress = meta.targetValue > 0 ? Math.min(Math.round((meta.currentValue / meta.targetValue) * 100), 100) : 0;
    const status = calculateMetaStatus(meta);
    const daysLeft = getDaysLeft(meta.endDate);
    const deadlineText = formatDeadline(meta.startDate, meta.endDate, daysLeft);

    card.innerHTML = `
      <div class="meta-card-header">
        <span class="meta-card-icon">${meta.icon || '🎯'}</span>
        <div class="meta-card-info">
          <div class="meta-card-name">${meta.name}</div>
          <div class="meta-card-deadline">${deadlineText}</div>
        </div>
        <button class="meta-card-options" onclick="toggleMetaMenu('${meta._id}')">⋯</button>
        <div class="meta-options-menu hidden" id="meta-menu-${meta._id}">
          <button onclick="editMeta('${meta._id}')">✏️ Editar</button>
          <button onclick="requestDeleteMeta('${meta._id}')" style="color:var(--negative)">🗑️ Excluir</button>
        </div>
      </div>
      <div class="meta-progress-container">
        <div class="meta-progress-bar">
          <div class="meta-progress-fill ${status.barClass}" style="width:${progress}%"></div>
        </div>
        <div class="meta-progress-text">
          <span>${progress}% (${meta.currentValue}/${meta.targetValue} ${meta.unit})</span>
          ${!meta.linkedGoalId ? `<button onclick="incrementMeta('${meta._id}')" style="background:none;border:none;cursor:pointer;font-size:16px;padding:2px 6px;border-radius:4px;transition:all .2s" title="Incrementar +1">➕</button>` : ''}
        </div>
      </div>
      <div class="meta-card-footer">
        <span class="meta-linked">${meta.linkedGoalId ? '🔗 Vinculada a rotina diária' : '📝 Progresso manual'}</span>
        <span class="meta-status-badge ${status.badgeClass}">${status.icon} ${status.text}</span>
      </div>
    `;

    list.appendChild(card);
  });
}

function calculateMetaStatus(meta) {
  if (meta.isCompleted) {
    return { text: 'Concluída!', icon: '✅', badgeClass: 'done', barClass: 'completed' };
  }

  const today = new Date().toISOString().split('T')[0];
  if (today > meta.endDate) {
    return { text: 'Prazo expirado', icon: '⏰', badgeClass: 'expired', barClass: 'behind' };
  }

  const start = new Date(meta.startDate + 'T12:00:00');
  const end = new Date(meta.endDate + 'T12:00:00');
  const now = new Date();
  now.setHours(12, 0, 0, 0);

  const totalDays = Math.max((end - start) / (1000 * 60 * 60 * 24), 1);
  const elapsedDays = Math.max((now - start) / (1000 * 60 * 60 * 24), 0);
  const timeProgress = Math.min(elapsedDays / totalDays, 1);
  const valueProgress = meta.targetValue > 0 ? meta.currentValue / meta.targetValue : 0;

  if (valueProgress >= 1) {
    return { text: 'Concluída!', icon: '✅', badgeClass: 'done', barClass: 'completed' };
  }

  const ratio = timeProgress > 0 ? valueProgress / timeProgress : 1;

  if (ratio >= 0.8) {
    return { text: 'No ritmo!', icon: '🟢', badgeClass: 'on-track', barClass: 'on-track' };
  } else if (ratio >= 0.5) {
    return { text: 'Precisa acelerar', icon: '🟡', badgeClass: 'needs-speed', barClass: 'needs-speed' };
  } else {
    return { text: 'Atrasado', icon: '🔴', badgeClass: 'behind', barClass: 'behind' };
  }
}

function getDaysLeft(endDate) {
  const end = new Date(endDate + 'T23:59:59');
  const now = new Date();
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  return diff;
}

function formatDeadline(startDate, endDate, daysLeft) {
  const start = startDate.split('-').reverse().join('/');
  const end = endDate.split('-').reverse().join('/');
  if (daysLeft < 0) return `Prazo: ${start} → ${end} (expirado)`;
  if (daysLeft === 0) return `Prazo: ${start} → ${end} (último dia!)`;
  if (daysLeft === 1) return `Prazo: ${start} → ${end} (1 dia restante)`;
  return `Prazo: ${start} → ${end} (${daysLeft} dias restantes)`;
}

function toggleMetaMenu(id) {
  // Close all other menus
  document.querySelectorAll('.meta-options-menu').forEach(m => {
    if (m.id !== `meta-menu-${id}`) m.classList.add('hidden');
  });
  const menu = document.getElementById(`meta-menu-${id}`);
  menu.classList.toggle('hidden');
}

// Close meta menus on click outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.meta-card-options') && !e.target.closest('.meta-options-menu')) {
    document.querySelectorAll('.meta-options-menu').forEach(m => m.classList.add('hidden'));
  }
});

// Manual increment for non-linked metas
async function incrementMeta(id) {
  const meta = metasData.find(m => m._id === id);
  if (!meta || meta.isCompleted) return;

  const newValue = Math.min(meta.currentValue + 1, meta.targetValue);

  try {
    const res = await fetch(`/api/metas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentValue: newValue })
    });
    const data = await res.json();
    if (data._id) {
      loadMetas();
      // XP bonus handled server-side if completed
    }
  } catch (e) {
    console.error('Increment meta error:', e);
  }
}

// Create Meta Modal
async function openCreateMetaModal() {
  document.getElementById('meta-modal').classList.remove('hidden');
  document.getElementById('meta-modal-title').textContent = 'Criar Nova Meta';
  document.getElementById('meta-edit-id').value = '';
  document.getElementById('meta-name').value = '';
  document.getElementById('meta-icon').value = '';
  document.getElementById('meta-target').value = '';
  document.getElementById('meta-unit').value = 'vezes';

  // Set default dates
  const today = new Date().toISOString().split('T')[0];
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  document.getElementById('meta-start').value = today;
  document.getElementById('meta-end').value = nextMonth.toISOString().split('T')[0];

  // Populate linked goals dropdown
  const select = document.getElementById('meta-linked-goal');
  select.innerHTML = '<option value="">Nenhuma (progresso manual)</option>';

  try {
    const res = await fetch('/api/goals');
    const goals = await res.json();
    goals.forEach(g => {
      const opt = document.createElement('option');
      opt.value = g._id;
      opt.textContent = `${g.icon} ${g.name}`;
      select.appendChild(opt);
    });
  } catch (e) {}
}

function closeMetaModal() {
  document.getElementById('meta-modal').classList.add('hidden');
}

// Meta emoji picker
document.querySelectorAll('.meta-emoji').forEach(el => {
  el.addEventListener('click', () => {
    document.getElementById('meta-icon').value = el.dataset.emoji;
  });
});

// Meta form submit
document.getElementById('meta-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const editId = document.getElementById('meta-edit-id').value;
  const name = document.getElementById('meta-name').value.trim();
  const icon = document.getElementById('meta-icon').value || '🎯';
  const targetValue = parseInt(document.getElementById('meta-target').value);
  const unit = document.getElementById('meta-unit').value;
  const startDate = document.getElementById('meta-start').value;
  const endDate = document.getElementById('meta-end').value;
  const linkedGoalId = document.getElementById('meta-linked-goal').value || null;

  if (!name) return;
  if (!targetValue || targetValue < 1) { alert('Valor alvo deve ser pelo menos 1'); return; }
  if (!startDate || !endDate) { alert('Datas são obrigatórias'); return; }
  if (endDate < startDate) { alert('Data fim deve ser após data início'); return; }

  const body = { name, icon, targetValue, unit, startDate, endDate, linkedGoalId };

  try {
    const url = editId ? `/api/metas/${editId}` : '/api/metas';
    const method = editId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data._id || data.name) {
      closeMetaModal();
      loadMetas();
    } else if (data.error) {
      alert(data.error);
    }
  } catch (e) {
    console.error('Save meta error:', e);
  }
});

// Edit meta
async function editMeta(id) {
  const meta = metasData.find(m => m._id === id);
  if (!meta) return;

  // Close menu
  document.querySelectorAll('.meta-options-menu').forEach(m => m.classList.add('hidden'));

  document.getElementById('meta-modal').classList.remove('hidden');
  document.getElementById('meta-modal-title').textContent = 'Editar Meta';
  document.getElementById('meta-edit-id').value = id;
  document.getElementById('meta-name').value = meta.name;
  document.getElementById('meta-icon').value = meta.icon || '';
  document.getElementById('meta-target').value = meta.targetValue;
  document.getElementById('meta-unit').value = meta.unit || 'vezes';
  document.getElementById('meta-start').value = meta.startDate;
  document.getElementById('meta-end').value = meta.endDate;

  // Populate linked goals dropdown
  const select = document.getElementById('meta-linked-goal');
  select.innerHTML = '<option value="">Nenhuma (progresso manual)</option>';

  try {
    const res = await fetch('/api/goals');
    const goals = await res.json();
    goals.forEach(g => {
      const opt = document.createElement('option');
      opt.value = g._id;
      opt.textContent = `${g.icon} ${g.name}`;
      if (meta.linkedGoalId && meta.linkedGoalId === g._id) opt.selected = true;
      select.appendChild(opt);
    });
  } catch (e) {}
}

// Delete meta
function requestDeleteMeta(id) {
  deleteMetaId = id;
  document.querySelectorAll('.meta-options-menu').forEach(m => m.classList.add('hidden'));
  document.getElementById('delete-meta-confirm').classList.remove('hidden');
}

function cancelDeleteMeta() {
  deleteMetaId = null;
  document.getElementById('delete-meta-confirm').classList.add('hidden');
}

async function confirmDeleteMeta() {
  if (!deleteMetaId) return;
  try {
    const res = await fetch(`/api/metas/${deleteMetaId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      document.getElementById('delete-meta-confirm').classList.add('hidden');
      deleteMetaId = null;
      loadMetas();
    }
  } catch (e) {
    console.error('Delete meta error:', e);
  }
}
