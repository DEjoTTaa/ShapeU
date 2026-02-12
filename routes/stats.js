const express = require('express');
const { auth } = require('../middleware/auth');
const { getSummary, getChartData, getStrengths } = require('../services/stats');
const router = express.Router();

router.get('/api/stats/summary', auth, async (req, res) => {
  try {
    const period = req.query.period || 'daily';
    const summary = await getSummary(req.user._id, period);
    res.json(summary);
  } catch (error) {
    console.error('Stats summary error:', error);
    res.status(500).json({ error: 'Erro ao buscar resumo' });
  }
});

router.get('/api/stats/charts', auth, async (req, res) => {
  try {
    const period = req.query.period || 'daily';
    const type = req.query.type || 'evolution';
    const data = await getChartData(req.user._id, period, type);
    res.json(data);
  } catch (error) {
    console.error('Stats charts error:', error);
    res.status(500).json({ error: 'Erro ao buscar dados do gráfico' });
  }
});

router.get('/api/stats/strengths', auth, async (req, res) => {
  try {
    const period = req.query.period || 'daily';
    const data = await getStrengths(req.user._id, period);
    res.json(data);
  } catch (error) {
    console.error('Stats strengths error:', error);
    res.status(500).json({ error: 'Erro ao buscar pontos fortes' });
  }
});

module.exports = router;
