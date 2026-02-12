const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
let quotes;
try {
  quotes = require(path.join(__dirname, '..', 'data', 'quotes.json'));
} catch (e) {
  quotes = { quotes: [{ text: 'Continue evoluindo, cada passo conta!' }] };
}

let genAI = null;
let model = null;

function initGemini() {
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
    try {
      genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    } catch (e) {
      console.warn('Gemini init falhou:', e.message);
    }
  }
}

function getRandomQuote() {
  const allQuotes = quotes.quotes || quotes;
  const arr = Array.isArray(allQuotes) ? allQuotes : [{ text: 'Cada dia é uma nova chance de evoluir!' }];
  const q = arr[Math.floor(Math.random() * arr.length)];
  return typeof q === 'string' ? q : q.text;
}

async function classifyEffort(goalName) {
  if (!model) return 'light';
  try {
    const prompt = `Classifique a seguinte meta como 'light' ou 'effort'. 'effort' = exige esforço físico (academia, corrida, natação, crossfit) OU superação de vícios (parar de fumar, beber, jogar, apostar). 'light' = não exige esforço físico nem superação de vícios (leitura, hidratação, meditação). Meta: '${goalName}'. Responda APENAS com 'light' ou 'effort'.`;
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim().toLowerCase();
    return text === 'effort' ? 'effort' : 'light';
  } catch (e) {
    console.warn('Gemini classifyEffort falhou:', e.message);
    return 'light';
  }
}

async function generateMotivation(userData) {
  if (!model) return getRandomQuote();
  try {
    const prompt = `Você é um coach motivacional do app ShapeU. Dados do usuário: Nome: ${userData.username}, Metas concluídas hoje: ${userData.completed || 0}/${userData.total || 0}, Streak atual mais longo: ${userData.streak || 0} dias, Taxa semanal: ${userData.weeklyRate || 0}%, Comparativo: ${userData.comparison || 'sem dados anteriores'}. Gere UMA frase motivacional curta (máx 2 linhas) em português brasileiro, tom energético e positivo. Use os dados reais. Sem clichês genéricos. Apenas a frase, sem aspas.`;
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (e) {
    console.warn('Gemini motivation falhou:', e.message);
    return getRandomQuote();
  }
}

async function generateAnalysis(statsData) {
  if (!model) return 'Análise indisponível no momento. Continue fazendo seus check-ins para acumular dados!';
  try {
    const prompt = `Analise os dados de rotina e gere um parágrafo curto (3-4 linhas) com insights em português brasileiro: Taxa por meta: ${statsData.perGoalRates || 'sem dados'}, Evolução: ${statsData.trend || 'estável'}, Melhor meta: ${statsData.best || 'N/A'}, Pior meta: ${statsData.worst || 'N/A'}, Streaks: ${statsData.streaks || '0'}. Destaque positivos primeiro (em tom verde/positivo), depois sugira melhorias (tom construtivo). Use dados reais, sem generalidades. Apenas o parágrafo.`;
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (e) {
    console.warn('Gemini analysis falhou:', e.message);
    return 'Continue registrando seus hábitos diariamente para gerar análises detalhadas!';
  }
}

module.exports = { initGemini, classifyEffort, generateMotivation, generateAnalysis, getRandomQuote };
