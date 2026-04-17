import React from 'react';
import { LucideArrowRight, LucideBookOpen, LucideCalendar, LucideZap, LucideShieldCheck } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
  isLoggedIn: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted, onLogin, isLoggedIn }) => {
  const { skipToDemo } = useAppContext();

  const handleDemoSkip = async () => {
    if (confirm("Proceding with mock values? This will jump you straight to the dashboard.")) {
      await skipToDemo();
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-surface selection:bg-primary/20">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <LucideBookOpen className="text-white w-6 h-6" />
          </div>
          <span className="text-2xl font-headline font-extrabold text-primary tracking-tight">StudyOS</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={handleDemoSkip}
            className="hidden sm:block px-4 py-2 text-slate-500 font-medium hover:text-primary transition-colors text-sm"
          >
            Try Demo
          </button>
          <button
            onClick={isLoggedIn ? onGetStarted : onLogin}
            className="px-5 py-2 text-primary font-semibold hover:bg-primary/5 rounded-full transition-all"
          >
            {isLoggedIn ? 'Go to App' : 'Log In'}
          </button>
          {!isLoggedIn && (
            <button 
              onClick={onGetStarted}
              className="btn-primary py-2.5 px-6 text-sm"
            >
              Sign Up
            </button>
          )}
        </div>
      </nav>


      {/* Hero Section */}
      <main className="flex-1 flex flex-col pt-12">
        <div className="max-w-7xl mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="flex flex-col gap-8 animate-slide-up">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-secondary/10 border border-secondary/20 rounded-full w-fit">
              <span className="w-2 h-2 bg-secondary rounded-full animate-pulse"></span>
              <span className="text-sm font-semibold text-secondary">Powered by Sage Intelligence</span>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-headline font-extrabold leading-[1.1] text-on-surface">
              Master Your <span className="text-primary italic">Learning</span> with AI Precision
            </h1>
            
            <p className="text-xl text-outline max-w-lg leading-relaxed">
              StudyOS builds personalized study schedules, verifies your performance with AI, and guides you to academic excellence.
            </p>

            <div className="flex flex-wrap gap-4 pt-4">
              <button 
                onClick={onGetStarted}
                className="btn-primary py-5 px-10"
              >
                Create Your Account
                <LucideArrowRight className="w-5 h-5 opacity-70" />
              </button>
              
              <div className="flex items-center gap-4 px-6 py-4">
                <div className="flex -space-x-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-surface bg-surface-container-high overflow-hidden">
                      <img src={`https://i.pravatar.cc/100?u=${i}`} alt="user" />
                    </div>
                  ))}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-on-surface leading-none">12,000+</span>
                  <span className="text-xs text-outline">Students active</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 pt-8">
              <div className="flex flex-col gap-2">
                <div className="w-12 h-12 bg-surface-container-high rounded-xl flex items-center justify-center">
                  <LucideCalendar className="text-primary w-6 h-6" />
                </div>
                <h3 className="font-bold text-on-surface">Dynamic Schedule</h3>
                <p className="text-sm text-outline">Adapts based on your energy and missed sessions.</p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="w-12 h-12 bg-surface-container-high rounded-xl flex items-center justify-center">
                  <LucideShieldCheck className="text-secondary w-6 h-6" />
                </div>
                <h3 className="font-bold text-on-surface">Proof Verified</h3>
                <p className="text-sm text-outline">AI-powered verification to ensure you're learning.</p>
              </div>
            </div>
          </div>

          <div className="relative animate-scale-in">
            {/* Abstract visual representative of the product */}
            <div className="relative z-10 bg-surface-container-lowest p-6 rounded-[2.5rem] shadow-2xl border border-outline-variant/10 transform rotate-2">
              <div className="aspect-[4/5] bg-surface-container rounded-[2rem] overflow-hidden relative border border-outline-variant/10">
                <div className="absolute top-0 left-0 w-full h-1/3 bg-primary/10 flex items-center justify-center">
                  <div className="w-24 h-24 bg-primary rounded-3xl rotate-12 flex items-center justify-center shadow-xl shadow-primary/20">
                    <LucideZap className="text-on-primary w-12 h-12" />
                  </div>
                </div>
                <div className="absolute top-1/3 p-8 flex flex-col gap-6 w-full">
                  <div className="w-2/3 h-5 bg-surface-container-highest rounded-full"></div>
                  <div className="w-full h-5 bg-surface-container-high rounded-full opacity-60"></div>
                  <div className="w-5/6 h-5 bg-surface-container-high rounded-full opacity-40"></div>
                  <div className="mt-8 grid grid-cols-3 gap-4">
                    <div className="aspect-square bg-secondary rounded-2xl shadow-sm opacity-20"></div>
                    <div className="aspect-square bg-primary rounded-2xl shadow-sm opacity-20"></div>
                    <div className="aspect-square bg-tertiary rounded-2xl shadow-sm opacity-20"></div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Background elements */}
            <div className="absolute -top-10 -right-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-10"></div>
            <div className="absolute -bottom-20 -left-10 w-80 h-80 bg-secondary/10 rounded-full blur-3xl -z-10"></div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-24 px-6 py-8 border-t border-outline-variant/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="text-outline text-sm">© 2026 StudyOS by Sage Intelligence. All rights reserved.</span>
          <div className="flex gap-8">
            <a href="#" className="text-sm text-outline hover:text-primary">Privacy</a>
            <a href="#" className="text-sm text-outline hover:text-primary">Terms</a>
            <a href="#" className="text-sm text-outline hover:text-primary">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
