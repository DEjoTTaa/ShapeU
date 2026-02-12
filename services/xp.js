const LEVEL_TITLES = {
  1: 'Iniciante',
  2: 'Aprendiz',
  3: 'Praticante',
  5: 'Disciplinado',
  7: 'Forjador de Hábitos',
  10: 'Máquina',
  15: 'Imparável',
  20: 'Lendário',
  25: 'Transcendente',
  30: 'Mito',
  50: 'Deus da Disciplina',
  100: 'Ascendido'
};

function getTitle(level) {
  let title = 'Iniciante';
  const keys = Object.keys(LEVEL_TITLES).map(Number).sort((a, b) => a - b);
  for (const key of keys) {
    if (level >= key) title = LEVEL_TITLES[key];
  }
  return title;
}

function xpForNextLevel(currentLevel) {
  return currentLevel * 500;
}

function calculateLevel(totalXP) {
  let level = 1;
  let xpUsed = 0;
  while (true) {
    const needed = level * 500;
    if (xpUsed + needed > totalXP) break;
    xpUsed += needed;
    level++;
  }
  return { level, xpInCurrentLevel: totalXP - xpUsed, xpForNext: level * 500 };
}

function calculateCheckinXP(goal, streakDays, extras = {}) {
  let xp = 0;
  const freq = goal.frequency && goal.frequency.type ? goal.frequency.type : 'daily';
  const effort = goal.effortLevel || 'light';

  if (freq === 'daily') {
    xp = effort === 'effort' ? 15 : 10;
  } else if (freq === 'weekly') {
    xp = effort === 'effort' ? 25 : 20;
  } else if (freq === 'custom') {
    xp = effort === 'effort' ? 20 : 15;
  } else if (freq === 'monthly') {
    const months = goal.consecutiveMonths || 0;
    xp = 50 + Math.max(0, months - 1) * 10;
  }

  if (streakDays >= 90) xp += 30;
  else if (streakDays >= 60) xp += 20;
  else if (streakDays >= 30) xp += 15;
  else if (streakDays >= 14) xp += 10;
  else if (streakDays >= 7) xp += 5;
  else if (streakDays >= 3) xp += 2;

  if (extras.perfectDay) xp += 50;
  if (extras.perfectWeek) xp += 200;
  if (extras.perfectMonth) xp += 1000;
  if (extras.before6am) xp += 5;
  if (extras.after10pm) xp += 5;
  if (extras.allBefore12) xp += 20;
  if (extras.firstOfDay) xp += 3;

  return xp;
}

function getAchievementXP(rarity) {
  const map = {
    common: 50,
    uncommon: 100,
    rare: 200,
    epic: 500,
    legendary: 1000,
    secret_rare: 400,
    secret_epic: 1000,
    secret_legendary: 2000
  };
  return map[rarity] || 50;
}

const UNLOCKABLE_AVATARS = [
  { emoji: '🛡️', level: 5 },
  { emoji: '🥉', level: 10 },
  { emoji: '🥈', level: 15 },
  { emoji: '🥇', level: 20 },
  { emoji: '✨', level: 25 },
  { emoji: '🔥', level: 30 },
  { emoji: '⭐', level: 50 },
  { emoji: '❓', level: 100 }
];

module.exports = {
  LEVEL_TITLES,
  getTitle,
  xpForNextLevel,
  calculateLevel,
  calculateCheckinXP,
  getAchievementXP,
  UNLOCKABLE_AVATARS
};
