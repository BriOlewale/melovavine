import React, { useState, useEffect } from 'react';
import { Sentence, Translation, User, Language, Word, WordTranslation } from '../types';
import { Button, Card, Badge } from './UI';
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
  
  // Local state to track comment input per translation ID
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  const sentence = sentences[index];
  const sentenceTranslations = translations.filter(t => t.sentenceId === sentence?.id && t.languageCode === targetLanguage.code);
  const myTranslation = sentenceTranslations.find(t => t.translatorId === user.id);
  const communityTranslations = sentenceTranslations.filter(t => t.translatorId !== user.id).sort((a, b) => b.votes - a.votes);

  const duplicate = communityTranslations.find(t => t.text.trim().toLowerCase() === text.trim().toLowerCase());

  useEffect(() => { setText(myTranslation?.text || ''); }, [myTranslation, sentence]);

  const handleSave = () => {
      if (!sentence) return;
      if (duplicate) {
          if(!confirm("This exact translation already exists below. Are you sure you want to add a duplicate?")) return;
      }
      onSaveTranslation({
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
      if (index < sentences.length - 1) setIndex(index + 1);
  };
  
  const handleAi = async () => {
      if (sentence) setText(await getTranslationSuggestion(sentence.english, targetLanguage));
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
      }
  };

  if (!sentence) return <div className="text-center py-20 text-slate-400">Loading data...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-24">
       
       {/* Navigation Header */}
       <div className="flex justify-between items-center sticky top-16 lg:top-20 z-30 bg-slate-50/95 backdrop-blur py-3 -mx-4 px-4 sm:static sm:bg-transparent sm:p-0 sm:mx-0 border-b border-slate-200 sm:border-0">
          <div className="flex gap-2 items-center">
              <button onClick={handlePrev} disabled={index === 0} className="p-2 rounded-full hover:bg-white hover:shadow-sm disabled:opacity-30 transition-all">
                  <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <span className="text-slate-500 font-semibold text-sm bg-white px-3 py-1 rounded-full shadow-sm border border-slate-200">{index + 1} / {sentences.length}</span>
              <button onClick={handleNext} disabled={index === sentences.length - 1} className="p-2 rounded-full hover:bg-white hover:shadow-sm disabled:opacity-30 transition-all">
                  <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsNavOpen(true)}>Browse All</Button>
       </div>

       {/* ENGLISH SOURCE CARD */}
       <Card className="!p-8 !rounded-3xl border-l-8 border-l-teal-500 shadow-xl shadow-teal-900/5 relative overflow-visible">
          <div className="text-teal-600 text-xs font-extrabold uppercase tracking-widest mb-4">Translate to {targetLanguage.name}</div>
          <div className="text-2xl sm:text-4xl font-bold leading-tight text-slate-800">
             {sentence.english.split(' ').map((w, i) => (
                <span key={i} onClick={() => setSelectedWord({t: w, n: w.toLowerCase().replace(/[^a-z]/g, '')})} className="cursor-pointer hover:text-teal-500 hover:bg-teal-50 rounded-lg px-1 transition-all active:scale-95 inline-block">
                   {w}{' '}
                </span>
             ))}
          </div>
          {communityTranslations.length > 0 && (
             <div className="absolute -top-3 right-6 bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm border border-amber-200 flex items-center gap-1 animate-bounce">
                 <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                 {communityTranslations.length} existing translation{communityTranslations.length !== 1 && 's'}
             </div>
          )}
       </Card>

       {/* INPUT CARD */}
       <div className="relative group">
         <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-400 to-teal-500 rounded-3xl opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
         <div className="relative bg-white rounded-2xl p-6 border border-slate-100">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Your Translation</label>
            <textarea 
              className="w-full border-0 focus:ring-0 p-0 resize-none text-xl sm:text-2xl text-slate-700 placeholder-slate-300 min-h-[120px] bg-transparent" 
              rows={3} 
              placeholder="Type here..." 
              value={text} 
              onChange={e => setText(e.target.value)} 
            />
            
            {duplicate && (
                <div className="mb-4 p-3 bg-orange-50 border border-orange-100 text-orange-700 text-sm rounded-lg flex items-start gap-2">
                    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <div>
                        <span className="font-bold">Similar translation found below.</span>
                        <br />Consider voting for the existing one instead of adding a duplicate.
                    </div>
                </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-t border-slate-100 pt-4 mt-2">
               <Button variant="ghost" onClick={handleAi} className="!text-purple-600 hover:!bg-purple-50 w-full sm:w-auto flex gap-2">
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                   AI Suggest
               </Button>
               <div className="flex gap-3 items-center w-full sm:w-auto">
                 {myTranslation && <span className="text-xs font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">{myTranslation.status}</span>}
                 <Button onClick={handleSave} fullWidth size="lg" className="shadow-lg shadow-teal-500/30">
                    {myTranslation ? 'Update Translation' : 'Submit Translation'}
                 </Button>
               </div>
            </div>
         </div>
       </div>

       {/* COMMUNITY TRANSLATIONS */}
       <div className="space-y-4 pt-6">
         {communityTranslations.length > 0 && (
             <div className="flex items-center gap-4 mb-4">
                 <div className="h-px bg-slate-200 flex-1"></div>
                 <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Community</span>
                 <div className="h-px bg-slate-200 flex-1"></div>
             </div>
         )}
         {communityTranslations.map(t => {
            const voteStatus = t.voteHistory?.[user.id];
            const isDuplicateOfCurrent = t.text.trim().toLowerCase() === text.trim().toLowerCase();
            return (
              <Card key={t.id} className={`!bg-slate-50/50 !border-slate-200 ${isDuplicateOfCurrent ? 'ring-2 ring-orange-300 bg-orange-50' : ''}`}>
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
                          {t.status === 'approved' && <Badge color="green">Approved</Badge>}
                       </div>
                       
                       {/* Render Comments if any */}
                       {t.comments && t.comments.length > 0 && (
                           <div className="mt-3 space-y-2 bg-white/50 p-2 rounded-lg border border-slate-100">
                               {t.comments.map(c => (
                                   <div key={c.id} className="text-sm text-slate-700">
                                       <span className="font-bold text-xs text-slate-900 mr-1">{c.userName}:</span>
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
                 <div className="mt-4 pt-3 border-t border-slate-200/60">
                     <div className="flex gap-2">
                         <input 
                            type="text" 
                            placeholder="Add a comment..." 
                            className="flex-1 text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
                            value={commentInputs[t.id] || ''}
                            onChange={(e) => handleCommentChange(t.id, e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') submitComment(t.id); }} 
                         />
                         <Button size="sm" variant="secondary" onClick={() => submitComment(t.id)} disabled={!commentInputs[t.id]?.trim()}>Post</Button>
                         <Button size="sm" variant="ghost" onClick={() => setHistoryModalTranslation(t)}>History</Button>
                     </div>
                 </div>
              </Card>
            );
         })}
       </div>

       {/* STICKY FOOTER (Mobile) */}
       <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-lg border-t border-slate-200 flex justify-between gap-4 sm:hidden z-50">
            <Button variant="secondary" fullWidth onClick={handlePrev} disabled={index === 0}>Prev</Button>
            <Button variant="primary" fullWidth onClick={handleNext} disabled={index === sentences.length - 1}>Next</Button>
       </div>

       {selectedWord && <WordDefinitionModal isOpen={!!selectedWord} onClose={() => setSelectedWord(null)} selectedWord={selectedWord.t} normalizedWord={selectedWord.n} existingTranslations={getExistingTranslations(selectedWord.n)} targetLanguage={targetLanguage} onSave={(t, n) => { onSaveWordTranslation(selectedWord.t, selectedWord.n, t, n, sentence.id); setSelectedWord(null); }} />}
       <SentenceNavigator isOpen={isNavOpen} onClose={() => setIsNavOpen(false)} sentences={sentences} translations={translations} targetLanguage={targetLanguage} onSelectSentence={setIndex} />
       <TranslationHistoryModal isOpen={!!historyModalTranslation} onClose={() => setHistoryModalTranslation(null)} translation={historyModalTranslation} />
    </div>
  );
};