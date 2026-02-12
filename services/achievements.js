const Achievement = require('../models/Achievement');
const User = require('../models/User');
const Goal = require('../models/Goal');
const DailyLog = require('../models/DailyLog');
const { calculateLevel, getAchievementXP } = require('./xp');
const achievementsData = require('../data/achievements.json');

async function checkAchievements(userId) {
  const user = await User.findById(userId);
  if (!user) return [];

  const existingAch = await Achievement.find({ userId });
  const unlockedIds = new Set(existingAch.map(a => a.achievementId));

  const goals = await Goal.find({ userId, isActive: true });
  const allGoals = await Goal.find({ userId });
  const logs = await DailyLog.find({ userId }).sort({ date: -1 });

  const results = [];

  for (const badge of achievementsData.achievements) {
    if (unlockedIds.has(badge.id)) continue;

    let earned = false;
    try {
      earned = await evaluateCriteria(badge, user, goals, allGoals, logs, unlockedIds);
    } catch (e) {}

    if (earned) {
      const xp = badge.xp || getAchievementXP(badge.rarity);
      try {
        await Achievement.create({ userId, achievementId: badge.id, xpAwarded: xp });
      } catch (e) {
        if (e.code === 11000) continue;
        throw e;
      }

      user.xp += xp;
      const levelInfo = calculateLevel(user.xp);
      const leveledUp = levelInfo.level > user.level;
      user.level = levelInfo.level;
      await user.save();

      results.push({
        badge,
        xpAwarded: xp,
        leveledUp,
        newLevel: user.level
      });
      unlockedIds.add(badge.id);
    }
  }

  return results;
}

