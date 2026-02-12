const express = require('express');
const { auth } = require('../middleware/auth');
const { getTitle, calculateLevel, UNLOCKABLE_AVATARS } = require('../services/xp');
const router = express.Router();

router.get('/dashboard', auth, async (req, res) => {
  const user = req.user;
  const levelInfo = calculateLevel(user.xp);
  const title = getTitle(user.level);

  res.render('dashboard', {
    user: {
      _id: user._id,
      username: user.username,
      avatar: user.avatar,
      theme: user.theme || 'gold',
      level: user.level,
      xp: user.xp,
      xpInLevel: levelInfo.xpInCurrentLevel,
      xpForNext: levelInfo.xpForNext,
      title,
      totalGoalsCompleted: user.totalGoalsCompleted,
      totalPerfectDays: user.totalPerfectDays,
      longestStreak: user.longestStreak,
      consecutiveLogins: user.consecutiveLogins
    },
    unlockableAvatars: UNLOCKABLE_AVATARS
  });
});

router.get('/', (req, res) => {
  res.redirect('/login');
});

module.exports = router;
