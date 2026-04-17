import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { ScheduleBlock, QuizQuestion } from '../types';
import { verifyPhotoProof, generateQuickQuiz, gradeQuizAnswers } from '../lib/proofVerifier';

interface ActionModalProps {
  block: ScheduleBlock;
  onClose: () => void;
  mode?: 'complete' | 'miss';
}

type ModalStep = 'options' | 'photo' | 'quiz' | 'quiz_taking' | 'quiz_result' | 'miss_options' | 'miss_text' | 'miss_voice' | 'success';

export const ActionModal: React.FC<ActionModalProps> = ({ block, onClose, mode = 'complete' }) => {
  const { markSessionComplete, markSessionMissed, updateScheduleBlock, userProfile } = useAppContext();
  
  const [step, setStep] = useState<ModalStep>(mode === 'complete' ? 'options' : 'miss_options');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verification State
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuizAnswers, setCurrentQuizAnswers] = useState<('A'|'B'|'C'|'D')[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [quizResult, setQuizResult] = useState<{ score: number; feedback: string } | null>(null);

  // Missed State
  const [reason, setReason] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  const getDuration = () => {
    const [sh, sm] = block.startTime.split(':').map(Number);
    const [eh, em] = block.endTime.split(':').map(Number);
    return (eh * 60 + em) - (sh * 60 + sm);
  };

  // --- Handlers ---

  const handleManualComplete = async () => {
    setIsLoading(true);
    try {
      await markSessionComplete(block.id, 'none');
      setStep('success');
    } catch (err) {
      setError('Failed to mark complete.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setPhotoData(base64);
      setIsLoading(true);
      setError(null);
      try {
        const result = await verifyPhotoProof(base64, block.subject, block.topic);
        if (result.verified) {
          await markSessionComplete(block.id, 'photo', result.confidence * 100);
          setStep('success');
        } else {
          setError(result.feedback || "Photo doesn't seem to match the study topic.");
        }
      } catch (err) {
        setError('Verification failed. Use manual complete or try again.');
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const startQuiz = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const sub = userProfile?.subjects.find(s => s.id === block.subjectId);
      const res = await generateQuickQuiz(block.subject, block.topic, sub?.difficulty || 5);
      setQuizQuestions(res.questions);
      setCurrentQuizAnswers([]);
      setCurrentQuestionIdx(0);
      setStep('quiz_taking');
    } catch (err) {
      setError('Failed to generate quiz. Try manual complete.');
    } finally {
      setIsLoading(false);
    }
  };

  const submitQuizAnswer = async (key: 'A'|'B'|'C'|'D') => {
    const newAnswers = [...currentQuizAnswers, key];
    setCurrentQuizAnswers(newAnswers);

    if (currentQuestionIdx < quizQuestions.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
    } else {
      setIsLoading(true);
      try {
        const result = await gradeQuizAnswers(block.subject, block.topic, quizQuestions, newAnswers);
        setQuizResult(result);
        await markSessionComplete(block.id, 'quiz', result.score);
        setStep('quiz_result');
      } catch (err) {
        setError('Grading failed.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const startVoiceRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Voice recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setReason(transcript);
    };
    recognition.onerror = () => setError("Voice capture failed.");

    recognition.start();
  };

  const handleMissSubmit = async () => {
    setIsLoading(true);
    try {
      await markSessionMissed(block.id, reason);
      setStep('success');
    } catch (err) {
      setError('Failed to log missed session.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Sub-screens ---

  const renderOptions = () => (
    <div className="space-y-6 animate-scale-in">
      <div className="space-y-2">
        <h3 className="font-headline text-xl font-semibold text-on-surface">Complete Session</h3>
        <p className="font-body text-sm text-on-surface-variant leading-relaxed">
          Sage needs proof for better analytics. How would you like to verify?
        </p>
      </div>
      
      <div className="grid gap-3">
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-4 p-4 rounded-[1rem] bg-surface-container-low border border-outline-variant/10 hover:bg-surface-container transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <span className="material-symbols-outlined">photo_camera</span>
          </div>
          <div className="flex-1">
            <p className="font-body font-semibold text-on-surface text-sm">Photo Proof</p>
            <p className="font-body text-xs text-on-surface-variant">Gemini Vision AI Verifier</p>
          </div>
          <span className="material-symbols-outlined text-outline text-sm">chevron_right</span>
        </button>

        <button 
          onClick={startQuiz}
          className="flex items-center gap-4 p-4 rounded-[1rem] bg-surface-container-low border border-outline-variant/10 hover:bg-surface-container transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-full bg-tertiary/10 text-tertiary flex items-center justify-center">
            <span className="material-symbols-outlined">quiz</span>
          </div>
          <div className="flex-1">
            <p className="font-body font-semibold text-on-surface text-sm">Quick Quiz</p>
            <p className="font-body text-xs text-on-surface-variant">3 Groq-generated questions</p>
          </div>
          <span className="material-symbols-outlined text-outline text-sm">chevron_right</span>
        </button>

        <button 
          onClick={handleManualComplete}
          className="flex items-center gap-4 p-4 rounded-[1rem] bg-surface-container-low border border-outline-variant/10 hover:bg-surface-container transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-full bg-surface-container-highest text-on-surface-variant flex items-center justify-center">
            <span className="material-symbols-outlined">check_circle</span>
          </div>
          <div className="flex-1">
            <p className="font-body font-semibold text-on-surface text-sm">Self-Verify</p>
            <p className="font-body text-xs text-on-surface-variant">Skip AI verification</p>
          </div>
          <span className="material-symbols-outlined text-outline text-sm">chevron_right</span>
        </button>
      </div>

      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handlePhotoUpload}
      />
    </div>
  );

  const renderQuizTaking = () => {
    const q = quizQuestions[currentQuestionIdx];
    if (!q) return null;

    return (
      <div className="space-y-6 animate-slide-up">
        <div className="flex justify-between items-center">
          <p className="font-label text-xs uppercase tracking-widest text-primary">Question {currentQuestionIdx + 1}/3</p>
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <div key={i} className={`w-8 h-1 rounded-full ${i <= currentQuestionIdx ? 'bg-primary' : 'bg-outline-variant/30'}`}></div>
            ))}
          </div>
        </div>
        
        <h3 className="font-headline text-lg font-bold text-on-surface leading-snug">{q.question}</h3>
        
        <div className="grid gap-3">
          {(['A', 'B', 'C', 'D'] as const).map(key => (
            <button
              key={key}
              onClick={() => submitQuizAnswer(key)}
              className="p-4 rounded-[1rem] bg-surface-container-low border border-outline-variant/20 hover:border-primary/50 text-left font-body text-sm text-on-surface transition-all active:scale-[0.98]"
            >
              <span className="font-bold mr-3 text-primary">{key}.</span> {q.options[key]}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderMissOptions = () => (
    <div className="space-y-6 animate-scale-in">
      <div className="space-y-2">
        <h3 className="font-headline text-xl font-semibold text-error">Mark as Missed</h3>
        <p className="font-body text-sm text-on-surface-variant leading-relaxed">
          It's okay to miss a session. Tell Sage why so she can adjust your plan.
        </p>
      </div>

      <div className="grid gap-3">
        <button 
          onClick={() => setStep('miss_voice')}
          className="flex items-center gap-4 p-4 rounded-[1rem] bg-surface-container-low border border-outline-variant/10 hover:bg-surface-container transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-full bg-error-container text-on-error-container flex items-center justify-center">
            <span className="material-symbols-outlined">mic</span>
          </div>
          <div className="flex-1">
            <p className="font-body font-semibold text-on-surface text-sm">Voice Reason</p>
            <p className="font-body text-xs text-on-surface-variant">Speak to Sage</p>
          </div>
          <span className="material-symbols-outlined text-outline text-sm">chevron_right</span>
        </button>

        <button 
          onClick={() => setStep('miss_text')}
          className="flex items-center gap-4 p-4 rounded-[1rem] bg-surface-container-low border border-outline-variant/10 hover:bg-surface-container transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-full bg-surface-container-highest text-on-surface-variant flex items-center justify-center">
            <span className="material-symbols-outlined">edit_note</span>
          </div>
          <div className="flex-1">
            <p className="font-body font-semibold text-on-surface text-sm">Type Reason</p>
            <p className="font-body text-xs text-on-surface-variant">Quick text note</p>
          </div>
          <span className="material-symbols-outlined text-outline text-sm">chevron_right</span>
        </button>
      </div>
    </div>
  );

  const renderVoiceStep = () => (
    <div className="space-y-8 text-center py-6 animate-scale-in">
      <div className="relative inline-block">
        <div className={`absolute inset-0 bg-primary/20 rounded-full animate-ping ${isRecording ? 'opacity-100' : 'opacity-0'}`}></div>
        <button 
          onClick={startVoiceRecording}
          disabled={isRecording}
          className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-primary text-on-primary scale-110' : 'bg-surface-container text-primary hover:bg-surface-container-high'}`}
        >
          <span className="material-symbols-outlined text-4xl">{isRecording ? 'graphic_eq' : 'mic'}</span>
        </button>
      </div>
      
      <div className="space-y-2">
        <h3 className="font-headline text-lg font-semibold text-on-surface">{isRecording ? "Listening..." : "Tap to speak"}</h3>
        <p className="font-body text-sm text-on-surface-variant px-4">
          {reason || "Sage is listening for your reason."}
        </p>
      </div>

      {reason && (
        <button 
          onClick={handleMissSubmit}
          className="w-full bg-primary text-on-primary py-4 rounded-full font-body font-medium shadow-cta"
        >
          Confirm Reason
        </button>
      )}
    </div>
  );

  const renderSuccess = () => (
    <div className="text-center space-y-6 py-6 animate-scale-in">
      <div className="w-20 h-20 bg-success-container text-on-success-container rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="material-symbols-outlined text-4xl icon-fill">check_circle</span>
      </div>
      <div className="space-y-2">
        <h3 className="font-headline text-2xl font-bold text-on-surface">Great effort!</h3>
        <p className="font-body text-sm text-on-surface-variant">
          Sage has updated your progress. Ready for the next one?
        </p>
      </div>
      <button 
        onClick={onClose}
        className="w-full cta-gradient text-on-primary py-4 rounded-full font-body font-medium shadow-cta transition-transform active:scale-95"
      >
        Continue
      </button>
    </div>
  );

  // --- Main Render ---

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-on-surface/50 backdrop-blur-xl animate-fade-in" onClick={onClose} />
      
      <div className="relative z-10 w-full max-w-md bg-surface-container-lowest rounded-[2rem] shadow-modal overflow-hidden border border-outline-variant/10">
        
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-50 bg-surface-container-lowest/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            <p className="font-body text-sm text-primary font-medium animate-pulse">Sage is thinking...</p>
          </div>
        )}

        {/* Dynamic Header */}
        <div className="px-6 pt-6 pb-2 flex justify-between items-start">
          <div className="space-y-1">
             <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-sm">history_edu</span>
                <span className="text-[10px] font-label font-bold uppercase tracking-widest text-primary/70">{block.subject}</span>
             </div>
             <h2 className="font-headline text-xl font-bold text-on-surface">{block.topic}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-container text-on-surface-variant transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 max-h-[70dvh] overflow-y-auto min-h-[300px]">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-error-container/50 border border-error/20 flex items-start gap-3 animate-shake">
              <span className="material-symbols-outlined text-error text-xl">error</span>
              <p className="text-xs font-body text-on-error-container flex-1">{error}</p>
            </div>
          )}

          {step === 'options' && renderOptions()}
          {step === 'quiz_taking' && renderQuizTaking()}
          {step === 'quiz_result' && (
            <div className="space-y-6 text-center animate-scale-in">
               <div className="text-5xl font-headline font-black text-primary">{quizResult?.score}%</div>
               <p className="font-body text-sm text-on-surface-variant leading-relaxed">{quizResult?.feedback}</p>
               <button onClick={() => setStep('success')} className="w-full cta-gradient text-on-primary py-4 rounded-full font-body font-medium shadow-cta">Great!</button>
            </div>
          )}
          {step === 'miss_options' && renderMissOptions()}
          {step === 'miss_voice' && renderVoiceStep()}
          {step === 'miss_text' && (
             <div className="space-y-6 animate-scale-in">
                <textarea 
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Tell Sage why... (e.g. classes ran late, feeling unwell)"
                  className="w-full h-32 p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 font-body text-sm focus:outline-none focus:border-primary transition-colors"
                />
                <button 
                  onClick={handleMissSubmit}
                  disabled={!reason.trim()}
                  className="w-full bg-primary text-on-primary py-4 rounded-full font-body font-medium shadow-cta disabled:opacity-50"
                >
                  Save Reason
                </button>
             </div>
          )}
          {step === 'success' && renderSuccess()}
        </div>

        {/* Footer Stats Tooltip */}
        <div className="px-6 py-4 bg-surface-container-low/50 border-t border-outline-variant/5 flex justify-between items-center text-outline">
           <div className="flex items-center gap-1">
             <span className="material-symbols-outlined text-xs">schedule</span>
             <span className="text-[10px] font-label font-medium uppercase tracking-tighter">{formatTime(block.startTime)} • {getDuration()} mins</span>
           </div>
           {step !== 'success' && step !== 'options' && step !== 'miss_options' && (
              <button onClick={() => setStep(mode === 'complete' ? 'options' : 'miss_options')} className="text-[10px] font-label font-bold uppercase text-primary hover:underline">Go Back</button>
           )}
        </div>
      </div>
    </div>
  );
};
