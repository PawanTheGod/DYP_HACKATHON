import React, { useState } from 'react';
import { LucideMail, LucideLock, LucideUser, LucideArrowRight, LucideBookOpen, LucideChevronLeft } from 'lucide-react';

interface AuthScreenProps {
  onBack: () => void;
  onAuthSuccess: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onBack, onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Mimic auth delay
    setTimeout(() => {
      setIsLoading(false);
      onAuthSuccess();
    }, 1500);
  };

  return (
    <div className="flex flex-col min-h-screen bg-surface-container-low items-center justify-center p-6">
      <button 
        onClick={onBack}
        className="absolute top-8 left-8 flex items-center gap-2 text-outline hover:text-primary transition-colors"
      >
        <LucideChevronLeft className="w-5 h-5" />
        Back to Home
      </button>

      <div className="w-full max-w-md animate-scale-in">
        <div className="flex flex-col items-center gap-4 mb-10">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20">
            <LucideBookOpen className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-headline font-extrabold text-on-surface">
            {isLogin ? 'Welcome Back' : 'Join StudyOS'}
          </h1>
          <p className="text-outline text-center">
            {isLogin 
              ? 'Enter your credentials to continue your journey.' 
              : 'Create your account to start mastering your learning.'}
          </p>
        </div>

        <div className="bg-surface-container-lowest p-10 rounded-[2.5rem] shadow-card border border-outline-variant/10">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {!isLogin && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-on-surface ml-1">Full Name</label>
                <div className="relative">
                  <LucideUser className="absolute left-4 top-1/2 -translate-y-1/2 text-outline w-5 h-5" />
                  <input 
                    type="text" 
                    placeholder="John Doe" 
                    className="w-full pl-12 pr-4 py-4 bg-surface-container rounded-2xl border-2 border-transparent focus:border-primary/20 focus:bg-surface-container-lowest outline-none transition-all font-medium text-on-surface"
                    required
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-on-surface ml-1">Email Address</label>
              <div className="relative">
                <LucideMail className="absolute left-4 top-1/2 -translate-y-1/2 text-outline w-5 h-5" />
                <input 
                  type="email" 
                  placeholder="name@email.com" 
                  className="w-full pl-12 pr-4 py-4 bg-surface-container rounded-2xl border-2 border-transparent focus:border-primary/20 focus:bg-surface-container-lowest outline-none transition-all font-medium text-on-surface"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-on-surface ml-1">Password</label>
              <div className="relative">
                <LucideLock className="absolute left-4 top-1/2 -translate-y-1/2 text-outline w-5 h-5" />
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  className="w-full pl-12 pr-4 py-4 bg-surface-container rounded-2xl border-2 border-transparent focus:border-primary/20 focus:bg-surface-container-lowest outline-none transition-all font-medium text-on-surface"
                  required
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full mt-4"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <LucideArrowRight className="w-5 h-5 opacity-70" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-outline-variant/10 flex flex-col items-center gap-4">
            <p className="text-sm text-outline">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
            </p>
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary font-bold hover:text-primary-container transition-colors"
            >
              {isLogin ? 'Create Account' : 'Sign In Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
