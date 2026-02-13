const express = require('express');
const { auth } = require('../middleware/auth');
const Goal = require('../models/Goal');
const DailyLog = require('../models/DailyLog');
const User = require('../models/User');
const { classifyEffort } = require('../services/gemini');
const { calculateCheckinXP, calculateLevel } = require('../services/xp');
const Meta = require('../models/Meta');
const { checkAchievements } = require('../services/achievements');
const router = express.Router();

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

router.get('/api/goals', auth, async (req, res) => {
  try {
    const goals = await Goal.find({ userId: req.user._id, isActive: true }).sort({ order: 1 });
    res.json(goals);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar metas' });
  }
});

router.post('/api/goals', auth, async (req, res) => {
  try {
    const { name, icon, time, frequency } = req.body;
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Nome da meta é obrigatório' });
    }

    const effortLevel = await classifyEffort(name);
    const goalCount = await Goal.countDocuments({ userId: req.user._id, isActive: true });

    const goal = await Goal.create({
      userId: req.user._id,
      name: name.trim(),
      icon: icon || '🎯',
      time: time || '',
      frequency: frequency || { type: 'daily' },
      effortLevel,
      order: goalCount
    });

    await checkAchievements(req.user._id);
    res.json(goal);
  } catch (error) {
    console.error('Create goal error:', error);
    res.status(500).json({ error: 'Erro ao criar meta' });
  }
});

router.put('/api/goals/:id', auth, async (req, res) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, userId: req.user._id });
    if (!goal) return res.status(404).json({ error: 'Meta não encontrada' });

    const { name, icon, time, frequency } = req.body;
    if (name) goal.name = name.trim();
    if (icon) goal.icon = icon;
    if (time !== undefined) goal.time = time;
    if (frequency) goal.frequency = frequency;

    await goal.save();
    res.json(goal);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar meta' });
  }
});

router.delete('/api/goals/:id', auth, async (req, res) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, userId: req.user._id });
    if (!goal) return res.status(404).json({ error: 'Meta não encontrada' });

    goal.isActive = false;
    await goal.save();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover meta' });
  }
});

router.put('/api/goals/reorder', auth, async (req, res) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order)) return res.status(400).json({ error: 'Ordem inválida' });

    for (let i = 0; i < order.length; i++) {
      await Goal.updateOne({ _id: order[i], userId: req.user._id }, { order: i });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao reordenar metas' });
  }
});

router.get('/api/goals/daily', auth, async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const dayOfWeek = DAYS[new Date(date + 'T12:00:00').getDay()];

    const goals = await Goal.find({ userId: req.user._id, isActive: true }).sort({ order: 1 });

    const applicableGoals = goals.filter(g => {
      const freq = g.frequency && g.frequency.type ? g.frequency.type : 'daily';
      if (freq === 'daily') return true;
      if (freq === 'weekly' || freq === 'custom') {
        const days = g.frequency.specificDays || [];
        return days.length === 0 || days.includes(dayOfWeek);
      }
      if (freq === 'monthly') return true;
      return true;
    });

    let log = await DailyLog.findOne({ userId: req.user._id, date });

    if (!log) {
      log = await DailyLog.create({
        userId: req.user._id,
        date,
        dayOfWeek,
        completions: applicableGoals.map(g => ({ goalId: g._id, completed: false })),
        completionRate: 0
      });
    } else {
      const existingIds = new Set(log.completions.map(c => c.goalId.toString()));
      for (const g of applicableGoals) {
        if (!existingIds.has(g._id.toString())) {
          log.completions.push({ goalId: g._id, completed: false });
        }
      }
      const activeIds = new Set(applicableGoals.map(g => g._id.toString()));
      log.completions = log.completions.filter(c => activeIds.has(c.goalId.toString()));
      await log.save();
    }

    const result = applicableGoals.map(g => {
      const comp = log.completions.find(c => c.goalId.toString() === g._id.toString());
      return {
        _id: g._id,
        name: g.name,
        icon: g.icon,
        time: g.time,
        frequency: g.frequency,
        effortLevel: g.effortLevel,
        currentStreak: g.currentStreak || 0,
        longestStreak: g.longestStreak || 0,
        completed: comp ? comp.completed : false,
        completedAt: comp ? comp.completedAt : null
      };
    });

    const completedCount = result.filter(r => r.completed).length;
    const completionRate = result.length > 0 ? Math.round((completedCount / result.length) * 100) : 0;

    res.json({
      date,
      dayOfWeek,
      goals: result,
      completionRate,
      completedCount,
      totalCount: result.length
    });
  } catch (error) {
    console.error('Daily goals error:', error);
    res.status(500).json({ error: 'Erro ao buscar metas do dia' });
  }
});

