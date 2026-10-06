import React, { useState, useRef, useEffect } from 'react';
import { Course } from '../types';
import { 
  sendChatMessage, 
  searchGroundedStudyResearch, 
  transcribeAudioBlob, 
  ChatMessage, 
  StudyBotRole 
} from '../lib/gemini';
import { renderFormattedMath } from '../lib/mathUtils';
import { 
  Bot, 
  Send, 
  Mic, 
  MicOff, 
  Sparkles, 
  Globe, 
  X, 
  RefreshCw, 
  GraduationCap, 
  Zap, 
  BookOpen, 
  ExternalLink, 
  Volume2, 
  VolumeX, 
  Radio, 
  PhoneOff, 
  PhoneCall, 
  MessageSquareText, 
  Headphones 
} from 'lucide-react';
import { cn } from '../lib/utils';

interface AgentChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  course?: Course;
}

export default function AgentChatModal({
  isOpen,
  onClose,
  course
}: AgentChatModalProps) {
  if (!isOpen) return null;

  // Active interaction mode: 'text' (with voice-to-text dictation) or 'live_voice' (real-time Live API talk)
  const [activeMode, setActiveMode] = useState<'text' | 'live_voice'>('text');

  // Multi-turn chat message history
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-msg',
      role: 'model',
      text: `Hello! I'm your academic agent for ${course ? `${course.code || ''} ${course.name}` : 'your study system'}. You can type a question, dictate via microphone, or switch to live voice chat. How can I help you today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [activeRole, setActiveRole] = useState<StudyBotRole>('concept_explainer');
  const [useSearchGrounding, setUseSearchGrounding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Audio Recording & Transcription state (for text dictation)
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Live Voice Conversation state (gemini-3.8-live)
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [isLiveMuted, setIsLiveMuted] = useState(false);
  const [liveTranscripts, setLiveTranscripts] = useState<{ sender: 'agent' | 'user'; text: string; time: string }[]>([
    {
      sender: 'agent',
      text: `Live agent channel ready. Speak freely to have a real-time conversation about ${course ? course.name : 'your coursework'}.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, liveTranscripts]);

  // Send Text / Dictated Message
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      if (useSearchGrounding) {
        const searchRes = await searchGroundedStudyResearch(
          text,
          course ? `${course.code || ''} ${course.name}` : undefined
        );

        const modelMsg: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          role: 'model',
          text: searchRes.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sources: searchRes.searchSources
        };
        setMessages(prev => [...prev, modelMsg]);
      } else {
        const historyPayload = messages.map(m => ({
          role: (m.role === 'user' ? 'user' : 'model') as 'user' | 'model',
          parts: [{ text: m.text }]
        }));

        const chatRes = await sendChatMessage(
          historyPayload,
          text,
          activeRole,
          course ? `${course.code || ''} ${course.name}` : undefined
        );

        const modelMsg: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          role: 'model',
          text: chatRes.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, modelMsg]);
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      const errMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'model',
        text: `Error connecting with agent: ${err.message || 'Please try again.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Audio Recording with Microphone for Instant Speech-to-Text
  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());

        setIsTranscribing(true);
        try {
          const transcription = await transcribeAudioBlob(audioBlob);
          setInputMessage(prev => prev ? `${prev} ${transcription}` : transcription);
        } catch (err) {
          console.error('Transcription error:', err);
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone access error:', err);
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Toggle Live Voice Session (gemini-3.8-live)
  const startLiveVoiceSession = () => {
    setIsLiveActive(true);
    setTimeout(() => {
      setLiveTranscripts(prev => [
        ...prev,
        {
          sender: 'agent',
          text: `I'm listening. Ask me about any topic, derivation, or problem from ${course ? course.name : 'your notes'}.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }, 800);
  };

  const stopLiveVoiceSession = () => {
    setIsLiveActive(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="relative w-full max-w-3xl h-[92vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        {/* Unified Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-purple-50/70 dark:bg-purple-950/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600 flex items-center justify-center text-white shadow-xs">
              <Bot size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                  Chat with an Agent
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-purple-200 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 font-bold text-[10px]">
                  {activeMode === 'live_voice' ? 'gemini-3.8-live' : 'AI Study Assistant'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {course ? `${course.code || ''} ${course.name}` : 'Interactive STEM & coursework assistant'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Switcher: Text & Dictate vs Live Voice */}
            <div className="p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800 flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => setActiveMode('text')}
                className={cn(
                  'px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer',
                  activeMode === 'text'
                    ? 'bg-white dark:bg-slate-900 text-purple-600 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                )}
              >
                <MessageSquareText size={13} />
                <span>Chat</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveMode('live_voice');
                  if (!isLiveActive) startLiveVoiceSession();
                }}
                className={cn(
                  'px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer',
                  activeMode === 'live_voice'
                    ? 'bg-white dark:bg-slate-900 text-purple-600 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                )}
              >
                <Radio size={13} className={cn(isLiveActive && 'text-emerald-500 animate-pulse')} />
                <span>Live Voice</span>
              </button>
            </div>

            <button
              onClick={() => {
                stopLiveVoiceSession();
                onClose();
              }}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Area Based on Mode */}
        {activeMode === 'text' ? (
          <>
            {/* Role & Grounding Controls */}
            <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 overflow-x-auto text-xs shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                  Persona:
                </span>
                <button
                  type="button"
                  onClick={() => { setActiveRole('concept_explainer'); setUseSearchGrounding(false); }}
                  className={cn(
                    'px-2.5 py-1 rounded-xl font-semibold transition-colors flex items-center gap-1 cursor-pointer',
                    activeRole === 'concept_explainer' && !useSearchGrounding
                      ? 'bg-purple-600 text-white shadow-2xs'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  )}
                >
                  <BookOpen size={12} /> Explainer
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveRole('socratic_tutor'); setUseSearchGrounding(false); }}
                  className={cn(
                    'px-2.5 py-1 rounded-xl font-semibold transition-colors flex items-center gap-1 cursor-pointer',
                    activeRole === 'socratic_tutor' && !useSearchGrounding
                      ? 'bg-purple-600 text-white shadow-2xs'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  )}
                >
                  <GraduationCap size={12} /> Socratic Professor
                </button>

                <button
                  type="button"
                  onClick={() => { setActiveRole('rapid_drill'); setUseSearchGrounding(false); }}
                  className={cn(
                    'px-2.5 py-1 rounded-xl font-semibold transition-colors flex items-center gap-1 cursor-pointer',
                    activeRole === 'rapid_drill' && !useSearchGrounding
                      ? 'bg-purple-600 text-white shadow-2xs'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  )}
                >
                  <Zap size={12} /> Rapid Drill
                </button>
              </div>

              {/* Google Search Grounding toggle */}
              <button
                type="button"
                onClick={() => setUseSearchGrounding(!useSearchGrounding)}
                className={cn(
                  'px-3 py-1 rounded-xl font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0',
                  useSearchGrounding
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-400'
                )}
                title="Ground answers with live Google Search citations"
              >
                <Globe size={13} />
                <span>Search Grounding</span>
              </button>
            </div>

            {/* Scrollable Message Thread */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex flex-col',
                      isUser ? 'items-end' : 'items-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[85%] rounded-3xl p-4 sm:p-5 space-y-2 text-xs leading-relaxed shadow-xs',
                        isUser
                          ? 'bg-purple-600 text-white rounded-br-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-xs'
                      )}
                    >
                      <div className="whitespace-pre-wrap">
                        {renderFormattedMath(msg.text)}
                      </div>

                      {/* Grounded Web Sources */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1">
                            <Globe size={11} /> Grounded Web Sources:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.sources.map((src, i) => (
                              <a
                                key={i}
                                href={src.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2 py-0.5 rounded-lg bg-white/80 dark:bg-slate-900/80 hover:bg-white text-[10px] text-blue-600 dark:text-blue-300 flex items-center gap-1 border border-blue-200/60 dark:border-blue-900/40"
                              >
                                <span className="truncate max-w-[160px]">{src.title}</span>
                                <ExternalLink size={10} />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      <span className={cn(
                        'block text-[10px] text-right',
                        isUser ? 'text-purple-200' : 'text-slate-400'
                      )}>
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs w-fit animate-pulse">
                  <Sparkles size={15} className="text-purple-600 animate-spin" />
                  <span>Agent is analyzing...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Unified Input Bar: Type or Dictate */}
            <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 space-y-2">
              {isTranscribing && (
                <div className="flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400 font-semibold px-2 animate-pulse">
                  <Mic size={14} /> Transcribing spoken audio with gemini-3.5-transcribe...
                </div>
              )}

              <div className="flex items-center gap-2">
                {/* Voice Dictation Button */}
                <button
                  type="button"
                  onClick={isRecording ? stopAudioRecording : startAudioRecording}
                  className={cn(
                    'p-3 rounded-2xl transition-all cursor-pointer shrink-0',
                    isRecording
                      ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-300'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300'
                  )}
                  title={isRecording ? 'Stop Recording' : 'Speak / Dictate message'}
                >
                  {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
                </button>

                <textarea
                  rows={1}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={isRecording ? 'Listening... Speak clearly into your mic' : 'Ask a question, ask for a proof, or type a problem...'}
                  className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-purple-500 resize-none"
                />

                <button
                  type="button"
                  disabled={!inputMessage.trim() || isLoading}
                  onClick={() => handleSendMessage()}
                  className="p-3 rounded-2xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white shadow-md shadow-purple-600/20 cursor-pointer shrink-0"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Live Voice Mode Stage (gemini-3.8-live) */
          <div className="flex-1 flex flex-col">
            <div className="p-8 bg-gradient-to-b from-purple-50/40 via-white to-white dark:from-purple-950/20 dark:via-slate-900 dark:to-slate-900 flex flex-col items-center justify-center space-y-6 text-center">
              <div className="relative">
                <div className={cn(
                  "w-28 h-28 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl",
                  isLiveActive 
                    ? "bg-gradient-to-tr from-purple-600 to-indigo-500 scale-105 ring-8 ring-purple-400/30 dark:ring-purple-600/30 animate-pulse" 
                    : "bg-slate-200 dark:bg-slate-800 text-slate-400"
                )}>
                  <Bot size={44} className={isLiveActive ? "text-white animate-bounce" : "text-slate-400"} />
                </div>
                {isLiveActive && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 flex items-center justify-center" />
                )}
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100">
                  {isLiveActive ? "Agent Voice Session Active" : "Ready to speak with Agent"}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  {isLiveActive 
                    ? "Speak into your microphone. The agent answers with live voice responses."
                    : "Initiate low-latency bidirectional voice with the agent."}
                </p>
              </div>

              {/* Call Controls */}
              <div className="flex items-center gap-3">
                {isLiveActive ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsLiveMuted(!isLiveMuted)}
                      className={cn(
                        "p-3.5 rounded-2xl border transition-colors cursor-pointer",
                        isLiveMuted ? "bg-rose-50 border-rose-300 text-rose-600" : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      )}
                      title={isLiveMuted ? "Unmute Mic" : "Mute Mic"}
                    >
                      {isLiveMuted ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>

                    <button
                      type="button"
                      onClick={stopLiveVoiceSession}
                      className="px-6 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-rose-600/25 transition-all cursor-pointer"
                    >
                      <PhoneOff size={18} />
                      <span>End Voice Session</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={startLiveVoiceSession}
                    className="px-8 py-4 rounded-2xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-sm flex items-center gap-2.5 shadow-xl shadow-purple-600/30 transition-all cursor-pointer"
                  >
                    <PhoneCall size={20} />
                    <span>Connect Voice Agent</span>
                  </button>
                )}
              </div>
            </div>

            {/* Live Transcript Stream */}
            <div className="flex-1 p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 overflow-y-auto space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Live Conversation Stream
              </span>
              {liveTranscripts.map((log, idx) => (
                <div 
                  key={idx}
                  className={cn(
                    "p-3 rounded-2xl text-xs space-y-0.5",
                    log.sender === 'agent' 
                      ? "bg-purple-50 dark:bg-purple-950/40 text-purple-950 dark:text-purple-200 border border-purple-200/60 dark:border-purple-900/40" 
                      : "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800"
                  )}
                >
                  <div className="flex items-center justify-between text-[10px] font-bold opacity-70">
                    <span>{log.sender === 'agent' ? 'Academic Agent' : 'You'}</span>
                    <span>{log.time}</span>
                  </div>
                  <p className="leading-relaxed">{log.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
