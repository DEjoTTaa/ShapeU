const express = require('express');
const { auth } = require('../middleware/auth');
const DailyLog = require('../models/DailyLog');
const Goal = require('../models/Goal');
const { generateMotivation, generateAnalysis, getRandomQuote } = require('../services/gemini');
const { getSummary, getStrengths } = require('../services/stats');
const router = express.Router();

router.get('/api/ai/motivation', auth, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    let log = await DailyLog.findOne({ userId: req.user._id, date: today });

    if (log && log.aiQuote) {
      return res.json({ quote: log.aiQuote, cached: true });
    }

    const goals = await Goal.find({ userId: req.user._id, isActive: true });
    let completed = 0, total = goals.length, maxStreak = 0;

    if (log) {
      completed = (log.completions || []).filter(c => c.completed).length;
    }

    for (const g of goals) {
      if (g.currentStreak > maxStreak) maxStreak = g.currentStreak;
    }

    const last7 = await DailyLog.find({ userId: req.user._id }).sort({ date: -1 }).limit(7);
    const weeklyRate = last7.length > 0
      ? Math.round(last7.reduce((s, l) => s + (l.completionRate || 0), 0) / last7.length)
      : 0;

    const quote = await generateMotivation({
      username: req.user.username,
      completed,
      total,
      streak: maxStreak,
      weeklyRate,
      comparison: weeklyRate > 70 ? 'acima da média' : weeklyRate > 50 ? 'na média' : 'abaixo da média'
    });

    if (!log) {
      log = await DailyLog.create({
        userId: req.user._id,
        date: today,
        dayOfWeek: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()],
        aiQuote: quote,
        aiQuoteCount: 1
      });
    } else {
      log.aiQuote = quote;
      log.aiQuoteCount = (log.aiQuoteCount || 0) + 1;
      await log.save();
    }

    res.json({ quote, cached: false });
  } catch (error) {
    console.error('Motivation error:', error);
    res.json({ quote: getRandomQuote(), cached: false });
  }
});

router.post('/api/ai/refresh-motivation', auth, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const log = await DailyLog.findOne({ userId: req.user._id, date: today });

    if (log && (log.aiQuoteCount || 0) >= 3) {
      return res.status(429).json({ error: 'Limite de 3 frases por dia atingido' });
    }

    const goals = await Goal.find({ userId: req.user._id, isActive: true });
    let completed = 0, maxStreak = 0;

    if (log) {
      completed = (log.completions || []).filter(c => c.completed).length;
    }
    for (const g of goals) {
      if (g.currentStreak > maxStreak) maxStreak = g.currentStreak;
    }

    const last7 = await DailyLog.find({ userId: req.user._id }).sort({ date: -1 }).limit(7);
    const weeklyRate = last7.length > 0
      ? Math.round(last7.reduce((s, l) => s + (l.completionRate || 0), 0) / last7.length)
      : 0;

    const quote = await generateMotivation({
      username: req.user.username,
      completed,
      total: goals.length,
      streak: maxStreak,
      weeklyRate,
      comparison: 'dados atualizados'
    });

    if (log) {
      log.aiQuote = quote;
      log.aiQuoteCount = (log.aiQuoteCount || 0) + 1;
      await log.save();
    }

    res.json({ quote, remaining: 3 - ((log?.aiQuoteCount || 0) + 1) });
  } catch (error) {
    console.error('Refresh motivation error:', error);
    res.json({ quote: getRandomQuote(), remaining: 0 });
  }
});

router.get('/api/ai/analysis', auth, async (req, res) => {
  try {
    const period = req.query.period || 'weekly';
    const today = new Date().toISOString().split('T')[0];
    const log = await DailyLog.findOne({ userId: req.user._id, date: today });

    if (log && log.aiAnalysis) {
      return res.json({ analysis: log.aiAnalysis, cached: true });
    }

    const summary = await getSummary(req.user._id, period);
    const strengths = await getStrengths(req.user._id, period);

    const perGoalRates = [...strengths.strengths, ...strengths.improvements, ...strengths.neutral]
      .map(g => `${g.name}: ${g.rate}%`).join(', ');

    const analysis = await generateAnalysis({
      perGoalRates: perGoalRates || 'sem dados suficientes',
      trend: summary.rateChange > 0 ? 'melhorando' : summary.rateChange < 0 ? 'caindo' : 'estável',
      best: strengths.strengths[0] ? `${strengths.strengths[0].name} (${strengths.strengths[0].rate}%)` : 'N/A',
      worst: strengths.improvements[0] ? `${strengths.improvements[0].name} (${strengths.improvements[0].rate}%)` : 'N/A',
      streaks: summary.bestStreak ? `${summary.bestStreak.days} dias (${summary.bestStreak.goalName})` : '0'
    });

    if (log) {
      log.aiAnalysis = analysis;
      await log.save();
    }

    res.json({ analysis, cached: false });
  } catch (error) {
    console.error('Analysis error:', error);
    res.json({ analysis: 'Continue registrando seus hábitos para gerar análises detalhadas!', cached: false });
  }
});

module.exports = router;
