// Global state
const state = {
  currentTab: 'routine',
  currentDate: new Date().toISOString().split('T')[0],
  goals: [],
  statsLoaded: false,
  achievementsLoaded: false
};

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const tabName = tab.dataset.tab;
    if (tabName === state.currentTab) return;

    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    const content = document.getElementById(`tab-${tabName}`);
    if (content) content.classList.add('active');

    state.currentTab = tabName;

    if (tabName === 'stats' && !state.statsLoaded) {
      loadStats('daily');
      state.statsLoaded = true;
    }
    if (tabName === 'achievements' && !state.achievementsLoaded) {
      loadAchievements();
      state.achievementsLoaded = true;
    }
  });
});

// Apply theme
function applyTheme(theme) {
  document.body.setAttribute('data-theme', theme);
}
applyTheme(window.USER.theme);

// Typewriter effect
function typewriter(element, text, speed = 30) {
  element.textContent = '';
  element.classList.add('typewriter-cursor');
  let i = 0;
  function type() {
    if (i < text.length) {
      element.textContent += text.charAt(i);
      i++;
      setTimeout(type, speed);
    } else {
      element.classList.remove('typewriter-cursor');
    }
  }
  type();
}

// Show XP float
function showXPFloat(amount, x, y) {
  const container = document.getElementById('xp-float-container');
  const el = document.createElement('div');
  el.className = 'xp-float';
  el.textContent = `+${amount} XP`;
  el.style.left = (x || window.innerWidth / 2) + 'px';
  el.style.top = (y || 200) + 'px';
  container.appendChild(el);
  setTimeout(() => el.remove(), 1500);
}

// Mini confetti on checkbox
function miniConfetti(element) {
  const rect = element.getBoundingClientRect();
  const colors = ['#D4AF37', '#FFD700', '#FFC107', '#FF9800', '#FF5722', '#4CAF50', '#2196F3'];
  for (let i = 0; i < 12; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-particle';
    p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    p.style.left = (rect.left + rect.width / 2 + (Math.random() - .5) * 40) + 'px';
    p.style.top = (rect.top + rect.height / 2) + 'px';
    p.style.setProperty('--tx', (Math.random() - .5) * 80 + 'px');
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 1000);
  }
}

// Popup confetti
function popupConfetti() {
  const container = document.getElementById('popup-confetti');
  if (!container) return;
  container.innerHTML = '';
  const colors = ['#D4AF37', '#FFD700', '#FF5252', '#4CAF50', '#2196F3', '#9C27B0', '#FF9800'];
  for (let i = 0; i < 40; i++) {
    const p = document.createElement('div');
    p.style.cssText = `
      position:absolute;width:${4+Math.random()*6}px;height:${4+Math.random()*6}px;
      background:${colors[Math.floor(Math.random()*colors.length)]};
      border-radius:${Math.random()>.5?'50%':'2px'};
      left:${Math.random()*100}%;top:${-10-Math.random()*20}%;
      animation:confettiFall ${.8+Math.random()*.8}s ease forwards;
      animation-delay:${Math.random()*.3}s;opacity:.9;
    `;
    container.appendChild(p);
  }
}

// Achievement popup queue
let achievementQueue = [];
let showingAchievement = false;

function queueAchievement(badge, xp) {
  achievementQueue.push({ badge, xp });
  if (!showingAchievement) showNextAchievement();
}

function showNextAchievement() {
  if (achievementQueue.length === 0) { showingAchievement = false; return; }
  showingAchievement = true;
  const { badge, xp } = achievementQueue.shift();

  document.getElementById('popup-badge-icon').textContent = badge.icon;
  document.getElementById('popup-badge-name').textContent = badge.name;
  document.getElementById('popup-badge-desc').textContent = badge.description;
  document.getElementById('popup-xp').textContent = `+${xp} XP`;

  const quotes = window._quotes || ['Continue evoluindo!'];
  document.getElementById('popup-quote').textContent = quotes[Math.floor(Math.random() * quotes.length)];

  document.getElementById('achievement-popup').classList.remove('hidden');
  popupConfetti();
}

function closeAchievementPopup() {
  document.getElementById('achievement-popup').classList.add('hidden');
  setTimeout(showNextAchievement, 300);
}

function showAchievementsTab() {
  closeAchievementPopup();
  document.querySelector('[data-tab="achievements"]').click();
}

// Level up popup
function showLevelUp(level, title) {
  // Flash effect
  const flash = document.createElement('div');
  flash.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;
    background:linear-gradient(135deg,rgba(212,175,55,.3),rgba(255,215,0,.2));
    z-index:2999;pointer-events:none;animation:levelFlash .5s ease forwards;`;
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 500);

  document.getElementById('popup-level').textContent = level;
  document.getElementById('popup-level-title').textContent = title || '';
  document.getElementById('levelup-popup').classList.remove('hidden');
}

function closeLevelUpPopup() {
  document.getElementById('levelup-popup').classList.add('hidden');
}

// Load quotes for popup
fetch('/api/ai/motivation').then(r => r.json()).then(d => {
  window._quotes = [d.quote || 'Continue evoluindo!'];
}).catch(() => {});

// Init
document.addEventListener('DOMContentLoaded', () => {
  loadDailyGoals(state.currentDate);
  loadMotivation();
  initDaySelector();
});
