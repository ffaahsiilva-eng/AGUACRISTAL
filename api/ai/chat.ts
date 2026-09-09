import { GoogleGenAI, Type } from '@google/genai';



const fetchWithTimeout = async (promise: Promise<any>, ms = 8000) => {
  let timeoutId: any;
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

export default async function handler(req: any, res: any) {
  const apiKey = process.env.GEMINI_API_KEY || '';
  if (apiKey.startsWith('AQ.')) {
    return res.status(401).json({ error: 'Você está usando uma chave inválida (AQ...). Vá nas Configurações (Secrets) e troque pela chave correta que começa com "AIza...".' });
  }
  if (!apiKey) {
    return res.status(401).json({ error: 'Chave da API não encontrada. Adicione a variável GEMINI_API_KEY nas Configurações (Secrets).' });
  }
  const ai = new GoogleGenAI({ apiKey });
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
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
    
    if (!process.env.GEMINI_API_KEY) {
      errorMsg = 'ERRO: A chave da API (GEMINI_API_KEY) não foi encontrada nas configurações do servidor. Adicione a chave para a IA funcionar.';
    } else if (errorStr.includes('401') || errorStr.includes('unauthenticated') || errorStr.includes('invalid authentication')) {
      errorMsg = 'ERRO: A chave da API do Google é inválida ou incorreta. Verifique se copiou a chave certa.';
    }
    
    if (errorStr.includes('quota') || errorStr.includes('429') || errorStr.includes('resource_exhausted')) {
      errorMsg = 'Sua cota da API do Gemini se esgotou. Por favor, verifique seu plano no Google AI Studio.';
    } else if (errorStr.includes('503') || errorStr.includes('overloaded') || errorStr.includes('timeout')) {
      errorMsg = 'A Inteligência Artificial está com alta demanda no momento. Aguarde alguns segundos e tente novamente.';
    }
    
    res.status(500).json({ error: errorMsg, details: String(error) });
  }
}
