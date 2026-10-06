import React, { useState } from 'react';
import { HelpRequestType } from '../types';
import { 
  HelpCircle, 
  X, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  BookOpen, 
  Layers, 
  Lightbulb, 
  ListOrdered, 
  Search, 
  Eye, 
  AlertTriangle 
} from 'lucide-react';
import { cn } from '../lib/utils';
import { renderFormattedMath } from '../lib/mathUtils';

interface ConfusedModalProps {
  isOpen: boolean;
  onClose: () => void;
  contextTitle: string;
  contextSnippet?: string;
  contextType?: 'note' | 'formula' | 'step' | 'question' | 'general';
}

export default function ConfusedModal({
  isOpen,
  onClose,
  contextTitle,
  contextSnippet,
  contextType = 'general'
}: ConfusedModalProps) {
  if (!isOpen) return null;

  const [selectedHelpType, setSelectedHelpType] = useState<HelpRequestType | null>(null);
  const [customDescription, setCustomDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [resolution, setResolution] = useState<{
    title: string;
    content: string;
    takeaway: string;
  } | null>(null);

  const options: { id: HelpRequestType; label: string; desc: string; icon: React.ReactNode }[] = [
    {
      id: 'simplify',
      label: 'Explain this more simply',
      desc: 'Use everyday language, metaphors, and intuitive analogies',
      icon: <Lightbulb size={16} />
    },
    {
      id: 'smaller_steps',
      label: 'Break it into smaller steps',
      desc: 'Show microscopic intermediate reasoning steps without skipping',
      icon: <ListOrdered size={16} />
    },
    {
      id: 'explain_symbols',
      label: 'Explain each symbol in the formula',
      desc: 'Define what every Greek letter, subscript, and operator represents',
      icon: <Search size={16} />
    },
    {
      id: 'worked_example',
      label: 'Show me a worked example',
      desc: 'Walk through concrete numbers from problem statement to final answer',
      icon: <Layers size={16} />
    },
    {
      id: 'visual_explanation',
      label: 'Show me a visual explanation',
      desc: 'Provide an intuitive mental diagram and spatial picture',
      icon: <Eye size={16} />
    },
    {
      id: 'prerequisite',
      label: 'Explain the prerequisite concept',
      desc: 'Review the earlier definition needed to understand this part',
      icon: <BookOpen size={16} />
    },
    {
      id: 'why_wrong',
      label: 'Explain why my answer was wrong',
      desc: 'Diagnose the subtle misconception or common trap in this step',
      icon: <AlertTriangle size={16} />
    },
    {
      id: 'custom_description',
      label: 'Let me describe what is confusing me',
      desc: 'Type your exact question or doubt in your own words',
      icon: <HelpCircle size={16} />
    }
  ];

  const handleResolve = () => {
    setIsGenerating(true);
    setTimeout(() => {
      let resTitle = '';
      let resContent = '';
      let resTakeaway = '';

      if (selectedHelpType === 'simplify') {
        resTitle = `Simplified Breakdown for ${contextTitle}`;
        resContent = `Think of ${contextTitle} like an audio equalizer filter: each sound frequency is isolated and controlled independently. When we operate on the system, we aren't changing the fundamental tone; we're just adjusting the volume of each independent component.`;
        resTakeaway = `Core rule: Separate the direction (which never tilts) from the multiplier (which only stretches or compresses).`;
      } else if (selectedHelpType === 'smaller_steps') {
        resTitle = `Micro-Step Roadmap for ${contextTitle}`;
        resContent = `Step A: First isolate the known constants on the right-hand side.\nStep B: Factor out common scalar multiples to avoid carrying large fractions.\nStep C: Apply the algebraic identity (A - λ I)v = 0 one row at a time.\nStep D: Verify that the resulting rows are linearly dependent; if they aren't, re-check the determinant arithmetic.`;
        resTakeaway = `Never perform determinant expansion and quadratic factoring simultaneously in your head. Write out every single binomial term.`;
      } else if (selectedHelpType === 'explain_symbols') {
        resTitle = `Symbol Dictionary for ${contextTitle}`;
        resContent = `• λ (lambda): Scalar eigenvalue multiplier.\n• A: The original transformation matrix.\n• I: Identity matrix with 1s on diagonal and 0s elsewhere.\n• v: Non-zero eigenvector direction.\n• det: Determinant, measuring volume scaling factor.\n• Null(A): Set of all vectors mapped to the zero vector.`;
        resTakeaway = `λ is just a single real or complex number, while v is a directional vector with n components.`;
      } else if (selectedHelpType === 'worked_example') {
        resTitle = `Concrete Number Example for ${contextTitle}`;
        resContent = `Let's use clean integers: Matrix A = [[2, 1], [0, 3]].\nSubtract λ from the diagonal: (2 - λ)(3 - λ) - 0 = 0.\nRoots: λ = 2 and λ = 3.\nNotice that because the matrix was triangular, the eigenvalues were simply the diagonal numbers themselves.`;
        resTakeaway = `For triangular or diagonal matrices, you can read the eigenvalues straight off the main diagonal without any calculation.`;
      } else if (selectedHelpType === 'visual_explanation') {
        resTitle = `Spatial Mental Model for ${contextTitle}`;
        resContent = `Imagine drawing a circle in a 2D coordinate grid. When the matrix transformation acts on the circle, it stretches it into an ellipse.\nThe eigenvectors are the long and short axes of the ellipse! They are the only directions that did not twist sideways—they only stretched. The lengths of those axes are the eigenvalues λ.`;
        resTakeaway = `Eigenvectors are the invariant axes of the stretched ellipse.`;
      } else if (selectedHelpType === 'why_wrong') {
        resTitle = `Error Diagnosis for ${contextTitle}`;
        resContent = `The most common mistake here is assuming that because A has non-zero elements everywhere, it must be invertible. Invertibility depends strictly on linear independence of the columns, measured by det(A) ≠ 0. If two rows are proportional, det(A) collapses to zero regardless of how large the numbers are.`;
        resTakeaway = `Always check if one row is a scalar multiple of another before performing extensive row reduction.`;
      } else {
        resTitle = `Personal Clarification for ${contextTitle}`;
        resContent = customDescription.trim() 
          ? `Addressing your question: "${customDescription}"\n\nWhen working through this concept, remember that the governing theorem guarantees unique steady-state convergence as long as the matrix has no isolated absorbing cycles. Each step builds on conserving total probability (summing to 1.0).`
          : `Whenever this feels overwhelming, strip away the matrix notation and write the problem as two simple coupled equations. Solving for one variable and substituting it back into the normalization equation q₁ + q₂ = 1 immediately yields the solution.`;
        resTakeaway = `Break coupled systems into single-variable substitutions.`;
      }

      setResolution({
        title: resTitle,
        content: resContent,
        takeaway: resTakeaway
      });
      setIsGenerating(false);
    }, 400);
  };

  const handleReset = () => {
    setSelectedHelpType(null);
    setResolution(null);
    setCustomDescription('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-purple-50/60 dark:bg-purple-950/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-600 text-white shadow-2xs">
              <HelpCircle size={18} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                Contextual Help Assistant
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                “I’m Confused”
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Context Snippet */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs">
            <span className="text-slate-400 block font-semibold mb-0.5">Confusion Context:</span>
            <div className="font-bold text-slate-800 dark:text-slate-200">{contextTitle}</div>
            {contextSnippet && (
              <p className="text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 italic font-mono text-[11px]">
                "{contextSnippet}"
              </p>
            )}
          </div>

          {!resolution ? (
            <div className="space-y-4">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                What kind of help would be most useful right now?
              </label>

              <div className="space-y-2">
                {options.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedHelpType(opt.id)}
                    className={cn(
                      'w-full text-left p-3 rounded-2xl border text-xs transition-all flex items-start gap-3 cursor-pointer',
                      selectedHelpType === opt.id
                        ? 'border-purple-600 bg-purple-50/70 dark:bg-purple-950/40 text-purple-950 dark:text-purple-200 ring-2 ring-purple-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                    )}
                  >
                    <span className={cn('p-1 rounded-lg shrink-0 mt-0.5', selectedHelpType === opt.id ? 'bg-purple-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500')}>
                      {opt.icon}
                    </span>
                    <div className="space-y-0.5">
                      <p className="font-bold">{opt.label}</p>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px]">{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>

              {selectedHelpType === 'custom_description' && (
                <div className="pt-2 animate-in fade-in duration-150 space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">
                    Describe what is confusing you:
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. I understand step 1, but I do not see how subtracting λ allows us to find the null space vector in step 2..."
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-600 dark:text-purple-400">
                <Sparkles size={16} />
                <span>{resolution.title}</span>
              </div>

              <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-900/40 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                {renderFormattedMath(resolution.content)}
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-xs text-emerald-900 dark:text-emerald-300 space-y-1">
                <span className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 size={14} /> Quick Key Takeaway:
                </span>
                <p className="leading-relaxed">{renderFormattedMath(resolution.takeaway)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex items-center justify-between shrink-0">
          {!resolution ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400"
              >
                Close
              </button>
              <button
                type="button"
                disabled={!selectedHelpType || (selectedHelpType === 'custom_description' && !customDescription.trim()) || isGenerating}
                onClick={handleResolve}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md shadow-purple-600/20 transition-all cursor-pointer"
              >
                {isGenerating ? (
                  <span>Clarifying...</span>
                ) : (
                  <>
                    <span>Get Clarification</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 text-xs font-semibold text-purple-600 hover:underline cursor-pointer"
              >
                Ask another question
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                I Understand Now
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
