const DailyLog = require('../models/DailyLog');
const Goal = require('../models/Goal');

function getDateRange(period) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  let startDate, prevStart, prevEnd;

  switch (period) {
    case 'daily': {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      startDate = d.toISOString().split('T')[0];
      const p = new Date(d);
      p.setDate(p.getDate() - 7);
      prevStart = p.toISOString().split('T')[0];
      prevEnd = startDate;
      break;
    }
    case 'weekly': {
      const d = new Date(now);
      d.setDate(d.getDate() - 28);
      startDate = d.toISOString().split('T')[0];
      const p = new Date(d);
      p.setDate(p.getDate() - 28);
      prevStart = p.toISOString().split('T')[0];
      prevEnd = startDate;
      break;
    }
    case 'monthly': {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 6);
      startDate = d.toISOString().split('T')[0];
      const p = new Date(d);
      p.setMonth(p.getMonth() - 6);
      prevStart = p.toISOString().split('T')[0];
      prevEnd = startDate;
      break;
    }
    case 'yearly': {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 2);
      startDate = d.toISOString().split('T')[0];
      const p = new Date(d);
      p.setFullYear(p.getFullYear() - 2);
      prevStart = p.toISOString().split('T')[0];
      prevEnd = startDate;
      break;
    }
    default: {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      startDate = d.toISOString().split('T')[0];
      prevStart = startDate;
      prevEnd = today;
    }
  }

  return { startDate, endDate: today, prevStart, prevEnd };
}

async function getSummary(userId, period) {
  const { startDate, endDate, prevStart, prevEnd } = getDateRange(period);

  const currentLogs = await DailyLog.find({
    userId, date: { $gte: startDate, $lte: endDate }
  }).sort({ date: 1 });

  const prevLogs = await DailyLog.find({
    userId, date: { $gte: prevStart, $lt: prevEnd }
  }).sort({ date: 1 });

  const goals = await Goal.find({ userId });

  const currentRate = currentLogs.length > 0
    ? currentLogs.reduce((s, l) => s + (l.completionRate || 0), 0) / currentLogs.length
    : 0;
  const prevRate = prevLogs.length > 0
    ? prevLogs.reduce((s, l) => s + (l.completionRate || 0), 0) / prevLogs.length
    : 0;
  const rateChange = prevRate > 0 ? currentRate - prevRate : 0;

  let bestStreak = { days: 0, goalName: 'N/A' };
  for (const g of goals) {
    const streak = Math.max(g.currentStreak || 0, g.longestStreak || 0);
    if (streak > bestStreak.days) {
      bestStreak = { days: streak, goalName: g.name };
    }
  }

  let totalCompleted = 0;
  for (const log of currentLogs) {
    totalCompleted += (log.completions || []).filter(c => c.completed).length;
  }

  let consistency = 1;
  if (currentRate >= 90) consistency = 5;
  else if (currentRate >= 75) consistency = 4;
  else if (currentRate >= 60) consistency = 3;
  else if (currentRate >= 40) consistency = 2;

  const consistencyLabels = { 1: 'Precisa melhorar', 2: 'Regular', 3: 'Bom', 4: 'Muito bom', 5: 'Excelente' };

  return {
    completionRate: Math.round(currentRate),
    rateChange: Math.round(rateChange),
    bestStreak,
    totalCompleted,
    consistency,
    consistencyLabel: consistencyLabels[consistency],
    period,
    daysTracked: currentLogs.length
  };
}

