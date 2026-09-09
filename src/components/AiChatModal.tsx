import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, User, Loader2, Trash2 } from 'lucide-react';

interface AiChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  contextData: any;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const INITIAL_MESSAGE: Message = { 
  role: 'assistant', 
  content: 'Olá! Sou a IA Assistente da Água Cristal Sul. Posso analisar seus clientes, vendas e faturamento. Como posso ajudar hoje?' 
};

export const AiChatModal: React.FC<AiChatModalProps> = ({ isOpen, onClose, contextData }) => {
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('gestao-agua-cristal-chat');
    return saved ? JSON.parse(saved) : [INITIAL_MESSAGE];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('gestao-agua-cristal-chat', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleClearChat = () => {
    if (window.confirm('Deseja realmente apagar o histórico de mensagens?')) {
      setMessages([INITIAL_MESSAGE]);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, contextData })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Falha ao comunicar com a IA');
      
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: err.message || 'Desculpe, ocorreu um erro ao processar sua pergunta. Tente novamente mais tarde.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-end sm:justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-opacity">
      <div className="bg-white w-full max-w-lg h-[600px] max-h-[90vh] rounded-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-8">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-gradient-to-r from-sky-50 to-indigo-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center text-white shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800">Assistente IA</h2>
              <p className="text-xs text-slate-500">Água Cristal Sul</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleClearChat}
              title="Apagar conversa"
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-white rounded-full transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === 'user' ? 'bg-slate-200 text-slate-600' : 'bg-sky-100 text-sky-600'
              }`}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              </div>
              <div className={`p-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-slate-800 text-white rounded-tr-none' 
                  : 'bg-white text-slate-700 border border-slate-200 shadow-sm rounded-tl-none'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex gap-3 max-w-[85%]">
              <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm rounded-tl-none flex gap-1">
                <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={endOfMessagesRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-100 rounded-b-2xl">
          <div className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Pergunte sobre faturamento, clientes, despesas..."
              className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm"
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="absolute right-2 p-2 text-sky-600 hover:bg-sky-50 rounded-lg disabled:opacity-50 transition-colors"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
          <div className="text-center mt-2">
            <p className="text-[10px] text-slate-400">A IA pode cometer erros. Verifique informações importantes.</p>
          </div>
        </div>

      </div>
    </div>
  );
};
