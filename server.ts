import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, Schema } from '@google/genai';


const app = express();
const PORT = 3000;

const fetchWithTimeout = async (promise, ms = 8000) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('timeout'));
    }, ms);
  });
  return Promise.race([
    promise.finally(() => clearTimeout(timeoutId)),
    timeoutPromise
  ]);
};


app.use(express.json({ limit: '10mb' }));

app.post('/api/ai/insights', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY || '';
    if (apiKey.startsWith('AQ.')) {
      return res.status(401).json({ error: 'Você está usando uma chave inválida (AQ...). Vá nas Configurações (Secrets) e troque pela chave correta que começa com "AIza...".' });
    }
    if (!apiKey) {
      return res.status(401).json({ error: 'Chave da API não encontrada. Adicione a variável GEMINI_API_KEY nas Configurações (Secrets).' });
    }
    const ai = new GoogleGenAI({ apiKey });
    const { clients, sales, expenses } = req.body;
    
    const prompt = `Você é um assistente proativo de negócio. Analise os seguintes dados e gere 3 avisos/insights curtos, diretos e úteis. Foque em anomalias, quedas de frequência de compra ou aumentos anormais de despesas. 
    Clientes: ${JSON.stringify(clients?.slice(0, 50))}
    Vendas recentes: ${JSON.stringify(sales?.slice(0, 100))}
    Despesas: ${JSON.stringify(expenses?.slice(0, 50))}`;

    const response = await fetchWithTimeout(ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING, description: 'warning, info, ou success' },
              title: { type: Type.STRING, description: 'Título curto do insight' },
              description: { type: Type.STRING, description: 'Descrição proativa e direta' }
            },
            required: ['type', 'title', 'description']
          }
        }
      }
    }));

    res.json(JSON.parse(response.text || '[]'));
  } catch (error) {
    console.error('INSIGHTS ERROR:', error);
    let errorMsg = 'Erro ao gerar insights';
    const errorStr = String(error).toLowerCase();
    
    if (!process.env.GEMINI_API_KEY) {
      errorMsg = 'ERRO: A chave da API (GEMINI_API_KEY) não foi encontrada nas configurações do servidor. Adicione a chave para a IA funcionar.';
    } else if (errorStr.includes('401') || errorStr.includes('unauthenticated') || errorStr.includes('invalid authentication')) {
      errorMsg = 'ERRO: A chave da API do Google é inválida ou incorreta. Verifique se copiou a chave certa.';
    }
    if (errorStr.includes('quota') || errorStr.includes('429') || errorStr.includes('resource_exhausted')) {
      errorMsg = 'Cota da API excedida.';
    } else if (errorStr.includes('503') || errorStr.includes('overloaded') || errorStr.includes('timeout')) {
      errorMsg = 'Serviço de IA sobrecarregado.';
    }
    res.status(500).json({ error: errorMsg, details: String(error) });
  }
});

app.post('/api/ai/chat', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY || '';
    if (apiKey.startsWith('AQ.')) {
      return res.status(401).json({ error: 'Você está usando uma chave inválida (AQ...). Vá nas Configurações (Secrets) e troque pela chave correta que começa com "AIza...".' });
    }
    if (!apiKey) {
      return res.status(401).json({ error: 'Chave da API não encontrada. Adicione a variável GEMINI_API_KEY nas Configurações (Secrets).' });
    }
    const ai = new GoogleGenAI({ apiKey });
    const { message, contextData } = req.body;
    
    const prompt = `Você é um assistente do sistema Gestão Água Cristal Sul. Responda a pergunta do usuário de forma direta e profissional, baseada nos seguintes dados de contexto fornecidos. 
    Contexto dos dados atuais: ${JSON.stringify(contextData)}
    
    Pergunta do usuário: ${message}`;

    const response = await fetchWithTimeout(ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt
    }));

    res.json({ reply: response.text });
  } catch (error) {
    console.error('CHAT ERROR:', error);
    let errorMsg = 'Desculpe, ocorreu um erro ao processar sua pergunta.';
    const errorStr = String(error).toLowerCase();
    if (errorStr.includes('quota') || errorStr.includes('429') || errorStr.includes('resource_exhausted')) {
      errorMsg = 'Sua cota da API do Gemini se esgotou. Por favor, verifique seu plano no Google AI Studio.';
    } else if (errorStr.includes('503') || errorStr.includes('overloaded') || errorStr.includes('timeout')) {
      errorMsg = 'A Inteligência Artificial está com alta demanda no momento. Aguarde alguns segundos e tente novamente.';
    }
    res.status(500).json({ error: errorMsg, details: String(error) });
  }
});

app.post('/api/ai/ocr', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY || '';
    if (apiKey.startsWith('AQ.')) {
      return res.status(401).json({ error: 'Você está usando uma chave inválida (AQ...). Vá nas Configurações (Secrets) e troque pela chave correta que começa com "AIza...".' });
    }
    if (!apiKey) {
      return res.status(401).json({ error: 'Chave da API não encontrada. Adicione a variável GEMINI_API_KEY nas Configurações (Secrets).' });
    }
    const ai = new GoogleGenAI({ apiKey });
    const { imageBase64, mimeType } = req.body;
    
    const prompt = `Analise este comprovante/recibo/nota fiscal. Extraia o valor total pago, a data e uma breve descrição do que se trata. Formate estritamente no JSON solicitado.`;

    const response = await fetchWithTimeout(ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [
        {
          inlineData: {
            data: imageBase64.split(',')[1],
            mimeType: mimeType
          }
        },
        prompt
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER, description: 'Valor total extraído, ex: 150.50' },
            date: { type: Type.STRING, description: 'Data extraída no formato YYYY-MM-DD' },
            description: { type: Type.STRING, description: 'Breve descrição do favorecido ou item' }
          },
          required: ['amount', 'date', 'description']
        }
      }
    }));

    res.json(JSON.parse(response.text || '{}'));
  } catch (error) {
    console.error('OCR ERROR:', error);
    let errorMsg = 'Erro ao analisar comprovante';
    const errorStr = String(error).toLowerCase();
    if (errorStr.includes('quota') || errorStr.includes('429') || errorStr.includes('resource_exhausted')) {
      errorMsg = 'Cota da API excedida. Verifique seu plano.';
    } else if (errorStr.includes('503') || errorStr.includes('overloaded') || errorStr.includes('timeout')) {
      errorMsg = 'Serviço de IA sobrecarregado no momento.';
    }
    res.status(500).json({ error: errorMsg, details: String(error) });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
