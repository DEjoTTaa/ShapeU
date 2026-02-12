// XP and level utilities for frontend
const LEVEL_TITLES_CLIENT = {
  1: 'Iniciante', 2: 'Aprendiz', 3: 'Praticante',
  5: 'Disciplinado', 7: 'Forjador de Hábitos', 10: 'Máquina',
  15: 'Imparável', 20: 'Lendário', 25: 'Transcendente',
  30: 'Mito', 50: 'Deus da Disciplina', 100: 'Ascendido'
};

function getTitleClient(level) {
  let title = 'Iniciante';
  Object.keys(LEVEL_TITLES_CLIENT).sort((a, b) => a - b).forEach(k => {
    if (level >= parseInt(k)) title = LEVEL_TITLES_CLIENT[k];
  });
  return title;
}

function calculateLevelClient(totalXP) {
  let level = 1, xpUsed = 0;
  while (true) {
    const needed = level * 500;
    if (xpUsed + needed > totalXP) break;
    xpUsed += needed;
    level++;
  }
  return {
    level,
    xpInCurrentLevel: totalXP - xpUsed,
    xpForNext: level * 500
  };
}
