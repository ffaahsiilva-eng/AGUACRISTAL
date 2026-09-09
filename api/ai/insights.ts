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
}
