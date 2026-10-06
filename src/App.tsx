import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import PlannerView from './components/PlannerView';
import UploadModal from './components/UploadModal';
import PreviewDrawer from './components/PreviewDrawer';
import WelcomeScreen from './components/WelcomeScreen';
import CourseSetupWizard from './components/CourseSetupWizard';
import AccountPrivacyModal from './components/AccountPrivacyModal';
import ConfusedModal from './components/ConfusedModal';
import StudyGenerationModal, { StudyAssistanceType } from './components/StudyGenerationModal';
import AuthModal from './components/AuthModal';
import AgentChatModal from './components/AgentChatModal';
import { 
  loadUserCourses, 
  saveUserCourses, 
  loadUserDeadlines, 
  saveUserDeadlines, 
  loadUserPreferences, 
  saveUserPreferences, 
  resetUserAccount,
  recalculateTopicMastery
} from './lib/storage';
import { 
  auth, 
  syncCourseToFirestore, 
  loadUserCoursesFromFirestore, 
  syncDeadlineToFirestore, 
  loadUserDeadlinesFromFirestore 
} from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  Course, 
  SourceMaterial, 
  Note, 
  Flashcard, 
  StudyDeadline, 
  LearningPreferences, 
  CrossCourseLink,
  Quiz,
  SyllabusCourseMap
} from './types';
import {
  Menu,
  Moon,
  Sun,
  Calendar,
  Sparkles,
  Upload,
  CheckCircle2,
  PanelLeft,
  ShieldCheck,
  HelpCircle,
  Plus,
  Bot,
  User as UserIcon,
  Cloud,
  MessageSquare
} from 'lucide-react';
import { cn } from './lib/utils';

