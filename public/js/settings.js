function toggleSettings() {
  const panel = document.getElementById('settings-panel');
  const backdrop = document.getElementById('settings-backdrop');
  panel.classList.toggle('hidden');
  backdrop.classList.toggle('hidden');
}

// Avatar Preview Modal
let selectedAvatarFile = null;

document.getElementById('open-avatar-modal-btn')?.addEventListener('click', () => {
  document.getElementById('avatar-preview-modal').classList.remove('hidden');
  // Reset modal state
  selectedAvatarFile = null;
  document.getElementById('avatar-preview-circle').innerHTML = '<span style="font-size:48px;color:var(--text-secondary)">📷</span>';
  document.getElementById('avatar-file-info').classList.add('hidden');
  document.getElementById('avatar-file-error').classList.add('hidden');
  document.getElementById('save-avatar-btn').disabled = true;
  const input = document.getElementById('avatar-upload');
  if (input) input.value = '';
});

function closeAvatarModal() {
  document.getElementById('avatar-preview-modal').classList.add('hidden');
  selectedAvatarFile = null;
}

document.getElementById('avatar-upload')?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const errorEl = document.getElementById('avatar-file-error');
  const infoEl = document.getElementById('avatar-file-info');

  // Validate type
  if (!file.type.startsWith('image/')) {
    errorEl.textContent = 'Apenas imagens são permitidas (JPEG, PNG, GIF, WebP)';
    errorEl.classList.remove('hidden');
    infoEl.classList.add('hidden');
    document.getElementById('save-avatar-btn').disabled = true;
    return;
  }

  // Validate size
  if (file.size > 2 * 1024 * 1024) {
    errorEl.textContent = 'Imagem muito grande! Máximo 2MB.';
    errorEl.classList.remove('hidden');
    infoEl.classList.add('hidden');
    document.getElementById('save-avatar-btn').disabled = true;
    return;
  }

  errorEl.classList.add('hidden');
  selectedAvatarFile = file;

  // Show file info
  const sizeStr = file.size < 1024 ? file.size + ' B' :
    file.size < 1048576 ? (file.size / 1024).toFixed(1) + ' KB' :
    (file.size / 1048576).toFixed(1) + ' MB';
  document.getElementById('avatar-file-name').textContent = file.name;
  document.getElementById('avatar-file-size').textContent = sizeStr;
  infoEl.classList.remove('hidden');

  // Show preview
  const url = URL.createObjectURL(file);
  document.getElementById('avatar-preview-circle').innerHTML = `<img src="${url}" alt="Preview" />`;
  document.getElementById('save-avatar-btn').disabled = false;
});

async function saveAvatarFromModal() {
  if (!selectedAvatarFile) return;

  const formData = new FormData();
  formData.append('avatar', selectedAvatarFile);

  try {
    document.getElementById('save-avatar-btn').disabled = true;
    document.getElementById('save-avatar-btn').textContent = 'Salvando...';

    const res = await fetch('/api/profile/avatar', { method: 'PUT', body: formData });
    const data = await res.json();
    if (data.success) {
      updateAvatarDisplay(data.avatar);
      closeAvatarModal();
    } else {
      document.getElementById('avatar-file-error').textContent = data.error || 'Erro ao fazer upload';
      document.getElementById('avatar-file-error').classList.remove('hidden');
    }
  } catch (e) {
    document.getElementById('avatar-file-error').textContent = 'Erro ao fazer upload';
    document.getElementById('avatar-file-error').classList.remove('hidden');
  } finally {
    document.getElementById('save-avatar-btn').disabled = false;
    document.getElementById('save-avatar-btn').textContent = 'Salvar Avatar';
  }
}

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

// Theme selector - 15 themes
document.querySelectorAll('.theme-circle').forEach(circle => {
  circle.addEventListener('click', async () => {
    const theme = circle.dataset.theme;
    try {
      const res = await fetch('/api/profile/theme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme })
      });
      const data = await res.json();
      if (data.success) {
        document.querySelectorAll('.theme-circle').forEach(c => c.classList.remove('selected'));
        circle.classList.add('selected');
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
