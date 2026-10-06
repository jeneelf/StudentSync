export type MaterialSourceType = 
  | 'syllabus'
  | 'lecture_slides'
  | 'notes'
  | 'assignments'
  | 'exercises'
  | 'labs'
  | 'projects'
  | 'textbook'
  | 'study_guide'
  | 'lecture_notes'
  | 'slide_deck'
  | 'written_notes'
  | 'excerpt'
  | 'other';

export type FileType = 'pdf' | 'md' | 'txt' | 'image' | 'paste';

export type FileProcessingState = 
  | 'uploading'
  | 'uploaded'
  | 'extracting'
  | 'extraction_complete'
  | 'classifying'
  | 'ready_for_generation'
  | 'generating'
  | 'ready'
  | 'partially_readable'
  | 'needs_ocr_review'
  | 'unsupported_format'
  | 'extraction_failed'
  | 'generation_failed';

export interface SourceCitation {
  sourceTitle: string;
  sourceType: MaterialSourceType;
  referenceDetail: string; // e.g. "Week 3 Lecture Slides, Slide 18" or "Chapter 5, Section 2"
  pageOrSlide?: number | string;
}

export interface CrossCourseLink {
  id: string;
  conceptName: string;
  targetCourseCode: string;
  targetCourseName: string;
  excerpt: string;
  rationale: string;
}

export interface SyllabusSession {
  id: string;
  weekNumber: number;
  sessionNumber: number;
  sessionDate?: string;
  topicTitle: string;
  topicDescription?: string;
  assignedChapters?: string;
  assignedPageRanges?: string;
  readings?: string[];
  exercises?: string[];
  labs?: string[];
  assignments?: string[];
  projects?: string[];
  learningObjectives?: string[];
  examCoverage?: boolean;
  deadlines?: string;
  sourceLocation?: string;
}

export interface SyllabusCourseMap {
  courseName: string;
  courseCode: string;
  semester: string;
  sessions: SyllabusSession[];
  lastUpdated: string;
  previousVersion?: SyllabusSession[];
}

export interface MaterialClassification {
  confidence: 'high' | 'medium' | 'low';
  suggestedWeek: number;
  suggestedSession: number;
  suggestedTopic: string;
  suggestedChapter?: string;
  matchExplanation: string;
  isUserConfirmed?: boolean;
  isUserEdited?: boolean;
  sourceMappings?: { range: string; week: number; session: number; topic: string }[];
}

export interface SourceMaterial {
  id: string;
  userId?: string;
  courseId?: string;
  title: string;
  sourceType: MaterialSourceType;
  fileType: FileType;
  fileName: string;
  mimeType?: string;
  fileSize?: string;
  uploadedAt: string;
  content: string;
  summary?: string;
  pageCount?: number;
  slideCount?: number;
  extractionWarnings?: string[];
  generatedResourceIds?: string[];
  weekOrUnit?: string;
  chapterOrTopic?: string;
  syllabusUnit?: string;
  crossLinks?: CrossCourseLink[];
  processingState?: FileProcessingState;
  processingProgress?: number; // 0 - 100
  noteHeading?: string;
  conceptTitle?: string;
  topicTag?: string;
  classification?: MaterialClassification;
  storageKey?: string;
  extractionStatus?: 'uploaded' | 'extracting' | 'ready' | 'failed' | 'partially_readable';
  extractionError?: string | null;
  extractionAttempts?: number;
  extractedAt?: string | null;
}

export interface ProceduralStep {
  stepNumber: number;
  title: string;
  explanation: string;
  mathOrCode?: string;
  whyThisWorks?: string;
}

export interface ProceduralWorkedExample {
  id: string;
  title: string;
  problem: string;
  whatAreWeTryingToFind: string;
  informationGiven: string[];
  methodIdentification: string;
  steps: ProceduralStep[];
  finalAnswer?: string;
  whyThisAnswerMakesSense?: string;
  whyThisMakesSense?: string;
  commonMistake: string;
  citation?: SourceCitation;
}

