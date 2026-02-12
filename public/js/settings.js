function toggleSettings() {
  const panel = document.getElementById('settings-panel');
  const backdrop = document.getElementById('settings-backdrop');
  panel.classList.toggle('hidden');
  backdrop.classList.toggle('hidden');
}

// Avatar upload
document.getElementById('avatar-upload')?.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { alert('Imagem muito grande. Máximo 2MB.'); return; }

  const formData = new FormData();
  formData.append('avatar', file);

  try {
    const res = await fetch('/api/profile/avatar', { method: 'PUT', body: formData });
    const data = await res.json();
    if (data.success) {
      location.reload();
    }
  } catch (e) { alert('Erro ao fazer upload'); }
});

// Predefined avatars
document.querySelectorAll('#predefined-avatars .avatar-option').forEach(el => {
  el.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/profile/avatar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'predefined', value: el.dataset.value })
      });
      const data = await res.json();
      if (data.success) {
        document.querySelectorAll('#predefined-avatars .avatar-option').forEach(a => a.classList.remove('selected'));
        el.classList.add('selected');
        updateAvatarDisplay(data.avatar);
      }
    } catch (e) { alert('Erro ao alterar avatar'); }
  });
});

// Unlockable avatars
document.querySelectorAll('#unlockable-avatars .avatar-option:not(.locked)').forEach(el => {
  el.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/profile/avatar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'unlockable', value: el.dataset.value })
      });
      const data = await res.json();
      if (data.success) updateAvatarDisplay(data.avatar);
    } catch (e) { alert('Erro ao alterar avatar'); }
  });
});

function updateAvatarDisplay(avatar) {
  const btn = document.getElementById('avatar-btn');
  const settingsAvatar = document.getElementById('settings-avatar');

  if (avatar.type === 'custom') {
    btn.innerHTML = `<img src="${avatar.value}" alt="Avatar" class="avatar-img" />`;
    settingsAvatar.innerHTML = `<img src="${avatar.value}" alt="Avatar" class="settings-avatar-img" />`;
  } else {
    btn.innerHTML = `<span class="avatar-emoji">${avatar.value}</span>`;
    settingsAvatar.innerHTML = `<span class="settings-avatar-emoji">${avatar.value}</span>`;
  }
}

// Theme selector
document.querySelectorAll('.theme-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const theme = btn.dataset.theme;
    try {
      const res = await fetch('/api/profile/theme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme })
      });
      const data = await res.json();
      if (data.success) {
        document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        applyTheme(theme);
        window.USER.theme = theme;
      }
    } catch (e) { alert('Erro ao alterar tema'); }
  });
});

// Password modal
function openPasswordModal() {
  document.getElementById('password-modal').classList.remove('hidden');
}
function closePasswordModal() {
  document.getElementById('password-modal').classList.add('hidden');
}

document.getElementById('password-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const currentPassword = document.getElementById('current-password').value;
  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;

  if (newPassword !== confirmPassword) { alert('Senhas não conferem'); return; }
  if (newPassword.length < 6) { alert('Nova senha deve ter pelo menos 6 caracteres'); return; }

  try {
    const res = await fetch('/api/profile/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
    });
    const data = await res.json();
    if (data.success) {
      alert('Senha alterada com sucesso!');
      closePasswordModal();
      e.target.reset();
    } else {
      alert(data.error || 'Erro ao alterar senha');
    }
  } catch (e) { alert('Erro ao alterar senha'); }
});

// Manage goals
async function openManageGoals() {
  document.getElementById('manage-goals-modal').classList.remove('hidden');
  try {
    const res = await fetch('/api/goals');
    const goals = await res.json();
    const list = document.getElementById('manage-goals-list');
    list.innerHTML = '';
    goals.forEach(goal => {
      const freqLabels = { daily: 'Diária', weekly: 'Semanal', monthly: 'Mensal', custom: 'Custom' };
      const freq = goal.frequency?.type || 'daily';
      const div = document.createElement('div');
      div.className = 'manage-goal-item';
      div.innerHTML = `
        <div class="manage-goal-info">
          <span>${goal.icon} ${goal.name}</span>
          <small style="color:var(--text-secondary);margin-left:8px">${freqLabels[freq]}</small>
        </div>
        <div class="manage-goal-actions">
          <button onclick="deleteGoal('${goal._id}', this)" title="Remover">🗑️</button>
        </div>
      `;
      list.appendChild(div);
    });
  } catch (e) { console.error(e); }
}

function closeManageGoals() {
  document.getElementById('manage-goals-modal').classList.add('hidden');
}

async function deleteGoal(id, btn) {
  if (!confirm('Remover esta meta?')) return;
  try {
    const res = await fetch(`/api/goals/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      btn.closest('.manage-goal-item').remove();
      loadDailyGoals(state.currentDate);
    }
  } catch (e) { alert('Erro ao remover meta'); }
}

// Import data
let pendingImportData = null;

document.getElementById('import-data')?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      pendingImportData = JSON.parse(ev.target.result);
      document.getElementById('import-confirm-modal').classList.remove('hidden');
    } catch (err) {
      alert('Arquivo JSON inválido');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

function cancelImport() {
  pendingImportData = null;
  document.getElementById('import-confirm-modal').classList.add('hidden');
}

async function confirmImport() {
  if (!pendingImportData) return;
  document.getElementById('import-confirm-modal').classList.add('hidden');
  try {
    const res = await fetch('/api/profile/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pendingImportData)
    });
    const data = await res.json();
    if (data.success) {
      alert('Dados importados com sucesso!');
      location.reload();
    } else {
      alert(data.error || 'Erro ao importar dados');
    }
  } catch (e) {
    alert('Erro ao importar dados');
  }
  pendingImportData = null;
}

// Delete account
function openDeleteAccount() {
  document.getElementById('delete-account-modal').classList.remove('hidden');
}
function closeDeleteAccount() {
  document.getElementById('delete-account-modal').classList.add('hidden');
}

document.getElementById('delete-account-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('confirm-username').value;
  try {
    const res = await fetch('/api/profile/account', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmUsername: username })
    });
    const data = await res.json();
    if (data.success) {
      window.location.href = '/login';
    } else {
      alert(data.error || 'Erro ao apagar conta');
    }
  } catch (e) { alert('Erro ao apagar conta'); }
});
