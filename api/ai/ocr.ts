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
    const { imageBase64, mimeType } = req.body;
    
    const prompt = `Analise este comprovante/recibo/nota fiscal. Extraia o valor total pago, a data e uma breve descrição do que se trata. Formate estritamente no JSON solicitado.`;

    const response = await fetchWithTimeout(ai.models.generateContent({
      model: 'gemini-2.5-flash',
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
}
