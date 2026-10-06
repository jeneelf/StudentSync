import React, { useState, useEffect } from 'react';
import { auth, signInWithGoogle, logOut } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  User as UserIcon, 
  LogOut, 
  LogIn, 
  ShieldCheck, 
  Cloud, 
  CheckCircle2, 
  Sparkles,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onSyncWithCloud: () => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  currentUser,
  onSyncWithCloud
}: AuthModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await signInWithGoogle();
      onSyncWithCloud();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to sign in with Google');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await logOut();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to sign out');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-purple-50/50 dark:bg-purple-950/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-600 text-white shadow-2xs">
              <Cloud size={18} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block">
                Account & Sync
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {currentUser ? 'User Profile' : 'Sign in to Nexus'}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
              {errorMsg}
            </div>
          )}

          {currentUser ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'User'}
                    className="w-12 h-12 rounded-full border-2 border-purple-500 shadow-xs"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-lg">
                    {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                  </div>
                )}

                <div className="min-w-0">
                  <p className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                    {currentUser.displayName || 'Authenticated User'}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 truncate">
                    {currentUser.email}
                  </p>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    <CheckCircle2 size={12} /> Connected to Cloud Firestore
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 space-y-1">
                <span className="font-bold text-purple-900 dark:text-purple-200">
                  Cloud Persistence Active
                </span>
                <p className="text-purple-700 dark:text-purple-300 text-[11px] leading-relaxed">
                  Your courses, notes, flashcards, quizzes, and deadlines are securely saved in Firebase Firestore and synchronized automatically.
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={onSyncWithCloud}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles size={14} /> Sync Now
                </button>

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleSignOut}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-rose-600 font-semibold text-xs cursor-pointer flex items-center gap-1.5"
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-center">
              <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-left space-y-1.5">
                <p className="font-bold text-slate-900 dark:text-slate-100">
                  Save your study systems across devices
                </p>
                <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                  Sign in with your Google account to back up your courses, notes, and topic mastery scores to Firebase.
                </p>
              </div>

              <button
                type="button"
                disabled={isLoading}
                onClick={handleSignIn}
                className="w-full py-3 px-4 rounded-2xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-purple-600/25 transition-all cursor-pointer"
              >
                <LogIn size={18} />
                <span>{isLoading ? 'Connecting...' : 'Sign In with Google'}</span>
              </button>

              <p className="text-[11px] text-slate-400">
                Uses Firebase Authentication. Your data remains completely private to your account.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
