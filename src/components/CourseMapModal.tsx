import React, { useState } from 'react';
import { Course, SyllabusCourseMap, SyllabusSession } from '../types';
import { 
  Sparkles, 
  X, 
  Calendar, 
  BookOpen, 
  CheckCircle2, 
  Layers, 
  Target, 
  Edit3, 
  RefreshCw, 
  ArrowRight,
  FileText
} from 'lucide-react';
import { cn } from '../lib/utils';

interface CourseMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course;
  onSaveCourseMap: (newMap: SyllabusCourseMap) => void;
}

export default function CourseMapModal({
  isOpen,
  onClose,
  course,
  onSaveCourseMap
}: CourseMapModalProps) {
  if (!isOpen) return null;

  const [courseMap, setCourseMap] = useState<SyllabusCourseMap>(
    course.syllabusMap || {
      courseName: course.name,
      courseCode: course.code || 'COURSE',
      semester: course.term || 'Fall 2026',
      sessions: [
        {
          id: 'ses-1',
          weekNumber: 1,
          sessionNumber: 1,
          topicTitle: 'Course Overview & Fundamentals',
          topicDescription: 'Introduction to core principles and syllabus objectives.',
          assignedChapters: 'Chapter 1',
          assignedPageRanges: '1–20',
          learningObjectives: ['Define core vocabulary', 'Understand syllabus expectations']
        }
      ],
      lastUpdated: new Date().toISOString()
    }
  );

  const [isExtracting, setIsExtracting] = useState(false);
  const [extractStatus, setExtractStatus] = useState('');

  const handleExtractFromSyllabus = async () => {
    const syllabusSource = course.sources.find(s => s.sourceType === 'syllabus' || s.title.toLowerCase().includes('syllabus'));
    const targetText = syllabusSource ? syllabusSource.content : course.sources.map(s => s.content).join('\n\n');

    if (!targetText || targetText.trim().length < 20) {
      alert('Please upload a syllabus document to this course first before extracting the course map.');
      return;
    }

    setIsExtracting(true);
    setExtractStatus('Extracting structured weeks, sessions, and topics from syllabus...');

    try {
      const res = await fetch('/api/gemini/parse-syllabus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: targetText,
          courseName: course.name
        })
      });

      if (!res.ok) throw new Error('Failed to parse syllabus');
      const json = await res.json();
      if (json.courseMap) {
        setCourseMap(json.courseMap);
      }
      setIsExtracting(false);
    } catch (err) {
      console.error('Syllabus extraction error:', err);
      setIsExtracting(false);
    }
  };

  const handleUpdateSessionTopic = (index: number, newTitle: string) => {
    const updated = { ...courseMap };
    updated.sessions[index].topicTitle = newTitle;
    setCourseMap(updated);
  };

  const handleSave = () => {
    onSaveCourseMap(courseMap);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-purple-50/60 dark:bg-purple-950/20 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-600 text-white shadow-2xs">
              <Calendar size={18} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block">
                Automatic Syllabus Mapping
              </span>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Course Map Preview & Verification
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExtractFromSyllabus}
              disabled={isExtracting}
              className="px-3 py-1.5 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 hover:bg-purple-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RefreshCw size={13} className={cn(isExtracting && "animate-spin")} />
              <span>{isExtracting ? 'Extracting...' : 'Auto-Extract from Syllabus'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{courseMap.courseName} ({courseMap.courseCode})</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Semester: {courseMap.semester} • {courseMap.sessions.length} Sessions Mapped</p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold inline-flex items-center gap-1">
              <CheckCircle2 size={13} /> Verified Course Map
            </span>
          </div>

          {isExtracting && (
            <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs text-purple-900 dark:text-purple-200 font-semibold animate-pulse text-center">
              {extractStatus}
            </div>
          )}

          <div className="space-y-3">
            {courseMap.sessions.map((session, idx) => (
              <div 
                key={session.id || idx}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 space-y-2 hover:border-purple-300 transition-all"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-[10px] font-extrabold uppercase tracking-wider">
                    Week {session.weekNumber} • Session {session.sessionNumber}
                  </span>
                  {session.assignedChapters && (
                    <span className="text-[11px] text-slate-500 font-medium">
                      📖 {session.assignedChapters} {session.assignedPageRanges ? `(pp. ${session.assignedPageRanges})` : ''}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <input
                    type="text"
                    value={session.topicTitle}
                    onChange={(e) => handleUpdateSessionTopic(idx, e.target.value)}
                    className="w-full text-xs font-bold text-slate-900 dark:text-white px-2.5 py-1.5 rounded-xl border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-purple-500 focus:bg-slate-50 dark:focus:bg-slate-800 transition-all"
                  />
                  {session.topicDescription && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 px-2.5">{session.topicDescription}</p>
                  )}
                </div>

                {session.learningObjectives && session.learningObjectives.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-1.5 px-2.5">
                    {session.learningObjectives.map((obj, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300 font-medium">
                        🎯 {obj}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-md shadow-purple-600/20 transition-all cursor-pointer"
          >
            <span>Confirm & Save Course Map</span>
            <CheckCircle2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
