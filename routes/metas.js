const express = require('express');
const { auth } = require('../middleware/auth');
const Meta = require('../models/Meta');
const router = express.Router();

router.get('/api/metas', auth, async (req, res) => {
  try {
    const metas = await Meta.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(metas);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar metas' });
  }
});

router.post('/api/metas', auth, async (req, res) => {
  try {
    const { name, icon, targetValue, unit, startDate, endDate, linkedGoalId } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nome da meta é obrigatório' });
    }
    if (!targetValue || targetValue < 1) {
      return res.status(400).json({ error: 'Valor alvo deve ser pelo menos 1' });
    }
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Datas de início e fim são obrigatórias' });
    }

    const meta = await Meta.create({
      userId: req.user._id,
      name: name.trim(),
      icon: icon || '🎯',
      targetValue,
      unit: unit || 'vezes',
      startDate,
      endDate,
      linkedGoalId: linkedGoalId || null
    });

    res.json(meta);
  } catch (error) {
    console.error('Create meta error:', error);
    res.status(500).json({ error: 'Erro ao criar meta' });
  }
});

router.put('/api/metas/:id', auth, async (req, res) => {
  try {
    const meta = await Meta.findOne({ _id: req.params.id, userId: req.user._id });
    if (!meta) return res.status(404).json({ error: 'Meta não encontrada' });

    const { name, icon, targetValue, unit, startDate, endDate, linkedGoalId, currentValue } = req.body;

    if (name) meta.name = name.trim();
    if (icon) meta.icon = icon;
    if (targetValue !== undefined) meta.targetValue = targetValue;
    if (unit) meta.unit = unit;
    if (startDate) meta.startDate = startDate;
    if (endDate) meta.endDate = endDate;
    if (linkedGoalId !== undefined) meta.linkedGoalId = linkedGoalId || null;
    if (currentValue !== undefined) meta.currentValue = currentValue;

    if (meta.currentValue >= meta.targetValue && !meta.isCompleted) {
      meta.currentValue = meta.targetValue;
      meta.isCompleted = true;
      meta.completedAt = new Date();
    }

    await meta.save();
    res.json(meta);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar meta' });
  }
});

router.delete('/api/metas/:id', auth, async (req, res) => {
  try {
    const meta = await Meta.findOne({ _id: req.params.id, userId: req.user._id });
    if (!meta) return res.status(404).json({ error: 'Meta não encontrada' });

    await Meta.deleteOne({ _id: meta._id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir meta' });
  }
});

module.exports = router;
