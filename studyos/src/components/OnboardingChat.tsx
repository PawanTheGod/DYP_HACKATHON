import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { processOnboardingTurn, parseOnboardingChat } from '../lib/onboardingPipeline';
import { ChatMessage, UserProfile } from '../types';
import { setOnboardingComplete } from '../lib/dataStore';

export const OnboardingChat: React.FC = () => {
  const { setUserProfile, skipToDemo } = useAppContext();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Setup initial message
  useEffect(() => {
    let mounted = true;
    if (messages.length === 0 && !isProcessing) {
      setIsProcessing(true);
      processOnboardingTurn([], null)
        .then(({ nextMessage }) => {
          if (mounted) {
            setMessages([nextMessage]);
          }
        })
        .finally(() => {
          if (mounted) setIsProcessing(false);
        });
    }
    return () => { mounted = false; };
  }, [messages.length, isProcessing]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isProcessing || finalizing) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString()
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputText('');
    setIsProcessing(true);

    try {
      const { nextMessage, isSummaryReady } = await processOnboardingTurn(newHistory, text.trim());
      const updatedHistory = [...newHistory, nextMessage];
      setMessages(updatedHistory);

      if (isSummaryReady) {
        setFinalizing(true);
        const profile = await parseOnboardingChat(updatedHistory);
        
        await setUserProfile(profile);
        await setOnboardingComplete(true);
        window.location.reload(); // Refresh to trigger dashboard entry
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'sage', content: 'Oops, something went wrong on my end. Can you repeat that?', timestamp: new Date().toISOString() }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSkipToDashboard = async () => {
    const confirmSkip = window.confirm("Proceding with mock values? This will bypass the onboarding chat.");
    if (!confirmSkip) return;

    setFinalizing(true);
    // Simulate some "AI" processing time for flavor
    await new Promise(r => setTimeout(r, 1000));
    await skipToDemo();
  };

  const toggleRecording = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      alert("Voice input is not supported in this browser.");
      return;
    }

    if (isRecording) {
      // Stopping is handled automatically by the 'end' event when they stop talking, 
      // but we could forcefully stop here. For simplicity, let it terminate itself.
    } else {
      const recognition = new SpeechRec();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsRecording(true);
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(prev => prev ? `${prev} ${transcript}` : transcript);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsRecording(false);
      };

      recognition.onend = () => setIsRecording(false);
      recognition.start();
    }
  };

  if (finalizing) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-surface-container-lowest rounded-2xl shadow-card relative overflow-hidden glass-gradient">
        <span className="material-symbols-outlined text-6xl text-primary animate-pulse mb-4" data-icon="auto_awesome">auto_awesome</span>
        <h2 className="text-xl font-headline font-bold text-on-surface">Building Your Study Plan</h2>
        <p className="text-sm font-body text-outline mt-2 text-center">Parsing your inputs and finalizing the perfect schedule based on your energy and deadlines...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-surface-container-low rounded-[2rem] shadow-card overflow-hidden border border-outline-variant/20 relative glass-gradient">
      
      {/* Header */}
      <div className="p-4 border-b border-outline-variant/10 bg-surface-container/30 backdrop-blur-md flex items-center gap-3 relative z-10">
        <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined icon-fill">robot_2</span>
        </div>
        <div className="flex-1">
            <h2 className="font-headline font-semibold text-on-surface leading-tight">Sage Interface</h2>
            <p className="text-[10px] font-body text-outline uppercase tracking-widest leading-none mt-0.5">Onboarding Assistant</p>
        </div>
        <button
          onClick={handleSkipToDashboard}
          className="px-4 py-2 rounded-xl bg-surface-container-highest text-on-surface-variant font-headline text-[10px] font-bold uppercase tracking-widest hover:bg-on-surface hover:text-surface transition-all active:scale-95 shadow-sm"
        >
          Skip to Dashboard
        </button>
      </div>

      {/* Message List */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 flex flex-col relative z-10">
        {messages.map(m => (
          <div key={m.id} className={`max-w-[85%] flex ${m.role === 'user' ? 'self-end' : 'self-start'}`}>
            <div className={`p-4 rounded-2xl ${m.role === 'user' ? 'bg-on-surface text-surface rounded-br-sm shadow-md' : 'bg-surface-container-lowest text-on-surface rounded-bl-sm shadow-card-sm'}`}>
              <p className="text-sm font-body leading-relaxed">{m.content}</p>
            </div>
          </div>
        ))}
        {isProcessing && (
          <div className="self-start max-w-[80%] flex">
            <div className="p-4 rounded-2xl bg-surface-container-lowest text-on-surface rounded-bl-sm shadow-card-sm flex gap-2">
              <div className="w-2 h-2 rounded-full bg-outline animate-bounce"></div>
              <div className="w-2 h-2 rounded-full bg-outline animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-outline animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}
      </div>

      {/* Input Box */}
      <div className="p-4 bg-surface-container-lowest border-t border-outline-variant/20 relative z-10">
        <div className="relative flex items-center p-2 rounded-full bg-surface-container">
          <input
            type="text"
            className="flex-1 bg-transparent px-4 py-2 font-body text-sm text-on-surface focus:outline-none"
            placeholder="Type your response..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend(inputText)}
            disabled={isProcessing || isRecording}
          />
          <button 
            type="button"
            onClick={toggleRecording}
            className={`p-2 rounded-full transition-colors mr-1 ${isRecording ? 'bg-error text-on-error animate-pulse' : 'text-primary hover:bg-surface-container-high'}`}
          >
            <span className="material-symbols-outlined icon-fill">mic</span>
          </button>
          <button 
            type="button"
            onClick={() => handleSend(inputText)}
            disabled={!inputText.trim() || isProcessing || isRecording}
            className="p-2 rounded-full bg-on-surface text-surface disabled:opacity-50 transition-opacity"
          >
            <span className="material-symbols-outlined icon-fill transform -rotate-45 ml-1">send</span>
          </button>
        </div>
      </div>

    </div>
  );
};
