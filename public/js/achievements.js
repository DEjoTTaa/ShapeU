let allAchievements = [];
let currentFilter = 'all';

const RARITY_LABELS = {
  common: 'Comum', uncommon: 'Incomum', rare: 'Raro',
  epic: 'Épico', legendary: 'Lendário',
  secret_rare: 'Secreto', secret_epic: 'Secreto Épico', secret_legendary: 'Secreto Lendário'
};

const CATEGORY_MAP = {
  streaks: 'streaks', totais: 'totais', perfeicao: 'perfeicao',
  horarios: 'horarios', marcos: 'marcos', secretas: 'secretas'
};

async function loadAchievements() {
  try {
    const res = await fetch('/api/achievements');
    const data = await res.json();
    allAchievements = data.achievements || [];

    // Update level header
    document.getElementById('ach-level').textContent = data.level;
    document.getElementById('ach-title').textContent = data.title;
    document.getElementById('ach-count').textContent = `${data.totalUnlocked}/${data.totalBadges} conquistas desbloqueadas`;

    const xpPct = data.xpForNext > 0 ? Math.round((data.xpInLevel / data.xpForNext) * 100) : 0;
    document.getElementById('ach-xp-fill').style.width = xpPct + '%';
    document.getElementById('ach-xp-text').textContent = `${data.xpInLevel} / ${data.xpForNext} XP`;

    renderAchievements(currentFilter);
  } catch (e) {
    console.error('Load achievements error:', e);
  }
}

function renderAchievements(filter) {
  currentFilter = filter;
  const grid = document.getElementById('ach-grid');
  const recentDiv = document.getElementById('ach-recent');
  grid.innerHTML = '';
  recentDiv.innerHTML = '';

  let filtered = [...allAchievements];

  if (filter === 'locked') {
    filtered = filtered.filter(a => !a.unlocked);
  } else if (filter !== 'all') {
    filtered = filtered.filter(a => a.category === filter);
  }

  // Recent unlocked
  const recent = allAchievements
    .filter(a => a.unlocked)
    .sort((a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt))
    .slice(0, 3);

  if (recent.length > 0 && filter === 'all') {
    recentDiv.innerHTML = '<h4 class="ach-recent-title">Conquistas Recentes</h4>';
    const recentGrid = document.createElement('div');
    recentGrid.className = 'ach-grid';
    recentGrid.style.marginBottom = '16px';
    recent.forEach(ach => {
      recentGrid.appendChild(createBadgeCard(ach, true));
    });
    recentDiv.appendChild(recentGrid);
  }

  // All badges
  filtered.forEach((ach, i) => {
    const card = createBadgeCard(ach);
    card.style.animationDelay = `${i * 0.03}s`;
    grid.appendChild(card);
  });

  if (filtered.length === 0) {
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#666;padding:20px">Nenhuma conquista nesta categoria</p>';
  }
}

function createBadgeCard(ach, isRecent = false) {
  const card = document.createElement('div');
  const isSecret = ach.category === 'secretas';
  const isLocked = !ach.unlocked;

  card.className = `badge-card animate-in ${ach.unlocked ? 'unlocked' : 'locked'} rarity-${ach.rarity}`;

  if (isLocked && isSecret) {
    card.innerHTML = `
      <span class="badge-icon">❓</span>
      <div class="badge-name">???</div>
      <div class="badge-desc">Descubra por si...</div>
    `;
  } else if (isLocked) {
    card.innerHTML = `
      <span class="badge-icon">🔒</span>
      <div class="badge-name">${ach.name}</div>
      <div class="badge-desc">${ach.hint || ach.description}</div>
      <span class="badge-rarity rarity-${ach.rarity}">${RARITY_LABELS[ach.rarity] || ach.rarity}</span>
    `;
  } else {
    const date = new Date(ach.unlockedAt);
    const dateStr = date.toLocaleDateString('pt-BR');
    card.innerHTML = `
      ${(isRecent || !ach.seen) ? '<span class="badge-new">NOVO</span>' : ''}
      <span class="badge-icon">${ach.icon}</span>
      <div class="badge-name">${ach.name}</div>
      <div class="badge-desc">${ach.description}</div>
      <div class="badge-date">${dateStr}</div>
      <span class="badge-rarity rarity-${ach.rarity}">${RARITY_LABELS[ach.rarity] || ach.rarity}</span>
    `;
  }

  return card;
}

// Filters
document.querySelectorAll('#ach-filters .filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#ach-filters .filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderAchievements(btn.dataset.filter);
  });
});