async function getChartData(userId, period, type) {
  const { startDate, endDate, prevStart, prevEnd } = getDateRange(period);

  const currentLogs = await DailyLog.find({
    userId, date: { $gte: startDate, $lte: endDate }
  }).sort({ date: 1 });

  const prevLogs = await DailyLog.find({
    userId, date: { $gte: prevStart, $lt: prevEnd }
  }).sort({ date: 1 });

  const goals = await Goal.find({ userId, isActive: true });

  switch (type) {
    case 'evolution': {
      const labels = currentLogs.map(l => {
        const d = l.date.split('-');
        return `${d[2]}/${d[1]}`;
      });
      const data = currentLogs.map(l => l.completionRate || 0);
      const avg = data.length > 0 ? data.reduce((s, v) => s + v, 0) / data.length : 0;
      return {
        type: period === 'daily' || period === 'weekly' ? 'bar' : 'line',
        labels, data, average: Math.round(avg)
      };
    }

    case 'comparison': {
      const groupCurrent = groupByPeriod(currentLogs, period);
      const groupPrev = groupByPeriod(prevLogs, period);

      const allKeys = [...new Set([...Object.keys(groupCurrent), ...Object.keys(groupPrev)])].sort();
      const maxLen = Math.max(Object.keys(groupCurrent).length, Object.keys(groupPrev).length);

      const currentValues = Object.values(groupCurrent).slice(0, maxLen);
      const prevValues = Object.values(groupPrev).slice(0, maxLen);

      const periodLabels = { daily: 'dia', weekly: 'semana', monthly: 'mês', yearly: 'ano' };
      return {
        labels: currentValues.map((_, i) => `${periodLabels[period] || 'período'} ${i + 1}`),
        current: currentValues,
        previous: prevValues
      };
    }

    case 'distribution': {
      const goalRates = [];
      for (const goal of goals) {
        let completed = 0, total = 0;
        for (const log of currentLogs) {
          const comp = (log.completions || []).find(c => c.goalId && c.goalId.toString() === goal._id.toString());
          if (comp) {
            total++;
            if (comp.completed) completed++;
          }
        }
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
        goalRates.push({ name: goal.name, icon: goal.icon, rate });
      }
      return {
        labels: goalRates.map(g => `${g.icon} ${g.name}`),
        data: goalRates.map(g => g.rate),
        colors: goalRates.map(g => g.rate >= 70 ? '#00E676' : g.rate >= 50 ? '#FFC107' : '#FF5252')
      };
    }

    case 'heatmap': {
      const months = period === 'daily' || period === 'weekly' ? 3 : 12;
      const start = new Date();
      start.setMonth(start.getMonth() - months);
      const heatStart = start.toISOString().split('T')[0];

      const heatLogs = await DailyLog.find({
        userId, date: { $gte: heatStart, $lte: endDate }
      });

      const heatData = {};
      for (const log of heatLogs) {
        heatData[log.date] = log.completionRate || 0;
      }
      return { data: heatData, startDate: heatStart, endDate };
    }

    default:
      return {};
  }
}

function groupByPeriod(logs, period) {
  const groups = {};
  for (const log of logs) {
    let key;
    const d = new Date(log.date + 'T12:00:00');
    switch (period) {
      case 'daily': key = log.date; break;
      case 'weekly': {
        const weekStart = new Date(d);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        key = weekStart.toISOString().split('T')[0];
        break;
      }
      case 'monthly': key = log.date.substring(0, 7); break;
      case 'yearly': key = log.date.substring(0, 4); break;
      default: key = log.date;
    }
    if (!groups[key]) groups[key] = [];
    groups[key].push(log.completionRate || 0);
  }

  const result = {};
  for (const [key, rates] of Object.entries(groups)) {
    result[key] = Math.round(rates.reduce((s, v) => s + v, 0) / rates.length);
  }
  return result;
}

async function getStrengths(userId, period) {
  const { startDate, endDate } = getDateRange(period);

  const logs = await DailyLog.find({
    userId, date: { $gte: startDate, $lte: endDate }
  });

  const goals = await Goal.find({ userId, isActive: true });

  const goalStats = [];
  for (const goal of goals) {
    let completed = 0, total = 0;
    for (const log of logs) {
      const comp = (log.completions || []).find(c => c.goalId && c.goalId.toString() === goal._id.toString());
      if (comp) {
        total++;
        if (comp.completed) completed++;
      }
    }
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    goalStats.push({ name: goal.name, icon: goal.icon, rate, streak: goal.currentStreak || 0 });
  }

  const strengths = goalStats.filter(g => g.rate >= 70).sort((a, b) => b.rate - a.rate);
  const improvements = goalStats.filter(g => g.rate < 50).sort((a, b) => a.rate - b.rate);
  const neutral = goalStats.filter(g => g.rate >= 50 && g.rate < 70);

  return { strengths, improvements, neutral };
}

module.exports = { getSummary, getChartData, getStrengths, getDateRange };
