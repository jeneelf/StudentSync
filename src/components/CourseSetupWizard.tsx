import React, { useState, useRef } from 'react';
import { 
  Course, 
  StudyDeadline, 
  LearningPreferences, 
  MaterialSourceType, 
  GenerationResourceOption, 
  SourceMaterial, 
  FileProcessingState 
} from '../types';
import { 
  buildCourseStudySystem, 
  DEFAULT_PREFERENCES 
} from '../lib/storage';
import { extractTextFromFile } from '../lib/fileParser';
import { 
  BookOpen, 
  Calendar, 
  Clock, 
  Upload, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  X, 
  Plus, 
  Trash2, 
  Sparkles, 
  Layers, 
  ShieldCheck, 
  AlertCircle, 
  FileText, 
  SlidersHorizontal,
  FileCode,
  FolderOpen
} from 'lucide-react';
import { cn } from '../lib/utils';

interface CourseSetupWizardProps {
  onComplete: (course: Course, newDeadlines: StudyDeadline[], prefs: LearningPreferences) => void;
  onCancel: () => void;
}

export default function CourseSetupWizard({ onComplete, onCancel }: CourseSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 6;

  // Step 1: Course Details
  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [semesterTerm, setSemesterTerm] = useState<'Fall' | 'Spring' | 'Summer' | 'Winter' | 'Other'>('Fall');
  const [semesterYear, setSemesterYear] = useState<number>(2026);
  const [instructor, setInstructor] = useState('');

  // Step 2: Course Schedule
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [selectedDays, setSelectedDays] = useState<('Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun')[]>(['Mon', 'Wed']);
  const [startTime, setStartTime] = useState('10:00 AM');
  const [endTime, setEndTime] = useState('11:15 AM');
  const [location, setLocation] = useState('');
  const [isRecurringWeekly, setIsRecurringWeekly] = useState(true);

  // Step 3: Deadlines
  const [deadlinesList, setDeadlinesList] = useState<{
    id: string;
    title: string;
    type: StudyDeadline['type'];
    dueDate: string;
  }[]>([
    {
      id: 'dl-init-1',
      title: 'Midterm Exam',
      type: 'Exam',
      dueDate: '2026-10-24'
    }
  ]);
  const [newDeadlineTitle, setNewDeadlineTitle] = useState('');
  const [newDeadlineType, setNewDeadlineType] = useState<StudyDeadline['type']>('Exam');
  const [newDeadlineDate, setNewDeadlineDate] = useState('2026-10-28');

  // Step 4: Upload Course Materials
  const [uploadedFiles, setUploadedFiles] = useState<SourceMaterial[]>([]);
  const [activeUploadType, setActiveUploadType] = useState<MaterialSourceType>('syllabus');
  const [activeUploadWeek, setActiveUploadWeek] = useState('General');
  const [activeUploadChapter, setActiveUploadChapter] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProcessUploadedFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    for (const file of fileArray) {
      const fileId = `src-up-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const fileName = file.name;
      const fileSize = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

      // Smart detected material type if not specified
      let detectedType = activeUploadType;
      const lower = fileName.toLowerCase();
      if (lower.includes('syllabus')) detectedType = 'syllabus';
      else if (lower.includes('slide') || lower.includes('lec') || lower.includes('lecture')) detectedType = 'lecture_slides';
      else if (lower.includes('note') || lower.includes('recitation')) detectedType = 'notes';
      else if (lower.includes('hw') || lower.includes('homework') || lower.includes('assign') || lower.includes('problem')) detectedType = 'assignments';
      else if (lower.includes('lab') || lower.includes('proj')) detectedType = 'labs';
      else if (lower.includes('book') || lower.includes('ch') || lower.includes('chapter')) detectedType = 'textbook';
      else if (lower.includes('exam') || lower.includes('guide') || lower.includes('midterm')) detectedType = 'study_guide';

      // Initial state
      const initialSource: SourceMaterial = {
        id: fileId,
        title: fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
        sourceType: detectedType,
        fileType: 'pdf',
        fileName,
        fileSize,
        uploadedAt: new Date().toISOString().split('T')[0],
        content: '',
        weekOrUnit: activeUploadWeek || 'Week 1',
        chapterOrTopic: activeUploadChapter || fileName.replace(/\.[^/.]+$/, ''),
        processingState: 'extracting',
        processingProgress: 45,
        noteHeading: fileName.replace(/\.[^/.]+$/, ''),
        conceptTitle: 'Extracted Course Concepts',
        topicTag: activeUploadChapter || 'Core Topic'
      };

      setUploadedFiles(prev => [initialSource, ...prev]);

      try {
        const parsed = await extractTextFromFile(file, {
          courseName,
          unit: activeUploadWeek,
          topic: activeUploadChapter,
          sourceType: detectedType
        });

        setUploadedFiles(prev => prev.map(f => f.id === fileId ? {
          ...f,
          title: parsed.detectedTitle || f.title,
          fileType: parsed.fileType,
          fileSize: parsed.fileSize,
          content: parsed.content,
          processingState: 'ready',
          processingProgress: 100,
          topicTag: parsed.sampleTopics[0] || f.topicTag,
          noteHeading: parsed.detectedTitle || f.noteHeading
        } : f));
      } catch (err) {
        console.error('Error processing file:', err);
        setUploadedFiles(prev => prev.map(f => f.id === fileId ? {
          ...f,
          processingState: 'ready',
          processingProgress: 100
        } : f));
      }
    }
  };

  // Step 5: Choose what to generate
  const [selectedResources, setSelectedResources] = useState<GenerationResourceOption[]>([
    'organized_notes',
    'simple_explanations',
    'worked_examples',
    'flashcards',
    'practice_questions',
    'formula_sheet',
    'topic_summary'
  ]);

  // Step 6: Learning Preferences
  const [explanationStyle, setExplanationStyle] = useState<LearningPreferences['explanationStyle']>('standard');
  const [learningPreference, setLearningPreference] = useState<LearningPreferences['learningPreference']>('balanced');
  const [sessionLength, setSessionLength] = useState<number>(20);
  const [adhdFocusMode, setAdhdFocusMode] = useState(false);
  const [largerText, setLargerText] = useState(false);
  const [increasedSpacing, setIncreasedSpacing] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [studyReminders, setStudyReminders] = useState(false);

  // Helpers for schedule days toggle
  const toggleDay = (day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun') => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  // Helper for adding deadline
  const handleAddDeadlineItem = () => {
    if (!newDeadlineTitle.trim()) return;
    setDeadlinesList(prev => [
      ...prev,
      {
        id: `dl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: newDeadlineTitle.trim(),
        type: newDeadlineType,
        dueDate: newDeadlineDate
      }
    ]);
    setNewDeadlineTitle('');
  };

  const handleRemoveDeadlineItem = (id: string) => {
    setDeadlinesList(prev => prev.filter(d => d.id !== id));
  };

  // Helper for simulated preset files
  const handleAddSampleMaterial = (preset: 'syllabus' | 'slides' | 'notes' | 'textbook' | 'assignment') => {
    let title = '';
    let type: MaterialSourceType = 'syllabus';
    let size = '1.2 MB';
    let content = '';

    if (preset === 'syllabus') {
      title = `${courseCode || courseName || 'Course'} Official Syllabus`;
      type = 'syllabus';
      size = '680 KB';
      content = `Course Syllabus: ${courseName} (${semesterTerm} ${semesterYear})\nGrading Policy: Midterm 25%, Final Exam 35%, Homework & Labs 40%.\nKey Milestones: Foundational Axioms, Analytical Transformations, Equilibrium Invariants, and Applied Modeling.`;
    } else if (preset === 'slides') {
      title = `Lecture Slides: Core Principles & Systematic Methods`;
      type = 'lecture_slides';
      size = '12.4 MB';
      content = `Slide Deck: Introduction to system decomposition.\nDefinition: Invariants are preserved across state transformations.\nProcedural step: Solve the characteristic equation det(A - λ I) = 0.`;
    } else if (preset === 'notes') {
      title = `Class Recitation Notes: Step-by-Step Worked Problems`;
      type = 'notes';
      size = '410 KB';
      content = `Recitation Notes: Checked equilibrium condition.\nStep 1: Set up matrix formulation.\nStep 2: Calculate eigenvalues.\nStep 3: State the final normalized vector.`;
    } else if (preset === 'assignment') {
      title = `Problem Set 1: Diagnostic Exercises & Drills`;
      type = 'assignments';
      size = '890 KB';
      content = `Homework Problem Set: Practical calculation exercises testing state transition equations, inverse calculations, and verification.`;
    } else {
      title = `Textbook Chapter: Fundamental Theory & Definitions`;
      type = 'textbook';
      size = '4.5 MB';
      content = `Textbook Chapter: Detailed formal definitions, proofs of uniqueness theorems, and standard application domains.`;
    }

    const fileId = `src-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newSource: SourceMaterial = {
      id: fileId,
      title,
      sourceType: type,
      fileType: 'pdf',
      fileName: title.toLowerCase().replace(/[^a-z0-9]/g, '_') + '.pdf',
      fileSize: size,
      uploadedAt: new Date().toISOString().split('T')[0],
      content,
      weekOrUnit: activeUploadWeek,
      chapterOrTopic: activeUploadChapter || 'Core Topic',
      processingState: 'ready',
      processingProgress: 100,
      noteHeading: `Uploaded ${type.replace('_', ' ')}`,
      conceptTitle: 'Key Concepts & Definitions',
      topicTag: activeUploadChapter || 'Core Topic'
    };

    setUploadedFiles(prev => [newSource, ...prev]);
  };

  const toggleResource = (opt: GenerationResourceOption) => {
    setSelectedResources(prev => 
      prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt]
    );
  };

  // Final submit handler
  const handleFinalSubmit = () => {
    const prefs: LearningPreferences = {
      explanationStyle,
      learningPreference,
      sessionLength,
      adhdFocusMode,
      largerText,
      increasedSpacing,
      reducedMotion,
      darkMode,
      studyReminders
    };

    // Ensure all uploaded files are marked ready
    const finalizedSources: SourceMaterial[] = uploadedFiles.map(s => ({
      ...s,
      processingState: 'ready' as FileProcessingState,
      processingProgress: 100
    }));

    const course = buildCourseStudySystem(
      courseName.trim() || 'Course',
      courseCode.trim() || undefined,
      semesterTerm,
      semesterYear,
      instructor.trim() || undefined,
      finalizedSources,
      selectedResources,
      prefs
    );

    if (scheduleEnabled) {
      course.schedule = {
        days: selectedDays,
        startTime,
        endTime,
        location: location.trim() || undefined,
        isRecurringWeekly
      };
    }

    const createdDeadlines: StudyDeadline[] = deadlinesList.map((d, idx) => ({
      id: d.id,
      courseId: course.id,
      courseCode: course.code || course.name,
      title: d.title,
      type: d.type,
      dueDate: d.dueDate,
      weightPercent: d.type === 'Exam' ? 25 : 15,
      priority: d.type === 'Exam' ? 'high' : 'medium',
      relatedTopics: [course.syllabusUnits[0]?.split(':')[1]?.trim() || 'Core'],
      recommendedAction: `Review generated notes, flashcards, and practice questions before ${d.title}.`,
      completed: false
    }));

    onComplete(course, createdDeadlines, prefs);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="relative w-full max-w-2xl sm:max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Wizard Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-xs shrink-0">
              {currentStep}/{totalSteps}
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block">
                Course Setup
              </span>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                {currentStep === 1 && 'Step 1: Course Details'}
                {currentStep === 2 && 'Step 2: Class Schedule'}
                {currentStep === 3 && 'Step 3: Course Deadlines'}
                {currentStep === 4 && 'Step 4: Upload Course Materials'}
                {currentStep === 5 && 'Step 5: Choose What to Generate'}
                {currentStep === 6 && 'Step 6: Personal Learning Preferences'}
              </h2>
            </div>
          </div>

          <button
            onClick={onCancel}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title="Cancel Setup"
          >
            <X size={18} />
          </button>
        </div>

        {/* Wizard Step Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6">
          {/* STEP 1: Course Details */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="space-y-1">
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  Enter Course Details
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Provide your course name, code, semester term, and instructor name.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Course Name <span className="text-purple-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                    placeholder="e.g. Linear Algebra & Differential Equations"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Course Code (Optional)
                    </label>
                    <input
                      type="text"
                      value={courseCode}
                      onChange={(e) => setCourseCode(e.target.value)}
                      placeholder="e.g. MATH240"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Semester Term
                    </label>
                    <select
                      value={semesterTerm}
                      onChange={(e) => setSemesterTerm(e.target.value as any)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="Fall">Fall</option>
                      <option value="Spring">Spring</option>
                      <option value="Summer">Summer</option>
                      <option value="Winter">Winter</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Year
                    </label>
                    <input
                      type="number"
                      min={2020}
                      max={2035}
                      value={semesterYear}
                      onChange={(e) => setSemesterYear(parseInt(e.target.value) || 2026)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Instructor Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={instructor}
                    onChange={(e) => setInstructor(e.target.value)}
                    placeholder="e.g. Prof. Katherine Williams"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Course Schedule */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                    Course Schedule (Optional)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Set up your class days and recurring meeting times for schedule reminders.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="text-xs font-semibold text-slate-500 hover:text-purple-600 dark:text-slate-400 underline underline-offset-4 cursor-pointer shrink-0"
                >
                  Skip for now
                </button>
              </div>

              <div className="space-y-4 p-4 sm:p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                    Class Days
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const).map(day => {
                      const isSelected = selectedDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            setScheduleEnabled(true);
                            toggleDay(day);
                          }}
                          className={cn(
                            'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                            isSelected
                              ? 'bg-purple-600 text-white shadow-2xs'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                          )}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Start Time
                    </label>
                    <input
                      type="text"
                      value={startTime}
                      onChange={(e) => {
                        setScheduleEnabled(true);
                        setStartTime(e.target.value);
                      }}
                      placeholder="e.g. 10:00 AM"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-sm text-slate-900 dark:text-white focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      End Time
                    </label>
                    <input
                      type="text"
                      value={endTime}
                      onChange={(e) => {
                        setScheduleEnabled(true);
                        setEndTime(e.target.value);
                      }}
                      placeholder="e.g. 11:15 AM"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-sm text-slate-900 dark:text-white focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Location / Room (Optional)
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => {
                      setScheduleEnabled(true);
                      setLocation(e.target.value);
                    }}
                    placeholder="e.g. Science Hall 204 or Zoom Link"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-sm text-slate-900 dark:text-white focus:outline-hidden"
                  />
                </div>

                <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={isRecurringWeekly}
                    onChange={(e) => {
                      setScheduleEnabled(true);
                      setIsRecurringWeekly(e.target.checked);
                    }}
                    className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                  />
                  <span>Recurring weekly class schedule</span>
                </label>
              </div>
            </div>
          )}

          {/* STEP 3: Deadlines */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                    Exams & Deadlines (Optional)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Enter known exams, midterms, projects, assignments, or presentations. They will appear in your timeline and calendar.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="text-xs font-semibold text-slate-500 hover:text-purple-600 dark:text-slate-400 underline underline-offset-4 cursor-pointer shrink-0"
                >
                  Skip for now
                </button>
              </div>

              {/* Deadline inputs */}
              <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-5">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Event / Exam Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Midterm Exam 1, Project Final"
                      value={newDeadlineTitle}
                      onChange={(e) => setNewDeadlineTitle(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Type
                    </label>
                    <select
                      value={newDeadlineType}
                      onChange={(e) => setNewDeadlineType(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="Exam">Exam</option>
                      <option value="Midterm">Midterm</option>
                      <option value="Assignment">Assignment</option>
                      <option value="Project">Project</option>
                      <option value="Lab">Lab</option>
                      <option value="Presentation">Presentation</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={newDeadlineDate}
                      onChange={(e) => setNewDeadlineDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <button
                      type="button"
                      onClick={handleAddDeadlineItem}
                      className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer"
                      title="Add deadline"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                {/* Deadlines List */}
                <div className="space-y-2 pt-2">
                  {deadlinesList.map(dl => (
                    <div 
                      key={dl.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{dl.title}</span>
                        <span className="text-slate-400">·</span>
                        <span className="text-purple-600 dark:text-purple-400 font-medium">{dl.type}</span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-500">{dl.dueDate}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveDeadlineItem(dl.id)}
                        className="text-slate-400 hover:text-rose-500 transition-colors p-1 cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Upload Course Materials */}
          {currentStep === 4 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="space-y-1">
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  Upload Course Materials
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Upload syllabus, lecture slides, notes, assignments, exercises, labs, projects, or textbook chapters.
                </p>
              </div>

              {/* Material Type and Unit picker */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Material Type
                  </label>
                  <select
                    value={activeUploadType}
                    onChange={(e) => setActiveUploadType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="syllabus">Syllabus</option>
                    <option value="lecture_slides">Lecture Slides</option>
                    <option value="notes">Notes & Recitations</option>
                    <option value="assignments">Assignments</option>
                    <option value="exercises">Exercises</option>
                    <option value="labs">Labs</option>
                    <option value="projects">Projects</option>
                    <option value="textbook">Textbook Sections</option>
                    <option value="study_guide">Exam / Study Guides</option>
                    <option value="other">Other Course Files</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                    Optional Week or Unit
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Week 1, Unit 2, Chapter 3"
                    value={activeUploadWeek}
                    onChange={(e) => setActiveUploadWeek(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Hidden Native File Input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.md,.png,.jpg,.jpeg"
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleProcessUploadedFiles(e.target.files);
                    e.target.value = '';
                  }
                }}
                className="hidden"
              />

              {/* Upload Dropzone */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleProcessUploadedFiles(e.dataTransfer.files);
                  }
                }}
                className={cn(
                  "border-2 border-dashed rounded-3xl p-6 text-center space-y-4 cursor-pointer transition-all",
                  isDragging 
                    ? "border-purple-600 bg-purple-50/80 dark:bg-purple-950/40 scale-[1.01]" 
                    : "border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/10 hover:border-purple-500"
                )}
              >
                <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto shadow-xs">
                  <Upload size={22} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Drag and drop your course files here
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Supports PDF, DOCX, PPTX, TXT, Markdown, and Images
                  </p>
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-md shadow-purple-600/20 inline-flex items-center gap-2 cursor-pointer"
                  >
                    <FolderOpen size={16} />
                    <span>Browse Files</span>
                  </button>
                </div>

                {/* Quick 1-click test presets */}
                <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800/60" onClick={(e) => e.stopPropagation()}>
                  <span className="text-[11px] font-semibold text-slate-400 block mb-2">Or add ready-to-test course files:</span>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddSampleMaterial('syllabus')}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800 hover:bg-purple-100 transition-colors cursor-pointer"
                    >
                      + Syllabus
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddSampleMaterial('slides')}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800 hover:bg-blue-100 transition-colors cursor-pointer"
                    >
                      + Lecture Slides
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddSampleMaterial('notes')}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
                    >
                      + Recitation Notes
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddSampleMaterial('textbook')}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800 hover:bg-amber-100 transition-colors cursor-pointer"
                    >
                      + Textbook Section
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddSampleMaterial('assignment')}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800 hover:bg-rose-100 transition-colors cursor-pointer"
                    >
                      + Problem Set
                    </button>
                  </div>
                </div>
              </div>

              {/* Uploaded Files & Processing States List */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                    Uploaded Course Materials ({uploadedFiles.length})
                  </span>
                  {uploadedFiles.map(file => {
                    const state = file.processingState || 'ready';
                    return (
                      <div 
                        key={file.id}
                        className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs gap-3 shadow-2xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText size={18} className="text-purple-600 shrink-0" />
                          <div className="min-w-0 truncate">
                            <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{file.title}</p>
                            <p className="text-[11px] text-slate-400">
                              {file.sourceType.replace('_', ' ')} · {file.weekOrUnit || 'Week 1'} · {file.fileSize || '1.2 MB'}
                            </p>
                          </div>
                        </div>

                        {/* Processing status */}
                        <div className="flex items-center gap-2.5 shrink-0">
                          {state === 'uploading' && (
                            <span className="flex items-center gap-1 font-semibold text-purple-600 dark:text-purple-400 text-[11px] animate-pulse">
                              <Upload size={13} /> Uploading...
                            </span>
                          )}
                          {(state === 'extracting' || state === 'uploaded') && (
                            <span className="flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 text-[11px] animate-pulse">
                              <BookOpen size={13} /> Extracting...
                            </span>
                          )}
                          {(state === 'classifying' || state === 'extraction_complete') && (
                            <span className="flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 text-[11px] animate-pulse">
                              <Layers size={13} /> Classifying topics...
                            </span>
                          )}
                          {(state === 'generating' || state === 'ready_for_generation') && (
                            <span className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400 text-[11px] animate-pulse">
                              <Clock size={13} /> Generating resources...
                            </span>
                          )}
                          {state === 'ready' && (
                            <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 text-[11px]">
                              <CheckCircle2 size={14} /> Ready
                            </span>
                          )}
                          {(state === 'extraction_failed' || state === 'generation_failed' || state === 'unsupported_format') && (
                            <span className="flex items-center gap-1 font-semibold text-rose-600 text-[11px]">
                              <AlertCircle size={14} /> Extraction failed
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => setUploadedFiles(prev => prev.filter(f => f.id !== file.id))}
                            className="p-1 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                            title="Remove file"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 5: Choose What to Generate */}
          {currentStep === 5 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="space-y-1">
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  Choose What to Generate
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select the study resources you want created for this course. You can select multiple options.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { id: 'organized_notes', label: 'Organized Notes', desc: 'Structured sections with definitions and key takeaways' },
                  { id: 'simple_explanations', label: 'Simple Explanations', desc: 'Plain-language breakdowns and intuitive metaphors' },
                  { id: 'detailed_explanations', label: 'Detailed Explanations', desc: 'Formal theoretical depth and complete proofs' },
                  { id: 'worked_examples', label: 'Step-by-Step Worked Examples', desc: 'Procedural problem-solving calculation models' },
                  { id: 'flashcards', label: 'Flashcards', desc: 'Active recall deck with self-testing rating' },
                  { id: 'qa_sets', label: 'Question-and-Answer Sets', desc: 'Conceptual pairs for rapid self-quizzing' },
                  { id: 'practice_questions', label: 'Practice Questions', desc: 'Multiple choice, short answer & written response' },
                  { id: 'mini_quiz', label: 'Mini Quiz', desc: 'Quick 3-question diagnostic check' },
                  { id: 'full_exam', label: 'Full Practice Exam', desc: 'Comprehensive exam simulation' },
                  { id: 'formula_sheet', label: 'Formula Sheet', desc: 'Consolidated equations with symbol breakdowns' },
                  { id: 'topic_summary', label: 'Topic Summary', desc: 'High-level synthesis of syllabus modules' }
                ].map(item => {
                  const isChecked = selectedResources.includes(item.id as any);
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleResource(item.id as any)}
                      className={cn(
                        'p-3.5 rounded-2xl border text-left cursor-pointer transition-all flex items-start gap-3',
                        isChecked
                          ? 'border-purple-600 bg-purple-50/60 dark:bg-purple-950/30 dark:border-purple-500 ring-2 ring-purple-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                      />
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.label}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 6: Personal Learning Preferences */}
          {currentStep === 6 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-1">
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  Personal Learning Preferences
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Customize how explanations are written and how your study sessions feel. You can change these later.
                </p>
              </div>

              {/* Explanation style */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Explanation Style
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'very_simple', label: 'Very Simple', sub: 'Plain English & metaphors' },
                    { id: 'standard', label: 'Standard', sub: 'Balanced textbook depth' },
                    { id: 'detailed', label: 'Detailed', sub: 'Rigorous formal proofs' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setExplanationStyle(opt.id as any)}
                      className={cn(
                        'p-3 rounded-xl border text-left transition-all cursor-pointer',
                        explanationStyle === opt.id
                          ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-950 dark:text-purple-200 font-bold'
                          : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      )}
                    >
                      <p className="text-xs">{opt.label}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{opt.sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Learning preference */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Learning Preference
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'worked_examples', label: 'More Worked Examples' },
                    { id: 'visual_explanations', label: 'More Visual Explanations' },
                    { id: 'theory', label: 'More Theory' },
                    { id: 'practice_questions', label: 'More Practice Questions' },
                    { id: 'balanced', label: 'Balanced' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setLearningPreference(opt.id as any)}
                      className={cn(
                        'p-2.5 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer',
                        learningPreference === opt.id
                          ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-950 dark:text-purple-200'
                          : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Study session length */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Target Study-Session Length
                </label>
                <div className="flex flex-wrap gap-2">
                  {[10, 20, 30, 45].map(len => (
                    <button
                      key={len}
                      type="button"
                      onClick={() => setSessionLength(len)}
                      className={cn(
                        'px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer',
                        sessionLength === len
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                      )}
                    >
                      {len} minutes
                    </button>
                  ))}
                </div>
              </div>

              {/* Additional preferences */}
              <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Additional Preferences
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={adhdFocusMode}
                      onChange={(e) => setAdhdFocusMode(e.target.checked)}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span>ADHD-friendly focus mode</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={largerText}
                      onChange={(e) => setLargerText(e.target.checked)}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span>Larger text</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={increasedSpacing}
                      onChange={(e) => setIncreasedSpacing(e.target.checked)}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span>Increased spacing</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={studyReminders}
                      onChange={(e) => setStudyReminders(e.target.checked)}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span>Optional study reminders</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div className="px-5 sm:px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-center justify-between shrink-0">
          <div>
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft size={16} /> Back
              </button>
            ) : (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {currentStep < totalSteps ? (
              <button
                type="button"
                disabled={currentStep === 1 && !courseName.trim()}
                onClick={() => setCurrentStep(prev => prev + 1)}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md shadow-purple-600/20 transition-all cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinalSubmit}
                className="px-6 sm:px-7 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-purple-600/25 transition-all cursor-pointer"
              >
                <Sparkles size={16} />
                <span>Create Study System</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
