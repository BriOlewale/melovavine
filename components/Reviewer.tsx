import React, { useState, useEffect } from 'react';
import { Sentence, Translation, User, Language, SpellingSuggestion, TranslationReview } from '../types';
import { Button, Card, Badge, toast, Skeleton, EmptyState, Modal, Input } from './UI';
import { validateTranslation } from '../services/geminiService';
import { StorageService } from '../services/storageService';
import { TranslationHistoryModal } from './TranslationHistoryModal';
import MinorFixModal from './MinorFixModal';

interface ReviewerProps {
  sentences: Sentence[];
  translations: Translation[];
  user: User;
  targetLanguage: Language;
  onReviewAction: (id: string, status: 'approved' | 'rejected' | 'needs_attention', feedback?: string) => Promise<void>;
  onUpdateTranslation: (t: Translation) => Promise<void>;
}

export const Reviewer: React.FC<ReviewerProps> = ({ sentences, translations, user, targetLanguage, onReviewAction, onUpdateTranslation }) => {
  const [tab, setTab] = useState<'translations' | 'spelling'>('translations');
  const [spellingSuggestions, setSpellingSuggestions] = useState<SpellingSuggestion[]>([]);
  
  const pending = translations.filter(t => t.languageCode === targetLanguage.code && (t.status === 'pending' || t.status === 'needs_attention'));
  const [idx] = useState(0); 
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState('');
  
  const [isMinorFixOpen, setIsMinorFixOpen] = useState(false);

  const [history, setHistory] = useState<TranslationReview[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  const [viewHistory, setViewHistory] = useState<Translation | null>(null);

  const current = pending[idx];
  const sentence = current ? sentences.find(s => s.id === current.sentenceId) : null;
  
  const canApprove = StorageService.hasPermission(user, 'translation.approve');

  useEffect(() => {
      if (tab === 'spelling') {
          loadSuggestions();
      }
  }, [tab]);

  useEffect(() => {
      setFeedback('');
  }, [current]);

  const loadSuggestions = async () => {
      try {
          const list = await StorageService.getOpenSpellingSuggestions();
          setSpellingSuggestions(list);
      } catch (error) {
          console.error(error);
          toast.error("Failed to load suggestions.");
      }
  };

  const loadHistory = async () => {
      if (!current) return;
      setIsProcessing(true);
      try {
          const reviews = await StorageService.getTranslationReviews(current.id);
          setHistory(reviews);
          setIsHistoryOpen(true);
      } catch (e) {
          toast.error("Failed to load history.");
      } finally {
          setIsProcessing(false);
      }
  };

  const handleAction = async (status: 'approved' | 'rejected' | 'needs_attention') => {
      if (!current) return;

      if ((status === 'rejected' || status === 'needs_attention') && !feedback.trim()) {
          toast.error("Please provide feedback for rejection or attention requests.");
          return;
      }

      setIsProcessing(true);
      try {
          const review: TranslationReview = {
              id: crypto.randomUUID(),
              translationId: current.id,
              reviewerId: user.id,
              reviewerName: user.name,
              action: status === 'approved' ? 'approved' : 'rejected', 
              comment: feedback || undefined,
              createdAt: Date.now()
          };

          await StorageService.addTranslationReview(review);
          await onReviewAction(current.id, status, feedback);

          toast.success(status === 'approved' ? "Translation approved! 🎉" : "Feedback submitted.");
          setFeedback(''); 
      } catch (e: any) {
          console.error("Review Error", e);
          if (e.code === 'resource-exhausted') {
              toast.error("Quota Exceeded. Try again tomorrow.");
          } else {
              toast.error("Action failed.");
          }
      } finally {
          setIsProcessing(false);
      }
  };

  const handleMinorFixSubmit = async (editedText: string, fixComment?: string) => {
      if (!current) return;

      setIsProcessing(true);
      try {
          await StorageService.applyMinorFix(current.id, editedText, user);
          
          const review: TranslationReview = {
             id: crypto.randomUUID(),
             translationId: current.id,
             reviewerId: user.id,
             reviewerName: user.name,
             action: 'edited',
             previousText: current.text,
             newText: editedText,
             comment: fixComment || "Minor fix applied",
             createdAt: Date.now()
          };
          await StorageService.addTranslationReview(review);

          toast.success("Minor fix applied and approved!");
          setIsMinorFixOpen(false);
      } catch (e) {
          console.error(e);
          toast.error("Failed to apply fix.");
      } finally {
          setIsProcessing(false);
      }
  };

  const handleAI = async () => {
      if(!current) return;
      const sourceText = sentence?.english || ""; 
      if (!sourceText) {
          toast.error("Cannot run AI check: Source sentence text not loaded.");
          return;
      }

      setIsProcessing(true);
      toast.info("Analyzing with Gemini...");
      try {
          const res = await validateTranslation(sourceText, current.text, targetLanguage); 
          await onUpdateTranslation({...current, aiQualityScore: res.score, aiQualityFeedback: res.feedback}); 
          toast.success(`AI Score: ${res.score}/10`);
      } catch(e) {
          toast.error("AI Check failed.");
      } finally {
          setIsProcessing(false);
      }
  };

  const handleSpellingAction = async (suggestion: SpellingSuggestion, status: 'accepted' | 'rejected') => {
      if (!window.confirm(`Are you sure you want to ${status} this correction?`)) return;
      
      setIsProcessing(true);
      try {
          await StorageService.resolveSpellingSuggestion(suggestion.id, status, user);
          toast.success(`Correction ${status}!`);
          setSpellingSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
      } catch (error) {
          console.error(error);
          toast.error("Failed to resolve suggestion.");
      } finally {
          setIsProcessing(false);
      }
  };
  
  return (
    <div className="max-w-3xl mx-auto pb-20 space-y-6">
       <div className="flex justify-center p-1 bg-slate-100 rounded-xl w-fit mx-auto">
           <button onClick={() => setTab('translations')} className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'translations' ? 'bg-white shadow text-brand-600' : 'text-slate-500'}`}>
               Pending Translations ({pending.length})
           </button>
           <button onClick={() => setTab('spelling')} className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'spelling' ? 'bg-white shadow text-brand-600' : 'text-slate-500'}`}>
               Spelling Fixes
           </button>
       </div>

       {tab === 'translations' && (
           <>
             {pending.length === 0 ? (
                <div className="max-w-lg mx-auto py-10">
                    <EmptyState 
                        icon={<span className="text-6xl">🎉</span>}
                        title="All caught up!"
                        description="There are no translations pending review at the moment. Great job!"
                        action={<Button variant="secondary" onClick={() => window.location.reload()}>Check for new items</Button>}
                    />
                </div>
             ) : (
                 !current ? <Skeleton className="h-96 w-full rounded-3xl" /> : (
                    <Card className="!p-0 !rounded-[32px] overflow-hidden shadow-2xl shadow-slate-200/60 border-0">
                        <div className="bg-slate-50 p-8 border-b border-slate-100">
                            <div className="flex justify-between mb-3">
                                <div className="text-slate-400 text-xs font-extrabold uppercase tracking-widest">English Source</div>
                                <button onClick={loadHistory} className="text-xs font-bold text-brand-600 hover:underline">View History</button>
                            </div>
                            <div className="text-2xl font-medium text-slate-800 leading-relaxed">
                                {sentence ? sentence.english : <span className="italic text-slate-400">Loading source text for ID #{current.sentenceId}... (Data not in cache)</span>}
                            </div>
                        </div>

                        <div className="p-8 bg-white">
                            <div className="flex justify-between items-start mb-3">
                                <div className="text-brand-500 text-xs font-extrabold uppercase tracking-widest">Translation ({targetLanguage.name})</div>
                                <div className="flex gap-2">
                                    {current.status === 'needs_attention' && <Badge color="yellow">Needs Attention</Badge>}
                                    {current.aiQualityScore && (
                                        <Badge color={current.aiQualityScore > 7 ? 'green' : 'red'}>AI: {current.aiQualityScore}/10</Badge>
                                    )}
                                </div>
                            </div>
                            <div className="text-3xl font-bold text-slate-900 leading-tight mb-8">
                                {current.text}
                            </div>

                            <div className="flex items-center gap-3 text-sm text-slate-500 bg-slate-50 p-3 rounded-xl mb-6">
                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs">
                                    {current.translatorId.substring(0,2)}
                                </div>
                                <div>
                                    <span className="block text-slate-900 font-bold">Translator {current.translatorId.substring(0,6)}</span>
                                    <span className="text-xs">{new Date(current.timestamp).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Reviewer Feedback (Required for Rejection)</label>
                                <textarea 
                                    className="w-full border-2 border-slate-100 rounded-xl p-3 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                                    rows={2}
                                    placeholder="Add comments or corrections here..."
                                    value={feedback}
                                    onChange={e => setFeedback(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                <Button variant="secondary" onClick={handleAI} disabled={isProcessing || !sentence} className="sm:col-span-1">
                                    AI Check
                                </Button>
                                <Button variant="secondary" onClick={() => handleAction('needs_attention')} disabled={isProcessing || !canApprove} className="sm:col-span-1 text-amber-600 border-amber-200 hover:bg-amber-50">
                                    Flag
                                </Button>
                                <Button variant="secondary" onClick={() => setIsMinorFixOpen(true)} disabled={isProcessing || !canApprove} className="sm:col-span-1 text-blue-600 border-blue-200 hover:bg-blue-50">
                                    Minor Fix
                                </Button>
                                <Button variant="danger" onClick={() => handleAction('rejected')} disabled={isProcessing || !canApprove} className="sm:col-span-1">
                                    Reject
                                </Button>
                                <Button variant="primary" onClick={() => handleAction('approved')} disabled={isProcessing || !canApprove} className="sm:col-span-1 bg-emerald-500 hover:bg-emerald-600 border-none shadow-emerald-200">
                                    Approve
                                </Button>
                            </div>
                            {!canApprove && <div className="mt-4 text-center text-xs text-rose-500 font-bold">View Only Mode (No Permissions)</div>}
                        </div>
                    </Card>
                 )
             )}
           </>
       )}

       {tab === 'spelling' && (
           <div className="space-y-4">
               {spellingSuggestions.length === 0 && <EmptyState icon="✨" title="No suggestions" description="There are no spelling corrections to review right now." />}
               
               {spellingSuggestions.map(sugg => (
                   <Card key={sugg.id} className="border-l-4 border-l-purple-500">
                       <div className="flex justify-between items-start mb-4">
                           <div>
                               <Badge color="purple">Spelling Correction</Badge>
                               <div className="text-xs text-slate-500 mt-2">Suggested by <strong>{sugg.createdByUserName}</strong></div>
                           </div>
                           <div className="text-xs text-slate-400">{new Date(sugg.createdAt).toLocaleDateString()}</div>
                       </div>
                       
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                           <div className="bg-rose-50 p-3 rounded-xl border border-rose-100">
                               <div className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-1">Original</div>
                               <div className="text-rose-900 font-medium line-through decoration-rose-400 decoration-2">{sugg.originalText}</div>
                           </div>
                           <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                               <div className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-1">Suggested</div>
                               <div className="text-emerald-900 font-bold">{sugg.suggestedText}</div>
                           </div>
                       </div>
                       
                       {sugg.reason && (
                           <div className="text-sm text-slate-600 mb-6 bg-slate-50 p-3 rounded-lg">
                               <strong>Reason:</strong> {sugg.reason}
                           </div>
                       )}
                       
                       <div className="flex gap-3 justify-end">
                           <Button size="sm" variant="danger" onClick={() => handleSpellingAction(sugg, 'rejected')} disabled={isProcessing || !canApprove}>Reject</Button>
                           <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={() => handleSpellingAction(sugg, 'accepted')} disabled={isProcessing || !canApprove}>Accept Correction</Button>
                       </div>
                   </Card>
               ))}
           </div>
       )}

       <TranslationHistoryModal 
          isOpen={!!viewHistory} 
          onClose={() => setViewHistory(null)} 
          translation={viewHistory} 
       />

       {current && (
           <MinorFixModal 
              isOpen={isMinorFixOpen}
              initialText={current.text}
              onClose={() => setIsMinorFixOpen(false)}
              onSave={handleMinorFixSubmit}
           />
       )}

       <Modal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} title="Translation History">
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {history.length === 0 ? (
                    <p className="text-center text-slate-400 italic py-4">No history available.</p>
                ) : (
                    history.map(h => (
                        <div key={h.id} className="border-l-2 border-slate-200 pl-4 pb-4 relative">
                            <div className="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                            <div className="text-xs text-slate-400 mb-1">{new Date(h.createdAt).toLocaleString()}</div>
                            <div className="font-bold text-sm text-slate-800 flex items-center gap-2">
                                {h.reviewerName}
                                <Badge color={h.action === 'approved' ? 'green' : h.action === 'rejected' ? 'red' : 'blue'}>{h.action}</Badge>
                            </div>
                            {h.comment && (
                                <div className="mt-2 text-sm bg-slate-50 p-2 rounded text-slate-600 italic">"{h.comment}"</div>
                            )}
                            {h.action === 'edited' && (
                                <div className="mt-2 text-xs grid grid-cols-1 gap-1">
                                    <div className="text-rose-500 line-through opacity-70">{h.previousText}</div>
                                    <div className="text-emerald-600 font-bold">{h.newText}</div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
            <div className="mt-6">
                <Button variant="secondary" fullWidth onClick={() => setIsHistoryOpen(false)}>Close</Button>
            </div>
       </Modal>
    </div>
  );
};