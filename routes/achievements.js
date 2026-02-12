const express = require('express');
const { auth } = require('../middleware/auth');
const Achievement = require('../models/Achievement');
const { checkAchievements } = require('../services/achievements');
const achievementsData = require('../data/achievements.json');
const { calculateLevel, getTitle } = require('../services/xp');
const router = express.Router();

router.get('/api/achievements', auth, async (req, res) => {
  try {
    const userAch = await Achievement.find({ userId: req.user._id });
    const unlockedMap = {};
    for (const a of userAch) {
      unlockedMap[a.achievementId] = { unlockedAt: a.unlockedAt, seen: a.seen, xpAwarded: a.xpAwarded };
    }

    const all = achievementsData.achievements.map(badge => {
      const unlocked = unlockedMap[badge.id];
      return {
        ...badge,
        unlocked: !!unlocked,
        unlockedAt: unlocked ? unlocked.unlockedAt : null,
        seen: unlocked ? unlocked.seen : false
      };
    });

    const levelInfo = calculateLevel(req.user.xp);
    const title = getTitle(req.user.level);

    res.json({
      achievements: all,
      totalUnlocked: userAch.length,
      totalBadges: achievementsData.achievements.length,
      level: req.user.level,
      xp: req.user.xp,
      xpInLevel: levelInfo.xpInCurrentLevel,
      xpForNext: levelInfo.xpForNext,
      title
    });
  } catch (error) {
    console.error('Achievements error:', error);
    res.status(500).json({ error: 'Erro ao buscar conquistas' });
  }
});

router.post('/api/achievements/seen', auth, async (req, res) => {
  try {
    await Achievement.updateMany(
      { userId: req.user._id, seen: false },
      { seen: true }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao marcar conquistas' });
  }
});

router.get('/api/achievements/check', auth, async (req, res) => {
  try {
    const results = await checkAchievements(req.user._id);
    res.json({ newAchievements: results });
  } catch (error) {
    console.error('Check achievements error:', error);
    res.status(500).json({ error: 'Erro ao verificar conquistas' });
  }
});

module.exports = router;
