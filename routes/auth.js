const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Goal = require('../models/Goal');
const { checkAchievements } = require('../services/achievements');
const router = express.Router();

function generateToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function setCookie(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

router.get('/login', (req, res) => {
  try {
    const token = req.cookies.token;
    if (token) {
      jwt.verify(token, process.env.JWT_SECRET);
      return res.redirect('/dashboard');
    }
  } catch (e) {}
  res.render('login', { error: null });
});

router.get('/register', (req, res) => {
  try {
    const token = req.cookies.token;
    if (token) {
      jwt.verify(token, process.env.JWT_SECRET);
      return res.redirect('/dashboard');
    }
  } catch (e) {}
  res.render('register', { error: null });
});

router.post('/register', async (req, res) => {
  try {
    const { username, password, confirmPassword } = req.body;
    const cleanUsername = (username || '').trim().toLowerCase();

    if (cleanUsername.length < 3) {
      return res.render('register', { error: 'Username deve ter pelo menos 3 caracteres' });
    }
    if (!password || password.length < 6) {
      return res.render('register', { error: 'Senha deve ter pelo menos 6 caracteres' });
    }
    if (password !== confirmPassword) {
      return res.render('register', { error: 'Senhas não conferem' });
    }

    const existing = await User.findOne({ username: cleanUsername });
    if (existing) {
      return res.render('register', { error: 'Username já está em uso' });
    }

    const user = await User.create({
      username: cleanUsername,
      password
    });

    const defaultGoals = [
      { userId: user._id, name: 'Academia/Treino', icon: '🏋️', effortLevel: 'effort', frequency: { type: 'daily' }, order: 0 },
      { userId: user._id, name: 'Alimentação Saudável', icon: '🥗', effortLevel: 'light', frequency: { type: 'daily' }, order: 1 },
      { userId: user._id, name: 'Hidratação 2L', icon: '💧', effortLevel: 'light', frequency: { type: 'daily' }, order: 2 },
      { userId: user._id, name: 'Estudo 1h', icon: '📚', effortLevel: 'light', frequency: { type: 'daily' }, order: 3 }
    ];
    await Goal.insertMany(defaultGoals);

    await checkAchievements(user._id);

    const token = generateToken(user._id);
    setCookie(res, token);
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Register error:', error);
    res.render('register', { error: 'Erro ao criar conta. Tente novamente.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const cleanUsername = (username || '').trim().toLowerCase();

    const user = await User.findOne({ username: cleanUsername });
    if (!user) {
      return res.render('login', { error: 'Usuário ou senha inválidos' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.render('login', { error: 'Usuário ou senha inválidos' });
    }

    const now = new Date();
    const lastLogin = user.lastLoginAt ? new Date(user.lastLoginAt) : null;
    const diffDays = lastLogin ? Math.floor((now - lastLogin) / 86400000) : 0;

    if (diffDays === 1) {
      user.consecutiveLogins += 1;
    } else if (diffDays > 1) {
      user.consecutiveLogins = 1;
    }
    user.lastLoginAt = now;
    await user.save();

    await checkAchievements(user._id);

    const token = generateToken(user._id);
    setCookie(res, token);
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Login error:', error);
    res.render('login', { error: 'Erro ao fazer login. Tente novamente.' });
  }
});

router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/login');
});

module.exports = router;