router.post('/api/goals/checkin', auth, async (req, res) => {
  try {
    const { goalId, date, completed } = req.body;
    const logDate = date || new Date().toISOString().split('T')[0];
    const dayOfWeek = DAYS[new Date(logDate + 'T12:00:00').getDay()];

    const goal = await Goal.findOne({ _id: goalId, userId: req.user._id });
    if (!goal) return res.status(404).json({ error: 'Meta não encontrada' });

    let log = await DailyLog.findOne({ userId: req.user._id, date: logDate });
    if (!log) {
      log = await DailyLog.create({
        userId: req.user._id,
        date: logDate,
        dayOfWeek,
        completions: [{ goalId, completed, completedAt: completed ? new Date() : null }]
      });
    } else {
      const compIdx = log.completions.findIndex(c => c.goalId.toString() === goalId);
      if (compIdx >= 0) {
        log.completions[compIdx].completed = completed;
        log.completions[compIdx].completedAt = completed ? new Date() : null;
      } else {
        log.completions.push({ goalId, completed, completedAt: completed ? new Date() : null });
      }
    }

    const goals = await Goal.find({ userId: req.user._id, isActive: true });
    const applicableGoals = goals.filter(g => {
      const freq = g.frequency && g.frequency.type ? g.frequency.type : 'daily';
      if (freq === 'daily') return true;
      if (freq === 'weekly' || freq === 'custom') {
        const days = g.frequency.specificDays || [];
        return days.length === 0 || days.includes(dayOfWeek);
      }
      return true;
    });

    const applicableIds = new Set(applicableGoals.map(g => g._id.toString()));
    const relevantComps = log.completions.filter(c => applicableIds.has(c.goalId.toString()));
    const completedCount = relevantComps.filter(c => c.completed).length;
    const completionRate = relevantComps.length > 0 ? Math.round((completedCount / relevantComps.length) * 100) : 0;

    log.completionRate = completionRate;
    await log.save();

    let xpGained = 0;
    const user = await User.findById(req.user._id);

    if (completed) {
      goal.totalCompletions = (goal.totalCompletions || 0) + 1;

      const yesterday = new Date(logDate + 'T12:00:00');
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const yesterdayLog = await DailyLog.findOne({ userId: req.user._id, date: yesterdayStr });

      let hadYesterday = false;
      if (yesterdayLog) {
        const yComp = yesterdayLog.completions.find(c => c.goalId.toString() === goalId);
        hadYesterday = yComp && yComp.completed;
      }

      if (hadYesterday) {
        goal.currentStreak = (goal.currentStreak || 0) + 1;
      } else {
        goal.currentStreak = 1;
      }

      if (goal.currentStreak > (goal.longestStreak || 0)) {
        goal.longestStreak = goal.currentStreak;
      }

      const now = new Date();
      const isFirstOfDay = relevantComps.filter(c => c.completed).length === 1;
      const isPerfectDay = completionRate === 100;
      const isBefore6 = now.getHours() < 6;
      const isAfter10 = now.getHours() >= 22;
      const allBefore12 = isPerfectDay && relevantComps.every(c => {
        if (!c.completed || !c.completedAt) return false;
        return new Date(c.completedAt).getHours() < 12;
      });

      let isPerfectWeek = false;
      let isPerfectMonth = false;

      if (isPerfectDay) {
        const last7 = await DailyLog.find({
          userId: req.user._id,
          date: { $lte: logDate },
          completionRate: 100
        }).sort({ date: -1 }).limit(7);
        isPerfectWeek = last7.length >= 7;

        if (isPerfectWeek) {
          const last30 = await DailyLog.find({
            userId: req.user._id,
            date: { $lte: logDate },
            completionRate: 100
          }).sort({ date: -1 }).limit(30);
          isPerfectMonth = last30.length >= 30;
        }
      }

      xpGained = calculateCheckinXP(goal, goal.currentStreak, {
        perfectDay: isPerfectDay,
        perfectWeek: isPerfectWeek,
        perfectMonth: isPerfectMonth,
        before6am: isBefore6,
        after10pm: isAfter10,
        allBefore12,
        firstOfDay: isFirstOfDay
      });

      user.totalGoalsCompleted = (user.totalGoalsCompleted || 0) + 1;

      if (isPerfectDay) {
        const alreadyCounted = await DailyLog.findOne({ userId: req.user._id, date: logDate });
        if (alreadyCounted && alreadyCounted.completionRate === 100) {
          user.totalPerfectDays = (user.totalPerfectDays || 0) + 1;
        }
      }

      if (goal.currentStreak > (user.longestStreak || 0)) {
        user.longestStreak = goal.currentStreak;
      }

      user.xp = (user.xp || 0) + xpGained;
      log.totalXPEarned = (log.totalXPEarned || 0) + xpGained;
    } else {
      if (goal.totalCompletions > 0) goal.totalCompletions -= 1;
      goal.currentStreak = 0;
    }

    await goal.save();

    const oldLevel = user.level;
    const levelInfo = calculateLevel(user.xp);
    user.level = levelInfo.level;
    await user.save();
    await log.save();

    const levelUp = user.level > oldLevel;
    const newAchievements = await checkAchievements(req.user._id);

    // Auto-increment linked Metas
    if (completed) {
      const linkedMetas = await Meta.find({
        userId: req.user._id,
        linkedGoalId: goalId,
        isCompleted: false
      });
      for (const meta of linkedMetas) {
        const today = logDate;
        if (today >= meta.startDate && today <= meta.endDate) {
          meta.currentValue = Math.min((meta.currentValue || 0) + 1, meta.targetValue);
          if (meta.currentValue >= meta.targetValue) {
            meta.isCompleted = true;
            meta.completedAt = new Date();
            // Award 100 XP bonus for completing a meta
            const metaUser = await User.findById(req.user._id);
            metaUser.xp = (metaUser.xp || 0) + 100;
            xpGained += 100;
            const metaLevelInfo = calculateLevel(metaUser.xp);
            metaUser.level = metaLevelInfo.level;
            await metaUser.save();
          }
          await meta.save();
        }
      }
    } else {
      // Decrement linked Metas on uncheck
      const linkedMetas = await Meta.find({
        userId: req.user._id,
        linkedGoalId: goalId,
        isCompleted: false
      });
      for (const meta of linkedMetas) {
        if (meta.currentValue > 0) {
          meta.currentValue -= 1;
          await meta.save();
        }
      }
    }

    const updatedUser = await User.findById(req.user._id);

    res.json({
      success: true,
      xp_gained: xpGained,
      new_xp: updatedUser.xp,
      new_level: updatedUser.level,
      level_up: levelUp,
      new_achievements: newAchievements,
      completion_rate: completionRate,
      completed_count: completedCount,
      total_count: relevantComps.length,
      streak: goal.currentStreak
    });
  } catch (error) {
    console.error('Checkin error:', error);
    res.status(500).json({ error: 'Erro ao fazer check-in' });
  }
});

module.exports = router;
