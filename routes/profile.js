const express = require('express');
const multer = require('multer');
const path = require('path');
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const Goal = require('../models/Goal');
const DailyLog = require('../models/DailyLog');
const Achievement = require('../models/Achievement');
const Meta = require('../models/Meta');
const { checkAchievements } = require('../services/achievements');
const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Apenas imagens são permitidas'));
  }
});

router.put('/api/profile/avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (req.file) {
      const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      user.avatar = { type: 'custom', value: base64 };
      await user.save();
      await checkAchievements(user._id);
      return res.json({ success: true, avatar: user.avatar });
    }

    const { type, value } = req.body;
    if (type && value) {
      user.avatar = { type, value };
      await user.save();
      return res.json({ success: true, avatar: user.avatar });
    }

    res.status(400).json({ error: 'Dados inválidos' });
  } catch (error) {
    console.error('Avatar error:', error);
    res.status(500).json({ error: 'Erro ao atualizar avatar' });
  }
});

router.put('/api/profile/theme', auth, async (req, res) => {
  try {
    const { theme } = req.body;
    const validThemes = [
      'dourado', 'azul-royal', 'verde-esmeralda', 'rosa-neon', 'roxo-imperial',
      'laranja-fogo', 'ciano-eletrico', 'vermelho-rubi', 'ambar', 'indigo',
      'teal', 'lima', 'coral', 'lavanda', 'prata'
    ];
    if (!validThemes.includes(theme)) {
      return res.status(400).json({ error: 'Tema inválido' });
    }
    const user = await User.findById(req.user._id);
    user.theme = theme;
    await user.save();
    await checkAchievements(user._id);
    res.json({ success: true, theme });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao alterar tema' });
  }
});

router.put('/api/profile/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    const user = await User.findById(req.user._id);
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return res.status(400).json({ error: 'Senha atual incorreta' });

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Nova senha deve ter pelo menos 6 caracteres' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Senhas não conferem' });
    }

    user.password = newPassword;
    await user.save();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao alterar senha' });
  }
});

router.get('/api/profile/export', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    const goals = await Goal.find({ userId: req.user._id });
    const logs = await DailyLog.find({ userId: req.user._id });
    const achievements = await Achievement.find({ userId: req.user._id });
    const metas = await Meta.find({ userId: req.user._id });

    const data = {
      exportDate: new Date().toISOString(),
      user,
      goals,
      dailyLogs: logs,
      achievements,
      metas
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=shapeu_export_${req.user.username}_${new Date().toISOString().split('T')[0]}.json`);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao exportar dados' });
  }
});

router.post('/api/profile/import', auth, async (req, res) => {
  try {
    const data = req.body;
    if (!data || !data.goals) {
      return res.status(400).json({ error: 'Formato de arquivo inválido' });
    }

    const userId = req.user._id;

    await Promise.all([
      Goal.deleteMany({ userId }),
      DailyLog.deleteMany({ userId }),
      Achievement.deleteMany({ userId }),
      Meta.deleteMany({ userId })
    ]);

    if (data.goals && data.goals.length > 0) {
      const goals = data.goals.map(g => ({ ...g, _id: undefined, userId }));
      await Goal.insertMany(goals);
    }

    if (data.dailyLogs && data.dailyLogs.length > 0) {
      const logs = data.dailyLogs.map(l => ({ ...l, _id: undefined, userId }));
      for (const log of logs) {
        try { await DailyLog.create(log); }
        catch (e) { if (e.code !== 11000) console.error('Import log error:', e.message); }
      }
    }

    if (data.achievements && data.achievements.length > 0) {
      const achs = data.achievements.map(a => ({ ...a, _id: undefined, userId }));
      for (const ach of achs) {
        try { await Achievement.create(ach); }
        catch (e) { if (e.code !== 11000) console.error('Import ach error:', e.message); }
      }
    }

    if (data.metas && data.metas.length > 0) {
      const metas = data.metas.map(m => ({ ...m, _id: undefined, userId }));
      for (const meta of metas) {
        try { await Meta.create(meta); }
        catch (e) { if (e.code !== 11000) console.error('Import meta error:', e.message); }
      }
    }

    const user = await User.findById(userId);
    if (data.user) {
      if (data.user.xp !== undefined) user.xp = data.user.xp;
      if (data.user.level !== undefined) user.level = data.user.level;
      if (data.user.totalGoalsCompleted !== undefined) user.totalGoalsCompleted = data.user.totalGoalsCompleted;
      if (data.user.totalPerfectDays !== undefined) user.totalPerfectDays = data.user.totalPerfectDays;
      if (data.user.longestStreak !== undefined) user.longestStreak = data.user.longestStreak;
      await user.save();
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: 'Erro ao importar dados' });
  }
});

router.delete('/api/profile/account', auth, async (req, res) => {
  try {
    const { confirmUsername } = req.body;
    if (confirmUsername !== req.user.username) {
      return res.status(400).json({ error: 'Username não confere' });
    }

    await Promise.all([
      User.deleteOne({ _id: req.user._id }),
      Goal.deleteMany({ userId: req.user._id }),
      DailyLog.deleteMany({ userId: req.user._id }),
      Achievement.deleteMany({ userId: req.user._id }),
      Meta.deleteMany({ userId: req.user._id })
    ]);

    res.clearCookie('token');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao apagar conta' });
  }
});

module.exports = router;