async function evaluateCriteria(badge, user, activeGoals, allGoals, logs, unlockedIds) {
  const c = badge.criteria;
  if (!c || !c.type) return false;

  switch (c.type) {
    case 'any_streak': {
      for (const g of allGoals) {
        if (g.longestStreak >= c.days || g.currentStreak >= c.days) return true;
      }
      return false;
    }

    case 'goal_streak': {
      const kw = (c.goalKeywords || []).map(k => k.toLowerCase());
      for (const g of allGoals) {
        const name = g.name.toLowerCase();
        if (kw.some(k => name.includes(k))) {
          if (g.longestStreak >= c.days || g.currentStreak >= c.days) return true;
        }
      }
      return false;
    }

    case 'streak_recovery': {
      let recoveries = 0;
      for (const g of allGoals) {
        if (g.currentStreak > 0 && g.longestStreak > g.currentStreak) {
          recoveries++;
        }
      }
      return recoveries >= c.count;
    }

    case 'total_completions':
      return user.totalGoalsCompleted >= c.count;

    case 'goal_total': {
      const kw = (c.goalKeywords || []).map(k => k.toLowerCase());
      let total = 0;
      for (const g of allGoals) {
        const name = g.name.toLowerCase();
        if (kw.some(k => name.includes(k))) {
          total += g.totalCompletions || 0;
        }
      }
      return total >= c.count;
    }

    case 'active_goals':
      return activeGoals.length >= c.count;

    case 'perfect_days':
      return user.totalPerfectDays >= c.count;

    case 'consecutive_perfect': {
      let maxConsec = 0, current = 0;
      const sortedLogs = [...logs].sort((a, b) => a.date.localeCompare(b.date));
      for (const log of sortedLogs) {
        if (log.completionRate === 100 && log.completions && log.completions.length > 0) {
          current++;
          maxConsec = Math.max(maxConsec, current);
        } else {
          current = 0;
        }
      }
      return maxConsec >= c.count;
    }

    case 'weekly_rate': {
      const last7 = logs.slice(0, 7);
      if (last7.length === 0) return false;
      const avg = last7.reduce((s, l) => s + (l.completionRate || 0), 0) / last7.length;
      return avg >= c.rate;
    }

    case 'sustained_rate': {
      if (logs.length < c.weeks * 7) return false;
      for (let w = 0; w < c.weeks; w++) {
        const weekLogs = logs.slice(w * 7, (w + 1) * 7);
        const avg = weekLogs.reduce((s, l) => s + (l.completionRate || 0), 0) / weekLogs.length;
        if (avg < c.rate) return false;
      }
      return true;
    }

    case 'monthly_rate': {
      const last30 = logs.slice(0, 30);
      if (last30.length < 20) return false;
      const avg = last30.reduce((s, l) => s + (l.completionRate || 0), 0) / last30.length;
      return avg >= c.rate;
    }

    case 'perfect_weekends': {
      let perfectWeekends = 0;
      const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date));
      for (let i = 0; i < sorted.length && perfectWeekends < c.weeks; i++) {
        const d = new Date(sorted[i].date + 'T12:00:00');
        const dow = d.getDay();
        if ((dow === 0 || dow === 6) && sorted[i].completionRate === 100) {
          perfectWeekends++;
        }
      }
      return perfectWeekends >= c.weeks * 2;
    }

    case 'improving_trend': {
      if (logs.length < c.weeks * 7) return false;
      const weekAvgs = [];
      for (let w = 0; w < c.weeks; w++) {
        const weekLogs = logs.slice(w * 7, (w + 1) * 7);
        weekAvgs.push(weekLogs.reduce((s, l) => s + (l.completionRate || 0), 0) / weekLogs.length);
      }
      weekAvgs.reverse();
      for (let i = 1; i < weekAvgs.length; i++) {
        if (weekAvgs[i] <= weekAvgs[i - 1]) return false;
      }
      return true;
    }

    case 'before_hour': {
      let count = 0;
      for (const log of logs) {
        for (const comp of (log.completions || [])) {
          if (comp.completed && comp.completedAt) {
            const h = new Date(comp.completedAt).getHours();
            if (h < c.hour) count++;
          }
        }
      }
      return count >= c.count;
    }

    case 'after_hour': {
      let count = 0;
      for (const log of logs) {
        for (const comp of (log.completions || [])) {
          if (comp.completed && comp.completedAt) {
            const h = new Date(comp.completedAt).getHours();
            if (h >= c.hour) count++;
          }
        }
      }
      return count >= c.count;
    }

    case 'all_before_hour': {
      let count = 0;
      for (const log of logs) {
        const comps = (log.completions || []).filter(co => co.completed);
        if (comps.length === 0) continue;
        const allBefore = comps.every(co => {
          if (!co.completedAt) return false;
          return new Date(co.completedAt).getHours() < c.hour;
        });
        if (allBefore) count++;
      }
      return count >= c.count;
    }

    case 'account_age': {
      const days = Math.floor((Date.now() - new Date(user.createdAt).getTime()) / 86400000);
      return days >= c.days;
    }

    case 'pioneer': {
      const count = await User.countDocuments({ createdAt: { $lte: user.createdAt } });
      return count <= c.rank;
    }

    case 'explorer':
      return true;

    case 'custom_goal': {
      const defaultNames = ['academia', 'treino', 'alimentação', 'hidratação', 'estudo'];
      return allGoals.some(g => !defaultNames.some(d => g.name.toLowerCase().includes(d)));
    }

    case 'theme_change':
      return user.theme !== 'gold';

    case 'avatar_upload':
      return user.avatar && user.avatar.type === 'custom';

    case 'ghost':
      return false;

    case 'same_rate': {
      if (logs.length < c.days) return false;
      const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date));
      for (let i = 0; i <= sorted.length - c.days; i++) {
        const rate = sorted[i].completionRate;
        let match = true;
        for (let j = 1; j < c.days; j++) {
          if (sorted[i + j].completionRate !== rate) { match = false; break; }
        }
        if (match && rate > 0) return true;
      }
      return false;
    }

    case 'midnight': {
      for (const log of logs) {
        for (const comp of (log.completions || [])) {
          if (comp.completed && comp.completedAt) {
            const d = new Date(comp.completedAt);
            const h = d.getHours(), m = d.getMinutes();
            if (h === 0 && m <= c.endMinute) return true;
          }
        }
      }
      return false;
    }

    case 'comeback': {
      const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
      for (let i = c.badDays; i < sorted.length; i++) {
        if (sorted[i].completionRate === 100) {
          let allBad = true;
          for (let j = 1; j <= c.badDays; j++) {
            if (sorted[i - j].completionRate >= c.rate) { allBad = false; break; }
          }
          if (allBad) return true;
        }
      }
      return false;
    }

    case 'perfect_first_day': {
      if (logs.length === 0) return false;
      const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
      return sorted[0].completionRate === 100 && sorted[0].completions && sorted[0].completions.length > 0;
    }

    case 'rebirth': {
      const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
      for (let i = 1; i < sorted.length; i++) {
        const prev = new Date(sorted[i - 1].date + 'T12:00:00');
        const curr = new Date(sorted[i].date + 'T12:00:00');
        const gap = Math.floor((curr - prev) / 86400000);
        if (gap >= c.inactiveDays && sorted[i].completionRate === 100) return true;
      }
      return false;
    }

    case 'night_and_day': {
      for (const log of logs) {
        let hasBefore6 = false, hasAfter22 = false;
        for (const comp of (log.completions || [])) {
          if (comp.completed && comp.completedAt) {
            const h = new Date(comp.completedAt).getHours();
            if (h < 6) hasBefore6 = true;
            if (h >= 22) hasAfter22 = true;
          }
        }
        if (hasBefore6 && hasAfter22) return true;
      }
      return false;
    }

    case 'daily_completions': {
      for (const log of logs) {
        const completed = (log.completions || []).filter(co => co.completed).length;
        if (completed >= c.count) return true;
      }
      return false;
    }

    case 'minimalist': {
      if (activeGoals.length !== c.goals) return false;
      return activeGoals.some(g => g.currentStreak >= c.streak);
    }

    case 'consecutive_logins':
      return user.consecutiveLogins >= c.days;

    case 'total_achievements':
      return unlockedIds.size >= c.count;

    case 'reach_level':
      return user.level >= c.level;

    default:
      return false;
  }
}

module.exports = { checkAchievements };
