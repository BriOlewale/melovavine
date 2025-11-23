import React, { useState, useEffect } from 'react';
import { Sentence, Translation, User, Language, Word, WordTranslation } from '../types';
import { Button, Card, Badge, toast, Skeleton } from './UI'; // Imported toast and Skeleton
import { getTranslationSuggestion } from '../services/geminiService';
import { WordDefinitionModal } from './WordDefinitionModal';
import { SentenceNavigator } from './SentenceNavigator';
import { TranslationHistoryModal } from './TranslationHistoryModal';

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

export const Translator: React.FC<TranslatorProps> = ({ sentences, translations, user, users = [], targetLanguage, onSaveTranslation, words, wordTranslations, onSaveWordTranslation, onAddComment, onVote }) => {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState('');
  const [selectedWord, setSelectedWord] = useState<{t: string, n: string} | null>(null);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [historyModalTranslation, setHistoryModalTranslation] = useState<Translation | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  const sentence = sentences[index];
  const sentenceTranslations = translations.filter(t => t.sentenceId === sentence?.id && t.languageCode === targetLanguage.code);
  const myTranslation = sentenceTranslations.find(t => t.translatorId === user.id);
  const communityTranslations = sentenceTranslations.filter(t => t.translatorId !== user.id).sort((a, b) => b.votes - a.votes);
  const duplicate = communityTranslations.find(t => t.text.trim().toLowerCase() === text.trim().toLowerCase());

  useEffect(() => { setText(myTranslation?.text || ''); }, [myTranslation, sentence]);

  const handleSave = async () => {
      if (!sentence) return;
      if (duplicate) {
          if(!confirm("This exact translation already exists below. Are you sure you want to add a duplicate?")) return;
      }
      setIsSaving(true);
      try {
        await onSaveTranslation({
            id: myTranslation?.id || crypto.randomUUID(),
            sentenceId: sentence.id,
            text,
            languageCode: targetLanguage.code,
            translatorId: user.id,
            timestamp: Date.now(),
            votes: myTranslation?.votes || 0,
            voteHistory: myTranslation?.voteHistory || {},
            status: myTranslation?.status || 'pending',
            history: myTranslation?.history || []
        });
        toast.success(myTranslation ? "Updated successfully!" : "Great job! Translation saved.");
        
        if (index < sentences.length - 1) {
             setTimeout(() => setIndex(index + 1), 500); // Slight delay for delight
        }
      } catch(e) {
        toast.error("Failed to save. Check your connection.");
      } finally {
        setIsSaving(false);
      }
  };
  
  const handleAi = async () => {
      if (sentence) {
          toast.info("Asking AI for help...");
          const suggestion = await getTranslationSuggestion(sentence.english, targetLanguage);
          if(suggestion) setText(suggestion);
          else toast.error("AI request failed.");
      }
  };

  const handleNext = () => { if (index < sentences.length - 1) setIndex(index + 1); };
  const handlePrev = () => { if (index > 0) setIndex(index - 1); };
  const getUserName = (id: string) => users.find(u => u.id === id)?.name || 'Unknown';
  const getExistingTranslations = (normalized: string) => {
      const word = words.find(w => w.normalizedText === normalized);
      if (!word) return [];
      return wordTranslations.filter(wt => wt.wordId === word.id && wt.languageCode === targetLanguage.code);
  };

  const handleCommentChange = (id: string, val: string) => {
      setCommentInputs(prev => ({ ...prev, [id]: val }));
  };

  const submitComment = (id: string) => {
      const txt = commentInputs[id];
      if (txt && txt.trim()) {
          onAddComment(id, txt);
          setCommentInputs(prev => ({ ...prev, [id]: '' }));
          toast.success("Comment posted!");
      }
  };

  if (!sentence) return (
      <div className="max-w-3xl mx-auto mt-10 space-y-6">
          <Skeleton className="h-40 w-full rounded-3xl" />
          <Skeleton className="h-60 w-full rounded-3xl" />
      </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-28">
       
       {/* Navigation Header */}
       <div className="flex justify-between items-center sticky top-20 z-30 bg-slate-50/95 backdrop-blur py-3 -mx-4 px-4 sm:static sm:bg-transparent sm:p-0 sm:mx-0 border-b border-slate-200 sm:border-0">
          <div className="flex gap-3 items-center bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100">
              <button onClick={handlePrev} disabled={index === 0} className="p-2 rounded-xl hover:bg-slate-50 disabled:opacity-30 transition-all text-slate-500">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <span className="text-slate-700 font-bold text-sm min-w-[80px] text-center">{index + 1} <span className="text-slate-400 font-normal">/ {sentences.length}</span></span>
              <button onClick={handleNext} disabled={index === sentences.length - 1} className="p-2 rounded-xl hover:bg-slate-50 disabled:opacity-30 transition-all text-slate-500">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
              </button>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setIsNavOpen(true)}>Browse</Button>
       </div>

       {/* ENGLISH SOURCE CARD */}
       <div className="relative group">
           <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-300 to-brand-500 rounded-[28px] opacity-30 blur transition duration-500 group-hover:opacity-50"></div>
           <Card className="relative !p-8 !rounded-3xl !border-0 !shadow-lg bg-white">
              <div className="text-brand-500 text-xs font-extrabold uppercase tracking-widest mb-6 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse"></span>
                  Translate this to {targetLanguage.name}
              </div>
              <div className="text-3xl sm:text-4xl font-bold leading-tight text-slate-800 font-display">
                 {sentence.english.split(' ').map((w, i) => (
                    <span key={i} onClick={() => setSelectedWord({t: w, n: w.toLowerCase().replace(/[^a-z]/g, '')})} className="cursor-pointer hover:text-brand-600 hover:bg-brand-50 rounded-lg px-1 transition-all active:scale-95 inline-block select-none">
                       {w}{' '}
                    </span>
                 ))}
              </div>
              {communityTranslations.length > 0 && (
                 <div className="absolute top-6 right-6 bg-amber-50 text-amber-700 text-xs font-bold px-3 py-1.5 rounded-full border border-amber-100 flex items-center gap-1">
                     <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                     {communityTranslations.length} exist
                 </div>
              )}
           </Card>
       </div>

       {/* INPUT CARD */}
       <Card className="!p-0 !rounded-3xl !overflow-hidden !border-2 !border-slate-100 focus-within:!border-brand-300 transition-colors">
            <div className="p-6 sm:p-8">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Your Translation</label>
                <textarea 
                  className="w-full border-0 focus:ring-0 p-0 resize-none text-xl sm:text-2xl text-slate-700 placeholder-slate-300 min-h-[100px] bg-transparent leading-relaxed" 
                  rows={3} 
                  placeholder="Type here..." 
                  value={text} 
                  onChange={e => setText(e.target.value)} 
                />
                
                {duplicate && (
                    <div className="mt-4 p-3 bg-coral-50 border border-coral-100 text-coral-600 text-sm rounded-xl flex items-start gap-3 animate-fade-in">
                        <span className="text-lg">⚠️</span>
                        <div>
                            <span className="font-bold">Similar translation found below.</span>
                            <br />Consider voting for the existing one instead.
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-slate-50 px-6 sm:px-8 py-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
               <Button variant="ghost" size="sm" onClick={handleAi} className="!text-violet-600 hover:!bg-violet-50 w-full sm:w-auto flex gap-2">
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                   AI Suggest
               </Button>
               <div className="flex gap-3 items-center w-full sm:w-auto">
                 {myTranslation && <Badge color="blue">{myTranslation.status}</Badge>}
                 <Button onClick={handleSave} isLoading={isSaving} fullWidth size="lg" className="shadow-lg shadow-brand-500/20">
                    {myTranslation ? 'Update' : 'Submit Translation'}
                 </Button>
               </div>
            </div>
       </Card>

       {/* COMMUNITY TRANSLATIONS */}
       <div className="space-y-6 pt-8">
         {communityTranslations.length > 0 && (
             <div className="flex items-center gap-4">
                 <div className="h-px bg-slate-200 flex-1"></div>
                 <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Community Contributions</span>
                 <div className="h-px bg-slate-200 flex-1"></div>
             </div>
         )}
         {communityTranslations.map(t => {
            const voteStatus = t.voteHistory?.[user.id];
            return (
              <Card key={t.id} className="!bg-white !border-slate-100 hover:!border-brand-200">
                 <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                       <div className="text-lg font-medium text-slate-800 mb-3 leading-relaxed">{t.text}</div>
                       <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-slate-50 border border-slate-100">
                              <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                                  {getUserName(t.translatorId).substring(0,1).toUpperCase()}
                              </div>
                              <span className="text-xs font-bold text-slate-600">{getUserName(t.translatorId)}</span>
                          </div>
                          <span className="text-xs text-slate-400">{new Date(t.timestamp).toLocaleDateString()}</span>
                          {t.status === 'approved' && <Badge color="green">Approved</Badge>}
                       </div>
                       
                       {/* Comments */}
                       {t.comments && t.comments.length > 0 && (
                           <div className="mt-4 space-y-2 pl-4 border-l-2 border-slate-100">
                               {t.comments.map(c => (
                                   <div key={c.id} className="text-sm text-slate-600">
                                       <span className="font-bold text-xs text-slate-800 mr-1.5">{c.userName}</span>
                                       {c.text}
                                   </div>
                               ))}
                           </div>
                       )}
                    </div>
                    <div className="flex flex-col items-center bg-slate-50 rounded-xl border border-slate-100 p-1 gap-1">
                       <button onClick={() => onVote(t.id, 'up')} className={`p-1.5 rounded-lg transition-colors ${voteStatus === 'up' ? 'text-emerald-600 bg-white shadow-sm' : 'text-slate-400 hover:text-emerald-500'}`}>
                           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
                       </button>
                       <span className={`text-sm font-bold ${t.votes > 0 ? 'text-emerald-600' : 'text-slate-600'}`}>{t.votes}</span>
                       <button onClick={() => onVote(t.id, 'down')} className={`p-1.5 rounded-lg transition-colors ${voteStatus === 'down' ? 'text-rose-600 bg-white shadow-sm' : 'text-slate-400 hover:text-rose-500'}`}>
                           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                       </button>
                    </div>
                 </div>
                 <div className="mt-4 pt-3 border-t border-slate-100">
                     <div className="flex gap-2">
                         <input 
                            type="text" 
                            placeholder="Write a comment..." 
                            className="flex-1 text-sm bg-slate-50 border-transparent rounded-xl px-4 py-2 focus:bg-white focus:border-brand-200 focus:ring-2 focus:ring-brand-500/20 transition-all outline-none"
                            value={commentInputs[t.id] || ''}
                            onChange={(e) => handleCommentChange(t.id, e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') submitComment(t.id); }} 
                         />
                         <Button size="sm" variant="secondary" onClick={() => submitComment(t.id)} disabled={!commentInputs[t.id]?.trim()}>Post</Button>
                     </div>
                 </div>
              </Card>
            );
         })}
       </div>

       {/* STICKY FOOTER (Mobile) */}
       <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-lg border-t border-slate-200 flex justify-between gap-4 sm:hidden z-50">
            <Button variant="secondary" fullWidth onClick={handlePrev} disabled={index === 0}>Prev</Button>
            <Button variant="primary" fullWidth onClick={handleNext} disabled={index === sentences.length - 1}>Next</Button>
       </div>

       {selectedWord && <WordDefinitionModal isOpen={!!selectedWord} onClose={() => setSelectedWord(null)} selectedWord={selectedWord.t} normalizedWord={selectedWord.n} existingTranslations={getExistingTranslations(selectedWord.n)} targetLanguage={targetLanguage} onSave={(t, n) => { onSaveWordTranslation(selectedWord.t, selectedWord.n, t, n, sentence.id); setSelectedWord(null); }} />}
       <SentenceNavigator isOpen={isNavOpen} onClose={() => setIsNavOpen(false)} sentences={sentences} translations={translations} targetLanguage={targetLanguage} onSelectSentence={setIndex} />
       <TranslationHistoryModal isOpen={!!historyModalTranslation} onClose={() => setHistoryModalTranslation(null)} translation={historyModalTranslation} />
    </div>
  );
};