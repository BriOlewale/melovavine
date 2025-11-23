import React, { useState, useEffect } from 'react';
import { Sentence, Translation, User, Language, Word, WordTranslation } from '../types';
import { Button, Card, toast, Skeleton } from './UI'; 
import { getTranslationSuggestion } from '../services/geminiService';
import { WordDefinitionModal } from './WordDefinitionModal';
import { StorageService } from '../services/storageService';

interface TranslatorProps {
  sentences: Sentence[]; 
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
}

export const Translator: React.FC<TranslatorProps> = ({ user, targetLanguage, words, wordTranslations, onSaveWordTranslation }) => {
  const [currentTask, setCurrentTask] = useState<Sentence | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [text, setText] = useState('');
  const [sessionCount, setSessionCount] = useState(0);
  const [selectedWord, setSelectedWord] = useState<{t: string, n: string} | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [totalDbCount, setTotalDbCount] = useState(0); // New state to diagnose data issues
  
  const SESSION_GOAL = 10;

  useEffect(() => {
      loadNextTask();
      return () => {
          if (currentTask?.id) StorageService.unlockSentence(currentTask.id.toString());
      };
  }, []);

  const loadNextTask = async () => {
      setIsLoading(true);
      setErrorMsg(null);
      setText('');
      try {
          const task = await StorageService.getSmartQueueTask(user);
          const count = await StorageService.getSentenceCount();
          setTotalDbCount(count);

          if (!task) {
              if (count === 0) {
                  setErrorMsg("Database is empty. Please go to Admin Panel > Data Import to upload sentences.");
              } else {
                  // Data exists but queue is empty -> Likely missing 'status' or 'priorityScore'
                  // We don't set errorMsg here, we show a specific UI below
              }
          }
          setCurrentTask(task);
      } catch (e: any) {
          console.error("Failed to load task", e);
          if (e.message && e.message.includes("requires an index")) {
              setErrorMsg("System Error: Firestore Index Missing. Please check the browser console (F12) for the Google link to create it.");
          } else {
              setErrorMsg("Could not fetch a new task. " + (e.message || "Unknown error"));
          }
      } finally {
          setIsLoading(false);
      }
  };

  const getMotivation = () => {
      const msgs = [
          "Great job — that one makes a difference!",
          "You’re on a roll! Keep it going.",
          "Another translation completed — you’re helping preserve culture.",
          "Fantastic work. You’re climbing the leaderboard!",
          "Thanks for contributing — your effort matters.",
          "Nice progress — every word brings us closer.",
          "Well done! Ready for the next one?"
      ];
      return msgs[Math.floor(Math.random() * msgs.length)];
  };

  const handleSave = async () => {
      if (!currentTask) return;
      
      const translation: Translation = {
          id: crypto.randomUUID(),
          sentenceId: currentTask.id,
          text: text,
          languageCode: targetLanguage.code,
          translatorId: user.id,
          timestamp: Date.now(),
          votes: 0,
          voteHistory: {},
          status: 'pending'
      };

      setIsLoading(true);
      try {
        await StorageService.submitTranslation(translation, user);
        toast.success(getMotivation());
        setSessionCount(prev => prev + 1);
        await loadNextTask();
      } catch(e) {
        toast.error("Failed to save. Check your connection.");
        setIsLoading(false);
      }
  };
  
  const handleSkip = async () => {
      if (!currentTask) return;
      toast.info("Skipping task...");
      await StorageService.unlockSentence(currentTask.id.toString());
      await loadNextTask();
  };

  const handleAi = async () => {
      if (currentTask) {
          toast.info("Asking AI for help...");
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
          
          {totalDbCount > 0 ? (
             <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 my-6 text-left">
                 <p className="text-sm text-amber-800 font-medium mb-1">Data exists ({totalDbCount} sentences), but the queue is empty.</p>
                 <p className="text-xs text-amber-600">This happens when sentences are missing Priority Scores. An Admin needs to re-import the data to fix this.</p>
             </div>
          ) : (
             <p className="text-slate-500 mb-6">You've translated everything available in the queue for now.</p>
          )}

          <Button onClick={() => window.location.reload()}>Refresh Queue</Button>
      </div>
  );

  const progressPercentage = Math.min((sessionCount / SESSION_GOAL) * 100, 100);

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-28">
       {/* ... (Same UI as before) ... */}
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
              <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-brand-400 to-brand-500 transition-all duration-500 ease-out"
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

       <Card className="!p-0 !rounded-3xl !overflow-hidden !border-2 !border-slate-100 focus-within:!border-brand-300 transition-colors">
            <div className="p-6 sm:p-8">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Your Translation</label>
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
                  Submit Translation
               </Button>
            </div>
       </Card>

       {selectedWord && <WordDefinitionModal isOpen={!!selectedWord} onClose={() => setSelectedWord(null)} selectedWord={selectedWord.t} normalizedWord={selectedWord.n} existingTranslations={getExistingTranslations(selectedWord.n)} targetLanguage={targetLanguage} onSave={(t, n) => { onSaveWordTranslation(selectedWord.t, selectedWord.n, t, n, currentTask.id); setSelectedWord(null); }} />}
    </div>
  );
};