export interface StructuredNoteSection {
  id: string;
  title: string;
  conceptTitle?: string;
  inSimpleTerms: string;
  formalExplanation?: string;
  whyThisMatters: string;
  definition?: string;
  howItWorks?: string[];
  keyTerms?: { term: string; definition: string }[];
  formula?: string;
  genuineFormula?: {
    latex: string;
    description: string;
    symbolBreakdown: { symbol: string; meaning: string }[];
  };
  algorithmOrPseudocode?: string;
  symbolBreakdown?: { symbol: string; meaning: string }[];
  workedExample?: ProceduralWorkedExample;
  comparison?: {
    title: string;
    conceptA: string;
    conceptB: string;
    items: { property: string; valueA: string; valueB: string }[];
  };
  commonMistake?: string;
  quickCheck?: { question: string; answer: string };
  citation?: SourceCitation;
  supportStatus?: 'supported' | 'partial' | 'unsupported';
}

export interface Note {
  id: string;
  sourceId?: string;
  title: string;
  syllabusUnit: string;
  topicTag: string;
  updatedAt: string;
  content?: string;
  citation?: SourceCitation;
  // Explanations across density levels
  shortExplanation?: string;
  standardExplanation?: string;
  detailedExplanation?: string;
  sections?: StructuredNoteSection[];
  // Legacy / convenience compatibility
  firstPrinciplesExplanation?: string;
  analogy?: string;
  workedExamples?: any[];
  crossLinks?: CrossCourseLink[];
}

export interface Flashcard {
  id: string;
  sourceId?: string;
  topicTag: string;
  front: string;
  back: string;
  explanation?: string;
  citation?: SourceCitation;
  isStarred?: boolean;
  userCreated?: boolean;
  masteryLevel?: 'needs_review' | 'learning' | 'mastered';
  comparisonOptions?: string[];
  // Performance-based spaced repetition tracking
  history?: {
    reviewedAt: string;
    rating: 'forgot' | 'almost' | 'knew_it';
    typedAnswer?: string;
  }[];
  attemptsCount?: number;
  correctCount?: number;
  lastReviewedAt?: string;
  masteryStatus?: 'needs_review' | 'learning' | 'mastered';
}

export type QuestionType = 'multiple_choice' | 'short_answer' | 'written_response';
export type QuestionDifficulty = 'easy' | 'medium' | 'hard' | 'Intermediate' | 'Rigorous';

export interface QuizQuestion {
  id: string;
  sourceId?: string;
  topicTag: string;
  questionType?: QuestionType;
  difficulty?: QuestionDifficulty;
  question: string;
  citation?: SourceCitation;
  explanation?: string;
  referenceRange?: string;
  conceptRef?: string;
  // Multiple choice fields
  options?: string[];
  correctOptionIndex?: number;
  correctAnswer?: string;
  optionExplanations?: string[];
  // Short answer fields
  acceptableAnswers?: string[];
  // Written response fields
  rubricCriteria?: { point: string; weight: number }[];
  modelAnswer?: string;
  // Common educational support
  hint?: string;
  fullSolution?: string;
  whyCorrect?: string;
  whyWrong?: string;
  recommendedAction?: string;
  similarQuestionPrompt?: string;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  difficulty: QuestionDifficulty;
  feedbackMode?: 'immediate' | 'end_of_quiz';
  questions: QuizQuestion[];
}

