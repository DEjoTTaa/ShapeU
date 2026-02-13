require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const connectDB = require('./config/db');
const { initGemini } = require('./services/gemini');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '7d' : 0
}));

let dbConnected = false;
app.use(async (req, res, next) => {
  if (!dbConnected) {
    await connectDB();
    initGemini();
    dbConnected = true;
  }
  next();
});

app.use('/', require('./routes/auth'));
app.use('/', require('./routes/dashboard'));
app.use('/', require('./routes/goals'));
app.use('/', require('./routes/stats'));
app.use('/', require('./routes/achievements'));
app.use('/', require('./routes/profile'));
app.use('/', require('./routes/metas'));
app.use('/', require('./routes/ai'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'Arquivo muito grande. Máximo 2MB.' });
  }
  res.status(500).json({ error: 'Erro interno do servidor' });
});

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  connectDB().then(() => {
    initGemini();
    dbConnected = true;
    app.listen(PORT, () => {
      console.log(`ShapeU rodando na porta ${PORT}`);
      console.log(`http://localhost:${PORT}`);
    });
  }).catch(err => {
    console.error('Falha ao iniciar:', err);
    process.exit(1);
  });
}

module.exports = app;
