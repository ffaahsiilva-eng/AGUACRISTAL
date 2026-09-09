import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
      model: 'gemini-2.5-flash',
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
}
