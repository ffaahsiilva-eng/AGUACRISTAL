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
    const { clients, sales, expenses } = req.body;
    
    const prompt = `Você é um assistente proativo de negócio. Analise os seguintes dados e gere 3 avisos/insights curtos, diretos e úteis. Foque em anomalias, quedas de frequência de compra ou aumentos anormais de despesas. 
    Clientes: ${JSON.stringify(clients?.slice(0, 50))}
    Vendas recentes: ${JSON.stringify(sales?.slice(0, 100))}
    Despesas: ${JSON.stringify(expenses?.slice(0, 50))}`;

    const response = await fetchWithTimeout(ai.models.generateContent({
      model: 'gemini-2.5-flash',
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
    
    if (errorStr.includes('quota') || errorStr.includes('429') || errorStr.includes('resource_exhausted')) {
      errorMsg = 'Cota da API excedida.';
    } else if (errorStr.includes('503') || errorStr.includes('overloaded') || errorStr.includes('timeout')) {
      errorMsg = 'Serviço de IA sobrecarregado.';
    }
    
    res.status(500).json({ error: errorMsg, details: String(error) });
  }
}
