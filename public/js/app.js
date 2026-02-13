// Theme definitions
const THEMES = {
  'dourado':        { primary: '#D4AF37', light: '#FFD700', rgb: '212,175,55', lightRgb: '255,215,0' },
  'azul-royal':     { primary: '#2196F3', light: '#64B5F6', rgb: '33,150,243', lightRgb: '100,181,246' },
  'verde-esmeralda':{ primary: '#00E676', light: '#69F0AE', rgb: '0,230,118', lightRgb: '105,240,174' },
  'rosa-neon':      { primary: '#E91E63', light: '#F48FB1', rgb: '233,30,99', lightRgb: '244,143,177' },
  'roxo-imperial':  { primary: '#9C27B0', light: '#CE93D8', rgb: '156,39,176', lightRgb: '206,147,216' },
  'laranja-fogo':   { primary: '#FF5722', light: '#FF8A65', rgb: '255,87,34', lightRgb: '255,138,101' },
  'ciano-eletrico': { primary: '#00BCD4', light: '#4DD0E1', rgb: '0,188,212', lightRgb: '77,208,225' },
  'vermelho-rubi':  { primary: '#F44336', light: '#EF9A9A', rgb: '244,67,54', lightRgb: '239,154,154' },
  'ambar':          { primary: '#FFC107', light: '#FFD54F', rgb: '255,193,7', lightRgb: '255,213,79' },
  'indigo':         { primary: '#3F51B5', light: '#7986CB', rgb: '63,81,181', lightRgb: '121,134,203' },
  'teal':           { primary: '#009688', light: '#4DB6AC', rgb: '0,150,136', lightRgb: '77,182,172' },
  'lima':           { primary: '#CDDC39', light: '#E6EE9C', rgb: '205,220,57', lightRgb: '230,238,156' },
  'coral':          { primary: '#FF7043', light: '#FFAB91', rgb: '255,112,67', lightRgb: '255,171,145' },
  'lavanda':        { primary: '#7E57C2', light: '#B39DDB', rgb: '126,87,194', lightRgb: '179,157,219' },
  'prata':          { primary: '#9E9E9E', light: '#E0E0E0', rgb: '158,158,158', lightRgb: '224,224,224' }
};

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

// Apply theme with CSS variables
function applyTheme(theme) {
  const el = document.documentElement;
  el.setAttribute('data-theme', theme);

  // Also set CSS variables directly for immediate effect
  const t = THEMES[theme];
  if (t) {
    el.style.setProperty('--primary', t.primary);
    el.style.setProperty('--primary-light', t.light);
    el.style.setProperty('--primary-rgb', t.rgb);
    el.style.setProperty('--primary-light-rgb', t.lightRgb);
  }
}

// Handle legacy theme names from old data
function migrateThemeName(theme) {
  const legacy = { 'gold': 'dourado', 'blue': 'azul-royal', 'green': 'verde-esmeralda', 'pink': 'rosa-neon' };
  return legacy[theme] || theme || 'dourado';
}

const currentTheme = migrateThemeName(window.USER.theme);
applyTheme(currentTheme);

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
  const style = getComputedStyle(document.documentElement);
  const primary = style.getPropertyValue('--primary').trim();
  const primaryLight = style.getPropertyValue('--primary-light').trim();
  const colors = [primary, primaryLight, '#FFC107', '#FF9800', '#FF5722', '#4CAF50', '#2196F3'];
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
  const style = getComputedStyle(document.documentElement);
  const primary = style.getPropertyValue('--primary').trim();
  const colors = [primary, '#FFD700', '#FF5252', '#4CAF50', '#2196F3', '#9C27B0', '#FF9800'];
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
  const flash = document.createElement('div');
  flash.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;
    background:linear-gradient(135deg,rgba(var(--primary-rgb),.3),rgba(var(--primary-light-rgb),.2));
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
  if (typeof loadMetas === 'function') loadMetas();
});
