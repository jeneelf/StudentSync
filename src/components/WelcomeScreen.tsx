import React from 'react';
import { 
  BookOpen, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  FileText, 
  Layers, 
  CheckCircle2 
} from 'lucide-react';

interface WelcomeScreenProps {
  onStartSetup: () => void;
}

export default function WelcomeScreen({ onStartSetup }: WelcomeScreenProps) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between p-4 sm:p-8 lg:p-10 font-sans antialiased">
      {/* Top Brand Bar */}
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-purple-600 flex items-center justify-center text-white shadow-md shadow-purple-600/25">
            <BookOpen size={20} />
          </div>
          <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white">
            Nexus Study
          </span>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <span>Learning System</span>
        </div>
      </header>

      {/* Main Welcoming Card */}
      <main className="max-w-2xl mx-auto w-full my-auto text-center py-8 sm:py-12 space-y-6 sm:space-y-8 px-2">
        {/* Subtle decorative icon */}
        <div className="mx-auto w-16 h-16 rounded-3xl bg-purple-100 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/80 flex items-center justify-center text-purple-600 dark:text-purple-300 shadow-sm">
          <Sparkles size={28} />
        </div>

        {/* Copy */}
        <div className="space-y-3 sm:space-y-4">
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Let’s set up your first course.
          </h1>
          <p className="text-sm sm:text-base lg:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl mx-auto font-normal">
            Upload your course syllabus, lecture notes, slides, problem sets, or textbook chapters. All study materials, explanations, and course maps are generated strictly from your uploaded files.
          </p>
        </div>

        {/* Primary Action Button */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <button
            onClick={onStartSetup}
            className="w-full sm:w-auto px-8 py-4 bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white text-base font-semibold rounded-2xl flex items-center justify-center gap-2.5 shadow-lg shadow-purple-600/25 transition-all cursor-pointer"
          >
            <span>Create My First Course</span>
            <ArrowRight size={18} />
          </button>
        </div>

        {/* Privacy Note */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 max-w-lg mx-auto flex items-start gap-3 text-left shadow-2xs">
          <ShieldCheck size={18} className="text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Your courses, uploaded files, and generated study resources are completely private to your account and derived solely from your verified course uploads.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto w-full text-center text-xs text-slate-400 dark:text-slate-500 py-4">
        Nexus Study · Learning System
      </footer>
    </div>
  );
}
