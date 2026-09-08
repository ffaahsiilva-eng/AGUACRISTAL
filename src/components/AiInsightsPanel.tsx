import React, { useState, useEffect } from 'react';
import { Sparkles, AlertCircle, TrendingUp, Info } from 'lucide-react';

interface Insight {
  type: 'warning' | 'info' | 'success';
  title: string;
  description: string;
}

interface AiInsightsPanelProps {
  clients: any[];
  sales: any[];
  expenses: any[];
}

export const AiInsightsPanel: React.FC<AiInsightsPanelProps> = ({ clients, sales, expenses }) => {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Only fetch if we have data to avoid empty insights
    if (clients.length > 0 && sales.length > 0) {
      generateInsights();
    }
  }, [clients.length, sales.length]);

  const generateInsights = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clients, sales, expenses })
      });
      if (!response.ok) throw new Error('Falha ao obter insights');
      const data = await response.json();
      setInsights(data);
    } catch (err) {
      console.error(err);
      setError('Não foi possível gerar os insights agora.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center justify-center min-h-[160px]">
        <Sparkles className="w-8 h-8 text-sky-400 animate-pulse mb-3" />
        <p className="text-sm text-slate-500 font-medium">A IA está analisando seus dados...</p>
      </div>
    );
  }

  if (error || insights.length === 0) {
    return null;
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertCircle className="w-5 h-5 text-rose-500" />;
      case 'success': return <TrendingUp className="w-5 h-5 text-emerald-500" />;
      default: return <Info className="w-5 h-5 text-sky-500" />;
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-sky-50 rounded-xl shadow-sm border border-indigo-100 p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-indigo-500" />
        <h3 className="text-lg font-bold text-slate-800">Insights Inteligentes</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {insights.map((insight, index) => (
          <div key={index} className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-white shadow-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">{getIcon(insight.type)}</div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-1">{insight.title}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{insight.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
