import React, { useState, useEffect, useRef } from 'react';
import { Sentence, Translation, User, Language, Word, WordTranslation } from '../types';
import { Button, Card, toast, Skeleton, Badge } from './UI'; 
import { getTranslationSuggestion } from '../services/geminiService';
import { WordDefinitionModal } from './WordDefinitionModal';
import { StorageService } from '../services/storageService';
import { SpellingCorrectionModal } from './SpellingCorrectionModal';

interface TranslatorProps {
  sentences: Sentence[]; // Kept for type compat
  translations: Translation[];
  user: User;
  users?: User[];
  targetLanguage: Language;
  onSaveTranslation: (t: Translation) => void; 
  words: Word[];
  wordTranslations: WordTranslation[];
  onSaveWordTranslation: (wt: string, nt: string, t: string, n: string, id: number) => void;
  onAddComment: (id: string, txt: string) => void;
  onVote: (id: string, type: 'up' | 'down') => void;
  onFlag: (type: 'sentence' | 'translation', id: string | number) => void;
}

export const Translator: React.FC<TranslatorProps> = ({ translations, user, users = [], targetLanguage, onSaveTranslation, words, wordTranslations, onSaveWordTranslation, onAddComment, onVote, onFlag }) => {
  const [currentTask, setCurrentTask] = useState<Sentence | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [text, setText] = useState('');
  const [sessionCount, setSessionCount] = useState(0);
  const [selectedWord, setSelectedWord] = useState<{t: string, n: string} | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  
  // Spelling Modal
  const [isSpellingModalOpen, setIsSpellingModalOpen] = useState(false);
  const [selectedTranslationForEdit, setSelectedTranslationForEdit] = useState<Translation | null>(null);

  const processedIds = useRef<Set<number>>(new Set());
  const SESSION_GOAL = 10;

  const sentenceTranslations = translations.filter(t => t.sentenceId === currentTask?.id && t.languageCode === targetLanguage.code);
  const myTranslation = sentenceTranslations.find(t => t.translatorId === user.id);
  const communityTranslations = sentenceTranslations.filter(t => t.translatorId !== user.id).sort((a, b) => b.votes - a.votes);

  useEffect(() => {
      loadNextTask();
      return () => {
          if (currentTask?.id) StorageService.unlockSentence(currentTask.id.toString());
      };
  }, []);

  useEffect(() => {
      if (myTranslation) {
          setText(myTranslation.text);
      }
  }, [myTranslation, currentTask]);

  const loadNextTask = async () => {
      setIsLoading(true);
      setErrorMsg(null);
      setText('');
      setShowSuccess(false); 
      try {
          let task: Sentence | null = null;
          let attempts = 0;
          
          const myDoneIds = new Set(translations.filter(t => t.translatorId === user.id).map(t => t.sentenceId));
          
          while (attempts < 5) {
              if (attempts === 0) {
                  task = await StorageService.getSmartQueueTask(user);
              } else {
                  // @ts-ignore
                  task = await StorageService.getSmartQueueTask(user, Array.from(processedIds.current));
              }
              
              if (!task) break; 
              
              if (processedIds.current.has(task.id) || myDoneIds.has(task.id)) {
                  processedIds.current.add(task.id);
                  task = null; 
              } else {
                  break; 
              }
              attempts++;
          }

          const count = await StorageService.getSentenceCount();

          if (!task && count === 0) {
              setErrorMsg("Database is empty. Please go to Admin Panel > Data Import to upload sentences.");
          }
          setCurrentTask(task);
      } catch (e: any) {
          console.error("Failed to load task", e);
          if (e.message && e.message.includes("requires an index")) {
              setErrorMsg("System Error: Firestore Index Missing. Check console.");
          } else {
              setErrorMsg("Could not fetch task.");
          }
      } finally {
          setIsLoading(false);
      }
  };

  const getMotivation = () => {
      const msgs = ["Great job!", "Keep going!", "Nice work!", "Fantastic!", "Well done!"];
      return msgs[Math.floor(Math.random() * msgs.length)];
  };

  const handleSave = async () => {
      if (!currentTask) return;
      
      const translationId = myTranslation ? myTranslation.id : crypto.randomUUID();

      const translation: Translation = {
          id: translationId,
          sentenceId: currentTask.id,
          text: text,
          languageCode: targetLanguage.code,
          translatorId: user.id,
          timestamp: Date.now(),
          votes: myTranslation?.votes || 0,
          voteHistory: myTranslation?.voteHistory || {},
          status: 'pending'
      };

      setIsLoading(true);
      try {
        onSaveTranslation(translation); 
        await StorageService.submitTranslation(translation, user);
        
        processedIds.current.add(currentTask.id);

        setShowSuccess(true); 
        setSessionCount(prev => prev + 1);
        toast.success(myTranslation ? "Translation Updated!" : getMotivation());
        
        setTimeout(() => {
            loadNextTask();
        }, 1200);

      } catch(e) {
        toast.error("Failed to save. Check your connection.");
        setIsLoading(false);
      }
  };
  
  const handleSkip = async () => {
      if (!currentTask) return;
      toast.info("Skipping...");
      processedIds.current.add(currentTask.id);
      await StorageService.unlockSentence(currentTask.id.toString());
      await loadNextTask();
  };

  const handleAi = async () => {
      if (currentTask) {
          toast.info("Asking AI...");
          const suggestion = await getTranslationSuggestion(currentTask.english, targetLanguage);
          if(suggestion) setText(suggestion);
          else toast.error("AI request failed.");
      }
  };

  const getExistingTranslations = (normalized: string) => {
      const word = words.find(w => w.normalizedText === normalized);
      if (!word) return [];
      return wordTranslations.filter(wt => wt.wordId === word.id && wt.languageCode === targetLanguage.code);
  };

  const getUserName = (id: string) => users?.find(u => u.id === id)?.name || 'Unknown';

  const handleCommentChange = (id: string, val: string) => {
      setCommentInputs(prev => ({ ...prev, [id]: val }));
  };

  const submitComment = (id: string) => {
      const txt = commentInputs[id];
      if (txt && txt.trim()) {
          onAddComment(id, txt);
          setCommentInputs(prev => ({ ...prev, [id]: '' }));
      }
  };

  const openSpellingModal = (t: Translation) => {
      setSelectedTranslationForEdit(t);
      setIsSpellingModalOpen(true);
  };

  if (showSuccess) return (
      <div className="max-w-3xl mx-auto py-20 text-center animate-fade-in">
          <div className="bg-white rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center shadow-lg shadow-emerald-100 border-4 border-emerald-50">
              <svg className="w-12 h-12 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Translation Submitted!</h2>
          <p className="text-slate-500">Loading next task...</p>
          <div className="mt-8 w-64 mx-auto h-2 bg-slate-100 rounded-full overflow-hidden">
               <div className="h-full bg-emerald-500 animate-[loading_1s_ease-in-out_infinite]"></div>
          </div>
      </div>
  );

  if (isLoading) return (
      <div className="max-w-3xl mx-auto mt-10 space-y-6">
          <div className="flex justify-between items-center animate-pulse">
               <div className="h-8 w-32 bg-slate-200 rounded-full"></div>
               <div className="h-8 w-24 bg-slate-200 rounded-full"></div>
          </div>
          <Skeleton className="h-40 w-full rounded-3xl" />
          <Skeleton className="h-60 w-full rounded-3xl" />
      </div>
  );

  if (errorMsg) return (
      <div className="max-w-lg mx-auto py-20 text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-red-600 mb-2">Connection Issue</h2>
          <p className="text-slate-600 mb-6">{errorMsg}</p>
          <Button onClick={loadNextTask}>Retry</Button>
      </div>
  );

  if (!currentTask) return (
      <div className="max-w-lg mx-auto py-20 text-center bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 border border-slate-100">
          <div className="text-6xl mb-4">🤔</div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">No active tasks found</h2>
          <p className="text-slate-500 mb-6">You've translated everything available in the queue for now.</p>
          <Button onClick={() => window.location.reload()}>Refresh Queue</Button>
      </div>
  );

  const progressPercentage = Math.min((sessionCount / SESSION_GOAL) * 100, 100);

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-28">
       <div className="flex flex-col sm:flex-row justify-between items-center gap-4 sticky top-20 z-30 bg-slate-50/95 backdrop-blur py-3 -mx-4 px-4 sm:static sm:bg-transparent sm:p-0 sm:mx-0">
          <div>
              <h2 className="text-lg font-bold text-slate-800">Translation Session</h2>
              <p className="text-xs text-slate-500">Task ID: #{currentTask.id}</p>
          </div>
          
          <div className="w-full sm:w-64">
              <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                  <span>Session Progress</span>
                  <span>{sessionCount} / {SESSION_GOAL}</span>
              </div>
              <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden relative">
                  <div 
                    className="h-full bg-gradient-to-r from-brand-400 to-brand-500 transition-all duration-500 ease-out absolute top-0 left-0"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
              </div>
          </div>
       </div>

       <div className="relative group">
           <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-300 to-brand-500 rounded-[28px] opacity-30 blur transition duration-500 group-hover:opacity-50"></div>
           <Card className="relative !p-8 !rounded-3xl !border-0 !shadow-lg bg-white">
              <div className="text-brand-500 text-xs font-extrabold uppercase tracking-widest mb-6 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse"></span>
                  Translate to {targetLanguage.name}
              </div>
              <div className="text-3xl sm:text-4xl font-bold leading-tight text-slate-800 font-display">
                 {currentTask.english.split(' ').map((w, i) => (
                    <span key={i} onClick={() => setSelectedWord({t: w, n: w.toLowerCase().replace(/[^a-z]/g, '')})} className="cursor-pointer hover:text-brand-600 hover:bg-brand-50 rounded-lg px-1 transition-all active:scale-95 inline-block select-none">
                       {w}{' '}
                    </span>
                 ))}
              </div>
           </Card>
       </div>

       <Card className={`!p-0 !rounded-3xl !overflow-hidden !border-2 transition-colors ${myTranslation ? 'border-blue-300 bg-blue-50/30' : 'border-slate-100 focus-within:!border-brand-300'}`}>
            <div className="p-6 sm:p-8">
                <div className="flex justify-between mb-4">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {myTranslation ? 'Edit Your Translation' : 'Your Translation'}
                    </label>
                    {myTranslation && (
                         <Badge color="blue">You have already translated this</Badge>
                    )}
                </div>
                <textarea 
                  className="w-full border-0 focus:ring-0 p-0 resize-none text-xl sm:text-2xl text-slate-700 placeholder-slate-300 min-h-[120px] bg-transparent leading-relaxed" 
                  rows={3} 
                  placeholder="Type here..." 
                  value={text} 
                  onChange={e => setText(e.target.value)} 
                  autoFocus
                />
            </div>

            <div className="bg-slate-50 px-6 sm:px-8 py-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
               <div className="flex gap-2 w-full sm:w-auto">
                   <Button variant="ghost" size="sm" onClick={handleAi} className="!text-violet-600 hover:!bg-violet-50 flex-1 sm:flex-none flex gap-2 justify-center">
                       <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                       AI Suggest
                   </Button>
                   <Button variant="ghost" size="sm" onClick={handleSkip} className="text-slate-400 hover:text-slate-600 flex-1 sm:flex-none">
                       Skip
                   </Button>
               </div>
               <Button onClick={handleSave} isLoading={isLoading} fullWidth size="lg" className="shadow-lg shadow-brand-500/20 sm:w-auto" disabled={!text.trim()}>
                  {myTranslation ? 'Update Translation' : 'Submit Translation'}
               </Button>
            </div>
       </Card>

       {/* COMMUNITY SECTION */}
       {communityTranslations.length > 0 && (
           <div className="space-y-4 pt-2">
             <div className="flex items-center gap-4 mb-4">
                 <div className="h-px bg-slate-200 flex-1"></div>
                 <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Community Contributions</span>
                 <div className="h-px bg-slate-200 flex-1"></div>
             </div>
             {communityTranslations.map(t => {
                const voteStatus = t.voteHistory?.[user.id];
                return (
                  <Card key={t.id} className="!bg-slate-50/50 !border-slate-200">
                     <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                           <div className="text-lg font-medium text-slate-700 mb-2">{t.text}</div>
                           <div className="flex flex-wrap items-center gap-3">
                              <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                      {getUserName(t.translatorId).substring(0,1).toUpperCase()}
                                  </div>
                                  <span className="text-xs font-semibold text-slate-500">{getUserName(t.translatorId)}</span>
                              </div>
                              <span className="text-xs text-slate-300">•</span>
                              <span className="text-xs text-slate-400">{new Date(t.timestamp).toLocaleDateString()}</span>
                           </div>
                           
                           {t.comments && t.comments.length > 0 && (
                               <div className="mt-3 space-y-2 bg-white/80 p-3 rounded-lg border border-slate-100">
                                   {t.comments.map(c => (
                                       <div key={c.id} className="text-sm text-slate-700">
                                           <span className="font-bold text-xs text-slate-900 mr-2">{c.userName}:</span>
                                           {c.text}
                                       </div>
                                   ))}
                               </div>
                           )}
                        </div>
                        <div className="flex flex-col items-center bg-white rounded-xl border border-slate-100 shadow-sm p-1">
                           <button onClick={() => onVote(t.id, 'up')} className={`p-1.5 rounded-lg transition-colors ${voteStatus === 'up' ? 'text-emerald-500 bg-emerald-50' : 'text-slate-400 hover:bg-slate-50'}`}>
                               <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
                           </button>
                           <span className={`text-xs font-bold py-1 ${t.votes > 0 ? 'text-emerald-600' : 'text-slate-600'}`}>{t.votes}</span>
                           <button onClick={() => onVote(t.id, 'down')} className={`p-1.5 rounded-lg transition-colors ${voteStatus === 'down' ? 'text-rose-500 bg-rose-50' : 'text-slate-400 hover:bg-slate-50'}`}>
                               <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                           </button>
                        </div>
                     </div>
                     <div className="mt-4 pt-3 border-t border-slate-200/60 flex justify-between items-center">
                         <div className="flex gap-2 flex-1">
                             <input 
                                type="text" 
                                placeholder="Add a comment..." 
                                className="flex-1 text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
                                value={commentInputs[t.id] || ''}
                                onChange={(e) => handleCommentChange(t.id, e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') submitComment(t.id); }} 
                             />
                             <Button size="sm" variant="secondary" onClick={() => submitComment(t.id)} disabled={!commentInputs[t.id]?.trim()}>Post</Button>
                         </div>
                         {/* FLAG BUTTON */}
                         <Button variant="ghost" size="sm" className="text-slate-300 hover:text-red-500 ml-2" onClick={() => onFlag('translation', t.id)} title="Flag Issue">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-8a2 2 0 012-2h14a2 2 0 012 2v8l-6-6-6 6-6-6" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21V4a2 2 0 012-2h14a2 2 0 012 2v11l-6-6-6 6-6 6" /></svg>
                         </Button>
                         <Button variant="ghost" size="sm" className="text-purple-600 hover:bg-purple-50 ml-1" onClick={() => openSpellingModal(t)}>
                            ✏️ Fix
                         </Button>
                     </div>
                  </Card>
                );
             })}
           </div>
       )}

       {selectedWord && <WordDefinitionModal isOpen={!!selectedWord} onClose={() => setSelectedWord(null)} selectedWord={selectedWord.t} normalizedWord={selectedWord.n} existingTranslations={getExistingTranslations(selectedWord.n)} targetLanguage={targetLanguage} onSave={(t, n) => { onSaveWordTranslation(selectedWord.t, selectedWord.n, t, n, currentTask.id); setSelectedWord(null); }} />}
       
       {/* SPELLING MODAL */}
       {isSpellingModalOpen && selectedTranslationForEdit && (
          <SpellingCorrectionModal 
            isOpen={isSpellingModalOpen} 
            onClose={() => setIsSpellingModalOpen(false)} 
            translation={selectedTranslationForEdit}
            user={user}
          />
       )}
    </div>
  );
};