export default function App() {
  // Load user courses from local persistence (starts empty for genuine blank single-user experience)
  const [courses, setCourses] = useState<Course[]>(() => loadUserCourses());
  const [deadlines, setDeadlines] = useState<StudyDeadline[]>(() => loadUserDeadlines());
  const [preferences, setPreferences] = useState<LearningPreferences>(() => loadUserPreferences());

  const [activeCourseId, setActiveCourseId] = useState<string>(() => {
    const loaded = loadUserCourses();
    return loaded[0]?.id || '';
  });
  
  const [isPlannerActive, setIsPlannerActive] = useState<boolean>(false);
  
  // Left sidebar collapse controls (Desktop + Mobile)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState<boolean>(false);

  // Modals & Guided Wizard state
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [isStudyAssistOpen, setIsStudyAssistOpen] = useState<boolean>(false);
  
  // Firebase Auth & Cloud Sync
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Unified "Chat with an Agent" Modal (incorporates Text Chat, Audio Dictation, and Live Voice)
  const [isAgentChatOpen, setIsAgentChatOpen] = useState<boolean>(false);

  // "I'm Confused" interactive help modal
  const [isConfusedOpen, setIsConfusedOpen] = useState<boolean>(false);
  const [confusedContext, setConfusedContext] = useState<{
    title: string;
    snippet?: string;
    type?: 'note' | 'formula' | 'step' | 'question' | 'general';
  }>({ title: 'Course Concept' });

  // Cross-course preview drawer state
  const [previewDrawerOpen, setPreviewDrawerOpen] = useState<boolean>(false);
  const [activePreviewLink, setActivePreviewLink] = useState<CrossCourseLink | null>(null);

  // Dark/Light mode state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nexus_theme') === 'dark' || 
        (!localStorage.getItem('nexus_theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Draggable floating chat button state
  const [chatPos, setChatPos] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingChat, setIsDraggingChat] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number }>({ startX: 0, startY: 0, initialX: 0, initialY: 0 });

  useEffect(() => {
    if (typeof window !== 'undefined' && !chatPos) {
      setChatPos({
        x: window.innerWidth - 175,
        y: window.innerHeight - 75
      });
    }
  }, []);

  const handleChatMouseDown = (e: React.MouseEvent) => {
    setIsDraggingChat(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: chatPos?.x || (window.innerWidth - 220),
      initialY: chatPos?.y || (window.innerHeight - 80)
    };
    e.stopPropagation();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingChat) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setChatPos({
        x: Math.max(10, Math.min(window.innerWidth - 120, dragRef.current.initialX + dx)),
        y: Math.max(10, Math.min(window.innerHeight - 70, dragRef.current.initialY + dy))
      });
    };

    const handleMouseUp = () => {
      setIsDraggingChat(false);
    };

    if (isDraggingChat) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingChat]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        showToast(`Signed in as ${user.displayName || user.email}`);
        try {
          const cloudCourses = await loadUserCoursesFromFirestore(user.uid);
          const cloudDeadlines = await loadUserDeadlinesFromFirestore(user.uid);
          if (cloudCourses.length > 0) {
            setCourses(cloudCourses);
            if (!activeCourseId) setActiveCourseId(cloudCourses[0].id);
          }
          if (cloudDeadlines.length > 0) {
            setDeadlines(cloudDeadlines);
          }
        } catch (err) {
          console.error('Firestore sync on auth change error:', err);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Sync with Firestore manually
  const handleSyncWithCloud = async () => {
    if (!currentUser) return;
    try {
      showToast('Syncing with Firebase Firestore...');
      for (const course of courses) {
        await syncCourseToFirestore(currentUser.uid, course);
      }
      for (const dl of deadlines) {
        await syncDeadlineToFirestore(currentUser.uid, dl);
      }
      showToast('Cloud sync complete!');
    } catch (err) {
      console.error('Manual sync error:', err);
      showToast('Sync failed. Please check network.');
    }
  };

  // Sync dark mode class & persist
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('nexus_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('nexus_theme', 'light');
    }
  }, [isDarkMode]);

  // Persist courses whenever changed
  useEffect(() => {
    saveUserCourses(courses);
    if (currentUser) {
      courses.forEach(c => syncCourseToFirestore(currentUser.uid, c));
    }
  }, [courses, currentUser]);

  // Persist deadlines whenever changed
  useEffect(() => {
    saveUserDeadlines(deadlines);
    if (currentUser) {
      deadlines.forEach(d => syncDeadlineToFirestore(currentUser.uid, d));
    }
  }, [deadlines, currentUser]);

  // Persist preferences whenever changed
  useEffect(() => {
    saveUserPreferences(preferences);
  }, [preferences]);

  const activeCourse = courses.find((c) => c.id === activeCourseId) || courses[0];

  // Course management handlers
  const handleSelectCourse = (courseId: string) => {
    setActiveCourseId(courseId);
    setIsPlannerActive(false);
    setIsSidebarOpenMobile(false);
  };

  const handleSelectPlanner = () => {
    setIsPlannerActive(true);
    setIsSidebarOpenMobile(false);
  };

  const handleCompleteWizard = (
    newCourse: Course, 
    newDeadlines: StudyDeadline[], 
    newPrefs: LearningPreferences
  ) => {
    setCourses((prev) => [newCourse, ...prev]);
    if (newDeadlines.length > 0) {
      setDeadlines((prev) => [...newDeadlines, ...prev]);
    }
    setPreferences(newPrefs);
    setActiveCourseId(newCourse.id);
    setIsPlannerActive(false);
    setIsWizardOpen(false);
    showToast(`Study system created for ${newCourse.name}!`);
  };

  const handleSaveCourseMap = (courseId: string, newMap: SyllabusCourseMap) => {
    setCourses((prev) => {
      const updated = prev.map((c) =>
        c.id === courseId ? { ...c, syllabusMap: newMap } : c
      );
      return saveUserCourses(updated);
    });
    showToast('Course Map updated from syllabus.');
  };

  const handleRefreshCourse = async () => {
    if (currentUser) {
      const refreshedCourses = await loadUserCoursesFromFirestore(currentUser.uid);
      if (refreshedCourses && refreshedCourses.length > 0) {
        setCourses(refreshedCourses);
      }
    }
  };

  const handleToggleArchiveCourse = (courseId: string) => {
    setCourses((prev) =>
      prev.map((c) => (c.id === courseId ? { ...c, isArchived: !c.isArchived } : c))
    );
    showToast('Course archive status updated.');
  };

  const handleDeleteCourse = (courseId: string) => {
    setCourses((prev) => {
      const remaining = prev.filter((c) => c.id !== courseId);
      if (activeCourseId === courseId) {
        setActiveCourseId(remaining[0]?.id || '');
      }
      return remaining;
    });
    setDeadlines((prev) => prev.filter((d) => d.courseId !== courseId));
    showToast('Course deleted.');
  };

  // Material & Note management handlers
  const handleSaveSource = async (
    newSource: SourceMaterial, 
    generatedNote?: Note, 
    generatedFlashcards?: Flashcard[],
    generatedQuizzes?: Quiz[]
  ) => {
    if (!activeCourse) return;

    const sourceAlreadyExists = activeCourse.sources.some(
      source => source.id === newSource.id
    );

    const updatedSources = sourceAlreadyExists
      ? activeCourse.sources.map(source =>
          source.id === newSource.id ? newSource : source
        )
      : [newSource, ...activeCourse.sources];

    let updatedCourse: Course = {
      ...activeCourse,
      sources: updatedSources,
      notes: generatedNote ? [generatedNote, ...activeCourse.notes] : activeCourse.notes,
      flashcards: generatedFlashcards ? [...generatedFlashcards, ...activeCourse.flashcards] : activeCourse.flashcards,
      quizzes: generatedQuizzes ? [...generatedQuizzes, ...activeCourse.quizzes] : activeCourse.quizzes
    };

    // ... (Syllabus Course Map auto-extraction logic)
    if (newSource.sourceType === 'syllabus' || newSource.title.toLowerCase().includes('syllabus')) {
      try {
        const res = await fetch('/api/gemini/parse-syllabus', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rawText: newSource.content,
            courseName: activeCourse.name
          })
        });

        if (res.ok) {
          const json = await res.json();
          if (json.courseMap) {
            const map: SyllabusCourseMap = json.courseMap;
            const newUnits = map.sessions.map(s => `Week ${s.weekNumber}: ${s.topicTitle}`);

            // Re-classify unassigned / 'General' notes against new syllabus sessions
            const adjustedNotes = updatedCourse.notes.map(n => {
              if (!n.syllabusUnit || n.syllabusUnit === 'General' || n.syllabusUnit === 'Unit 1: Fundamentals') {
                const match = map.sessions.find(s => 
                  s.topicTitle.toLowerCase().includes(n.topicTag.toLowerCase()) || 
                  n.title.toLowerCase().includes(s.topicTitle.toLowerCase())
                ) || map.sessions[0];

                if (match) {
                  return { ...n, syllabusUnit: `Week ${match.weekNumber}: ${match.topicTitle}` };
                }
              }
              return n;
            });

            updatedCourse = {
              ...updatedCourse,
              syllabusMap: map,
              syllabusUnits: newUnits.length > 0 ? newUnits : updatedCourse.syllabusUnits,
              notes: adjustedNotes
            };

            // Centralized, dynamic, and honest topic mastery computation
            updatedCourse.mastery = recalculateTopicMastery(updatedCourse);

            showToast(`Extracted Course Map & adjusted topics from syllabus.`);
          }
        }
      } catch (err) {
        console.error('Syllabus map auto-extraction error:', err);
      }
    }

    setCourses((prev) => {
      const updatedList = prev.map((c) => (c.id === activeCourse.id ? updatedCourse : c));
      return saveUserCourses(updatedList);
    });

    if (currentUser) {
      try {
        await syncCourseToFirestore(currentUser.uid, updatedCourse);
      } catch (err) {
        console.error('Firestore sync error on source upload:', err);
      }
    }

    showToast(`Added "${newSource.title}" to ${activeCourse.name}`);
  };

  const handleDeleteSource = async (sourceId: string) => {
    if (!activeCourse) return;
    const updatedCourse: Course = {
      ...activeCourse,
      sources: activeCourse.sources.filter((s) => s.id !== sourceId),
      notes: activeCourse.notes.filter((n) => n.sourceId !== sourceId),
      flashcards: activeCourse.flashcards.filter((f) => f.sourceId !== sourceId)
    };
    setCourses((prev) => {
      const updatedList = prev.map((c) => (c.id === activeCourse.id ? updatedCourse : c));
      return saveUserCourses(updatedList);
    });
    if (currentUser) {
      try {
        await syncCourseToFirestore(currentUser.uid, updatedCourse);
      } catch (err) {
        console.error('Firestore sync error on delete source:', err);
      }
    }
    showToast('Source material removed.');
  };

  const handleDeleteNote = (noteId: string) => {
    if (!activeCourse) return;
    setCourses((prev) =>
      prev.map((c) =>
        c.id === activeCourse.id
          ? { ...c, notes: c.notes.filter((n) => n.id !== noteId) }
          : c
      )
    );
    showToast('Note module removed.');
  };

  const handleAddFlashcard = (newCard: Flashcard) => {
    if (!activeCourse) return;
    setCourses((prev) =>
      prev.map((c) =>
        c.id === activeCourse.id
          ? { ...c, flashcards: [newCard, ...c.flashcards] }
          : c
      )
    );
  };

  const handleUpdateFlashcard = (updatedCard: Flashcard) => {
    if (!activeCourse) return;
    setCourses((prev) =>
      prev.map((c) =>
        c.id === activeCourse.id
          ? {
              ...c,
              flashcards: c.flashcards.map((f) => (f.id === updatedCard.id ? updatedCard : f))
            }
          : c
      )
    );
  };

  const handleOpenConfused = (title: string, snippet?: string, type?: 'note' | 'formula' | 'step') => {
    setConfusedContext({ title, snippet, type: type || 'general' });
    setIsConfusedOpen(true);
  };

  const handleToggleCompleteDeadline = (deadlineId: string) => {
    setDeadlines((prev) =>
      prev.map((d) =>
        d.id === deadlineId ? { ...d, completed: !d.completed } : d
      )
    );
  };

  const handleAddDeadline = (newDeadline: StudyDeadline) => {
    setDeadlines((prev) => {
      const updated = [newDeadline, ...prev];
      saveUserDeadlines(updated);
      return updated;
    });
    showToast(`Added deadline: ${newDeadline.title}`);
  };

  const handleDeleteDeadline = (deadlineId: string) => {
    setDeadlines((prev) => {
      const remaining = prev.filter((d) => d.id !== deadlineId);
      saveUserDeadlines(remaining);
      return remaining;
    });
    showToast('Deadline removed');
  };

  // 1. NEW-USER EXPERIENCE:
  if (courses.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between font-sans antialiased selection:bg-purple-500 selection:text-white">
        <WelcomeScreen
          onStartSetup={() => setIsWizardOpen(true)}
        />

        {/* Guided Course Setup Wizard Modal */}
        {isWizardOpen && (
          <CourseSetupWizard
            onComplete={handleCompleteWizard}
            onCancel={() => setIsWizardOpen(false)}
          />
        )}
      </div>
    );
  }

  // 2. POPULATED APP EXPERIENCE:
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex overflow-hidden font-sans antialiased selection:bg-purple-500 selection:text-white transition-colors duration-200 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 sm:bottom-6 left-6 z-50 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2.5 rounded-2xl shadow-xl text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-bottom duration-300">
          <CheckCircle2 size={16} className="text-emerald-400 dark:text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Floating Action Button: Chat with an Agent (Draggable / Movable) */}
      <button
        onMouseDown={handleChatMouseDown}
        onClick={() => {
          if (!isDraggingChat) {
            setIsAgentChatOpen(true);
          }
        }}
        style={chatPos ? { left: `${chatPos.x}px`, top: `${chatPos.y}px`, position: 'fixed' } : { bottom: '20px', right: '20px', position: 'fixed' }}
        className="z-40 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-full shadow-lg shadow-purple-600/35 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all duration-200 cursor-grab active:cursor-grabbing group select-none border border-white/10"
        title="Click to open chat, or click & drag to move this button anywhere on screen"
      >
        <div className="relative pointer-events-none">
          <Bot size={16} className="group-hover:rotate-6 transition-transform" />
          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400" />
        </div>
        <span className="font-bold text-[11px] sm:text-xs tracking-wide pointer-events-none">Chat with Agent</span>
      </button>

      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden"
          onClick={() => setIsSidebarOpenMobile(false)}
        />
      )}

      {/* Left Sidebar (Collapsible on Desktop + Drawer on Mobile) */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 transform md:relative md:translate-x-0 transition-transform duration-300 ease-in-out shrink-0',
          isSidebarOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          isSidebarCollapsed ? 'md:hidden' : 'md:block'
        )}
      >
        <Sidebar
          courses={courses}
          activeCourseId={activeCourseId}
          isPlannerActive={isPlannerActive}
          onSelectCourse={handleSelectCourse}
          onSelectPlanner={handleSelectPlanner}
          onOpenWizard={() => setIsWizardOpen(true)}
          onOpenPrivacy={() => setIsPrivacyOpen(true)}
          onToggleArchiveCourse={handleToggleArchiveCourse}
          onDeleteCourse={handleDeleteCourse}
          onClose={() => setIsSidebarOpenMobile(false)}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden w-full transition-all duration-300 min-w-0">
        {/* Top Navbar */}
        <header className="h-16 px-4 sm:px-6 border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md flex items-center justify-between z-20 shrink-0 gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            {/* Sidebar toggle button */}
            <button
              onClick={() => {
                if (window.innerWidth < 768) {
                  setIsSidebarOpenMobile(!isSidebarOpenMobile);
                } else {
                  setIsSidebarCollapsed(!isSidebarCollapsed);
                }
              }}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              aria-label="Toggle sidebar"
            >
              {isSidebarCollapsed ? <PanelLeft size={20} /> : <Menu size={20} />}
            </button>

            <div className="flex items-center gap-2 min-w-0 flex-1">
              {isPlannerActive ? (
                <h2 className="text-xs sm:text-sm md:text-base font-bold text-slate-800 dark:text-slate-100 truncate">
                  Study Schedule & Deadlines
                </h2>
              ) : activeCourse ? (
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                  {activeCourse.code && (
                    <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 shrink-0">
                      {activeCourse.code}
                    </span>
                  )}
                  <h2 
                    className="text-xs sm:text-sm md:text-base font-bold text-slate-800 dark:text-slate-100 truncate"
                    title={activeCourse.name}
                  >
                    {activeCourse.name}
                  </h2>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Quick Upload Button in Header */}
            {!isPlannerActive && activeCourse && (
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                <Upload size={14} />
                <span className="hidden sm:inline">Upload</span>
              </button>
            )}

            {/* User Profile / Firebase Auth Button */}
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer flex items-center gap-1.5 text-xs"
              title={currentUser ? `Signed in as ${currentUser.displayName || currentUser.email}` : 'Sign in to sync'}
            >
              {currentUser?.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'User'}
                  className="w-6 h-6 rounded-full border border-purple-500"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-xs">
                  {currentUser ? (currentUser.displayName || currentUser.email || 'U')[0].toUpperCase() : <UserIcon size={14} />}
                </div>
              )}
            </button>

            {/* Dark / Light Mode Toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        {/* Scrollable Workspace */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 bg-slate-50/60 dark:bg-slate-950/60 min-w-0 w-full">
          {isPlannerActive ? (
            <PlannerView
              deadlines={deadlines}
              courses={courses}
              onToggleComplete={handleToggleCompleteDeadline}
              onAddDeadline={handleAddDeadline}
              onDeleteDeadline={handleDeleteDeadline}
              onNavigateToCourse={handleSelectCourse}
            />
          ) : activeCourse ? (
            <Dashboard
              course={activeCourse}
              allCourses={courses}
              onOpenUploadModal={() => setIsUploadModalOpen(true)}
              onOpenStudyAssist={() => setIsStudyAssistOpen(true)}
              onOpenConfused={handleOpenConfused}
              onAddFlashcard={handleAddFlashcard}
              onUpdateFlashcard={handleUpdateFlashcard}
              onToggleArchiveCourse={handleToggleArchiveCourse}
              onDeleteCourse={handleDeleteCourse}
              onDeleteNote={handleDeleteNote}
              onDeleteSource={handleDeleteSource}
              onSaveCourseMap={handleSaveCourseMap}
              refreshCourse={handleRefreshCourse}
            />
          ) : (
            <div className="text-center py-20">
              <p className="text-slate-500">No active course selected.</p>
              <button
                onClick={() => setIsWizardOpen(true)}
                className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-semibold"
              >
                Create a Course
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Guided Course Setup Wizard Modal */}
      {isWizardOpen && (
        <CourseSetupWizard
          onComplete={handleCompleteWizard}
          onCancel={() => setIsWizardOpen(false)}
        />
      )}

      {/* Upload Course Material Modal */}
      {isUploadModalOpen && activeCourse && (
        <UploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          currentCourse={activeCourse}
          allCourses={courses}
          onSaveSource={handleSaveSource}
          currentUser={currentUser}
        />
      )}

      {/* Study Assistance & Generation Modal */}
      {isStudyAssistOpen && activeCourse && (
        <StudyGenerationModal
          isOpen={isStudyAssistOpen}
          onClose={() => setIsStudyAssistOpen(false)}
          course={activeCourse}
          onGenerate={(selectedAssistance, generatedNote, generatedFlashcards) => {
            const updatedCourse: Course = {
              ...activeCourse,
              notes: generatedNote ? [generatedNote, ...activeCourse.notes] : activeCourse.notes,
              flashcards: generatedFlashcards ? [...generatedFlashcards, ...activeCourse.flashcards] : activeCourse.flashcards
            };
            setCourses((prev) => prev.map(c => c.id === activeCourse.id ? updatedCourse : c));
            showToast(`Generated grounded study resources from course PDFs for ${activeCourse.name}`);
          }}
        />
      )}

      {/* Firebase Authentication & Cloud Sync Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onSyncWithCloud={handleSyncWithCloud}
      />

      {/* Unified "Chat with an Agent" Assistant Modal (Text, Mic Dictation, and Live Voice in one central place) */}
      <AgentChatModal
        isOpen={isAgentChatOpen}
        onClose={() => setIsAgentChatOpen(false)}
        course={activeCourse}
      />

      {/* "I'm Confused" Interactive Helper Modal */}
      <ConfusedModal
        isOpen={isConfusedOpen}
        onClose={() => setIsConfusedOpen(false)}
        contextTitle={confusedContext.title}
        contextSnippet={confusedContext.snippet}
        contextType={confusedContext.type}
      />

      {/* Account Settings & Data Management Modal */}
      <AccountPrivacyModal
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
        preferences={preferences}
        onUpdatePreferences={(newPrefs) => {
          setPreferences(newPrefs);
          showToast('Preferences updated.');
        }}
        onResetAccount={() => {
          resetUserAccount();
          setCourses([]);
          setDeadlines([]);
          setActiveCourseId('');
          setIsPrivacyOpen(false);
          showToast('Account data reset.');
        }}
        courses={courses}
        deadlines={deadlines}
        onDeleteCourse={handleDeleteCourse}
      />
    </div>
  );
}