export interface TopicMastery {
  id: string;
  name: string;
  unit: string;
  status: 'Not started' | 'Needs review' | 'Learning' | 'Nearly mastered' | 'Mastered' | 'Needs Review' | 'In Progress';
  score?: number;
  overallScore?: number | null; // null if not enough info
  performanceScore?: number | null;
  confidenceScore?: number;
  selfConfidenceScore?: number; // 1 to 5
  coverageScore?: number; // 0 to 100
  questionsAttempted?: number;
  flashcardsReviewed?: number;
  sessionsCount?: number;
  evidenceSummary?: string;
  recommendedAction?: string;
  lastPracticed?: string;
  lastStudiedAt?: string;
  accuracyPercentage?: number;
  totalAttempts?: number;
  correctAttempts?: number;
  confidenceSelfReport?: number;
  totalCardsInTopic?: number;
  masteredCardsInTopic?: number;
  notesCoveragePercent?: number;
  quizzesAttempted?: number;
  weakSpots?: string[];
  recommendedIntensity?: 'None' | 'Light' | 'Moderate' | 'Heavy';
}

export interface ClassSchedule {
  days: ('Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun')[];
  startTime: string; // e.g. "10:00 AM"
  endTime: string;   // e.g. "11:15 AM"
  location?: string;
  isRecurringWeekly: boolean;
}

export interface Course {
  id: string;
  code?: string;
  name: string;
  department?: string;
  term?: string;
  semesterTerm?: 'Fall' | 'Spring' | 'Summer' | 'Winter' | 'Other';
  semesterYear?: number;
  instructor?: string;
  isArchived: boolean;
  color?: string;
  accentBadge?: string;
  schedule?: ClassSchedule;
  syllabusUnits: string[];
  syllabusMap?: SyllabusCourseMap;
  sources: SourceMaterial[];
  notes: Note[];
  flashcards: Flashcard[];
  quizzes: Quiz[];
  mastery: TopicMastery[];
}

export interface StudyDeadline {
  id: string;
  courseId: string;
  courseCode?: string;
  title: string;
  type: 'Exam' | 'Midterm' | 'Assignment' | 'Project' | 'Lab' | 'Presentation' | 'Quiz' | 'Other';
  dueDate: string; // YYYY-MM-DD
  weightPercent?: number;
  priority: 'high' | 'medium' | 'low';
  relatedTopics: string[];
  recommendedAction?: string;
  completed: boolean;
}

export interface LearningPreferences {
  explanationStyle: 'very_simple' | 'standard' | 'detailed';
  learningPreference: 'worked_examples' | 'visual_explanations' | 'theory' | 'practice_questions' | 'balanced';
  sessionLength: number; // in minutes (10, 20, 30, 45, custom)
  adhdFocusMode: boolean;
  largerText: boolean;
  increasedSpacing: boolean;
  reducedMotion: boolean;
  darkMode: boolean;
  studyReminders: boolean;
}

export type HelpRequestType = 
  | 'simplify'
  | 'explain_simpler'
  | 'smaller_steps'
  | 'explain_symbols'
  | 'formula_symbols'
  | 'worked_example'
  | 'visual_explanation'
  | 'prerequisite'
  | 'prerequisite_concept'
  | 'why_wrong'
  | 'custom_description';

export type GenerationResourceOption = 
  | 'organized_notes'
  | 'simple_explanations'
  | 'detailed_explanations'
  | 'worked_examples'
  | 'flashcards'
  | 'qa_sets'
  | 'practice_questions'
  | 'mini_quiz'
  | 'full_exam'
  | 'formula_sheet'
  | 'topic_summary';

export type DashboardTab = 'notes' | 'flashcards' | 'quizzes' | 'mastery' | 'sources' | 'course_map';

export type GenerationMode = 'course_materials_only' | 'verified_supplementary';

export type ContentStatusLabel = 
  | 'supported_by_course_materials'
  | 'supplemented_with_external'
  | 'conflicting_sources'
  | 'insufficient_source_information'
  | 'processing_issue'
  | 'needs_review'
  | 'user_edited';

export interface VerificationResult {
  isVerified: boolean;
  supportedClaimsCount: number;
  totalClaimsCount: number;
  unsupportedClaims: string[];
  conflictingSources: string[];
  verificationStatus: ContentStatusLabel;
}
