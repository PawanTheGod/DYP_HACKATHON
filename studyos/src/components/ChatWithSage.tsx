import React, { useState, useRef, useEffect } from 'react';
import Groq from 'groq-sdk';
import { ENV } from '../config/env';
import { generateSagePrompt } from '../lib/sageSystemPrompt';
import { useAppContext } from '../context/AppContext';

const groq = new Groq({
  apiKey: ENV.GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
});

interface ChatWithSageProps {
  onClose?: () => void;
}

export const ChatWithSage: React.FC<ChatWithSageProps> = ({ onClose }) => {
  const { userProfile } = useAppContext();
  const [messages, setMessages] = useState([
    { id: 1, text: "Hi! I'm Sage, your study partner. How can I help you reach your goals today?", sender: 'sage' },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userText = input.trim();
    const newMsg = { id: Date.now(), text: userText, sender: 'user' };
    setMessages(prev => [...prev, newMsg]);
    setInput('');
    setIsLoading(true);
    
    try {
      const history = messages.map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant' as const,
        content: m.text
      }));

      const systemPrompt = generateSagePrompt(userProfile, 'companion_chat');
      
      const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          ...history,
          { role: 'user', content: userText }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const reply = response.choices[0]?.message?.content || "I'm having trouble processing that right now. Let's try again?";
      
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: reply,
        sender: 'sage'
      }]);
    } catch (error) {
      console.error('Sage Chat Error:', error);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: "I lost my connection to the neural network. Can you repeat that?",
        sender: 'sage'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] max-w-2xl mx-auto bg-white rounded-[2.5rem] shadow-card border border-outline-variant/10 overflow-hidden relative">
      {/* Glossy Header */}
      <div className="p-8 pb-4 bg-white/80 backdrop-blur-md border-b border-outline-variant/5 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          {onClose && (
            <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-surface-container active:scale-95 transition-all text-on-surface-variant">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
          )}
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center relative">
            <span className="material-symbols-outlined text-primary icon-fill">psychology</span>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-white"></div>
          </div>
          <div>
            <h3 className="font-headline font-extrabold text-on-surface">Sage AI</h3>
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Strategic Interface</p>
          </div>
        </div>
        <button className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-outline-variant hover:bg-surface-container transition-colors">
          <span className="material-symbols-outlined">more_vert</span>
        </button>
      </div>

      {/* Messages Window */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-8 flex flex-col gap-6 no-scrollbar"
      >
        {/* Message history */}
        {messages.map((msg) => (
          <div 
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
          >
            <div className={`max-w-[85%] px-6 py-4 rounded-[1.75rem] font-body text-base leading-relaxed shadow-sm
              ${msg.sender === 'user' 
                ? 'bg-primary text-white rounded-tr-none' 
                : 'bg-surface-container-low text-on-surface rounded-tl-none border border-outline-variant/5'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start animate-fade-in">
             <div className="px-6 py-4 rounded-2xl bg-surface-container-low text-primary flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0.4s]"></div>
                <span className="text-[10px] font-bold uppercase tracking-widest ml-1">Sage is thinking</span>
             </div>
          </div>
        )}
      </div>

      {/* Input Module */}
      <div className="p-6 bg-white border-t border-outline-variant/5">
        <div className="flex gap-3 bg-surface-container-low rounded-[2rem] p-2 pr-3 border border-outline-variant/10 focus-within:border-primary/20 focus-within:bg-white focus-within:shadow-md transition-all">
          <button className="w-10 h-10 rounded-full flex items-center justify-center text-outline hover:text-primary transition-colors">
            <span className="material-symbols-outlined">add</span>
          </button>
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Discuss your study strategy..."
            className="flex-1 bg-transparent border-none outline-none font-body text-on-surface placeholder:text-outline/40"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim()}
            className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 disabled:grayscale disabled:opacity-50 transition-all"
          >
            <span className="material-symbols-outlined text-sm">send</span>
          </button>
        </div>
      </div>
    </div>
  );
};

