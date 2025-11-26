import React, { useState, useEffect } from 'react';
import { Sentence, Translation, User, Language, SpellingSuggestion, TranslationReview } from '@/types';
import { Button, Card, Badge, toast, Skeleton, EmptyState } from '@/components/UI';
import { validateTranslation } from '@/services/geminiService';
import { StorageService } from '@/services/storageService';
import MinorFixModal from '@/components/MinorFixModal';
import ReviewHistoryDrawer from '@/components/ReviewHistoryDrawer';
import { hasPermission } from '@/services/permissionService';

interface ReviewerProps {
  sentences: Sentence[];
  translations: Translation[];
  user: User;
  targetLanguage: Language;
  onReviewAction: (id: string, status: 'approved' | 'rejected' | 'needs_attention', feedback?: string) => Promise<void>;
  onUpdateTranslation: (t: Translation) => Promise<void>;
}

export const Reviewer: React.FC<ReviewerProps> = ({ sentences, translations, user, targetLanguage, onReviewAction, onUpdateTranslation }) => {
  // ... rest of the component (no logic changes)
  // --- PERMISSION GUARD ---
  if (!hasPermission(user, 'translation.review')) {
      return (
          <div className="flex flex-col items-center justify-center py-20">
              <div className="text-6xl mb-4">🔒</div>
              <h2 className="text-2xl font-bold text-slate-800">Restricted Access</h2>
              <p className="text-slate-500 mt-2">You do not have permission to review translations.</p>
              <div className="mt-4 px-4 py-2 bg-slate-100 rounded-lg text-sm text-slate-600">
                  Required Permission: <code>translation.review</code>
              </div>
          </div>
      );
  }

  const [tab, setTab] = useState<'translations' | 'spelling'>('translations');
  const [spellingSuggestions, setSpellingSuggestions] = useState<SpellingSuggestion[]>([]);
  
  const pending = translations.filter(t => t.languageCode === targetLanguage.code && (t.status === 'pending' || t.status === 'needs_attention'));
  const [idx] = useState(0); 
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState('');
  
  const [isMinorFixOpen, setIsMinorFixOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [history, setHistory] = useState<TranslationReview[]>([]);

  const current = pending[idx];
  const sentence = current ? sentences.find(s => s.id === current.sentenceId) : null;
  const canApprove = hasPermission(user, 'translation.approve'); // Use RBAC helper

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

      // Ensure rejection/flagging has feedback
      if ((status === 'rejected' || status === 'needs_attention') && !feedback.trim()) {
          toast.error("Please provide feedback for rejection or attention requests.");
          return;
      }

      setIsProcessing(true);
      try {
          const baseReview = {
              id: crypto.randomUUID(),
              translationId: current.id,
              reviewerId: user.id,
              reviewerName: user.name,
              action: status, 
              createdAt: Date.now()
          };

          // Firestore Safety: Do not set 'comment' to undefined. Only add if exists.
          const review: TranslationReview = feedback.trim() 
            ? { ...baseReview, comment: feedback.trim() } 
            : baseReview;

          await StorageService.addTranslationReview(review);
          await onReviewAction(current.id, status, feedback);

          toast.success(status === 'approved' ? "Translation approved! 🎉" : "Feedback submitted.");
          setFeedback(''); 
      } catch (e: any) {
          console.error(e);
          toast.error("Action failed.");
      } finally {
          setIsProcessing(false);
      }
  };

  const handleMinorFixSubmit = async (editedText: string, fixComment?: string) => {
      if (!current) return;
      setIsProcessing(true);
      try {
          await StorageService.applyMinorFix(current.id, editedText, user);
          
          const baseReview = {
             id: crypto.randomUUID(),
             translationId: current.id,
             reviewerId: user.id,
             reviewerName: user.name,
             action: 'edited' as const,
             previousText: current.text,
             newText: editedText,
             createdAt: Date.now()
          };

          // Firestore Safety
          const review: TranslationReview = fixComment?.trim()
            ? { ...baseReview, comment: fixComment.trim() }
            : { ...baseReview, comment: "Minor fix applied" };

          await StorageService.addTranslationReview(review);
          toast.success("Minor fix applied!");
          setIsMinorFixOpen(false);
      } catch (e) {
          toast.error("Failed to apply fix.");
      } finally {
          setIsProcessing(false);
      }
  };

  const handleAI = async () => {
      if(!current) return;
      const sourceText = sentence?.english || ""; 
      if (!sourceText) { toast.error("Source text missing."); return; }
      setIsProcessing(true);
      toast.info("Analyzing...");
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
      if (!window.confirm(`Are you sure you want to ${status}?`)) return;
      setIsProcessing(true);
      try {
          await StorageService.resolveSpellingSuggestion(suggestion.id, status, user);
          toast.success(`Correction ${status}!`);
          setSpellingSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
      } catch (error) {
          toast.error("Failed to resolve.");
      } finally {
          setIsProcessing(false);
      }
  };
  
  return (
    <div className="max-w-3xl mx-auto pb-20 space-y-6">
       <div className="flex justify-center p-1 bg-slate-100 rounded-xl w-fit mx-auto">
           <button onClick={() => setTab('translations')} className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'translations' ? 'bg-white shadow text-brand-600' : 'text-slate-500'}`}>
               Pending ({pending.length})
           </button>
           <button onClick={() => setTab('spelling')} className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'spelling' ? 'bg-white shadow text-brand-600' : 'text-slate-500'}`}>
               Spelling
           </button>
       </div>

       {tab === 'translations' && (
           <>
             {pending.length === 0 ? (
                <div className="max-w-lg mx-auto py-10">
                    <EmptyState icon={<span className="text-6xl">🎉</span>} title="All caught up!" description="No translations pending review." />
                </div>
             ) : (
                 !current ? <Skeleton className="h-96 w-full rounded-3xl" /> : (
                    <Card className="!p-0 !rounded-[32px] overflow-hidden shadow-2xl border-0">
                        <div className="bg-slate-50 p-8 border-b border-slate-100">
                            <div className="flex justify-between mb-3">
                                <div className="text-slate-400 text-xs font-extrabold uppercase tracking-widest">Source</div>
                                <button onClick={loadHistory} className="text-xs font-bold text-brand-600">History</button>
                            </div>
                            <div className="text-2xl font-medium text-slate-800">{sentence?.english}</div>
                        </div>

                        <div className="p-8 bg-white">
                            <div className="flex justify-between items-start mb-3">
                                <div className="text-brand-500 text-xs font-extrabold uppercase tracking-widest">Translation</div>
                                <div className="flex gap-2">
                                    {current.status === 'needs_attention' && <Badge color="yellow">Needs Attention</Badge>}
                                    {current.aiQualityScore && <Badge color={current.aiQualityScore > 7 ? 'green' : 'red'}>AI: {current.aiQualityScore}/10</Badge>}
                                </div>
                            </div>
                            <div className="text-3xl font-bold text-slate-900 mb-8">{current.text}</div>

                            <textarea 
                                className="w-full border-2 border-slate-100 rounded-xl p-3 text-sm focus:border-brand-500 outline-none mb-6"
                                rows={2} placeholder="Feedback..." value={feedback} onChange={e => setFeedback(e.target.value)}
                            />

                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                <Button variant="secondary" onClick={handleAI} disabled={isProcessing} className="sm:col-span-1">AI</Button>
                                <Button variant="secondary" onClick={() => handleAction('needs_attention')} disabled={isProcessing || !canApprove} className="sm:col-span-1 text-amber-600">Flag</Button>
                                <Button variant="secondary" onClick={() => setIsMinorFixOpen(true)} disabled={isProcessing || !canApprove} className="sm:col-span-1 text-blue-600">Fix</Button>
                                <Button variant="danger" onClick={() => handleAction('rejected')} disabled={isProcessing || !canApprove} className="sm:col-span-1">Reject</Button>
                                <Button variant="primary" onClick={() => handleAction('approved')} disabled={isProcessing || !canApprove} className="sm:col-span-1 bg-emerald-500">Approve</Button>
                            </div>
                            {!canApprove && <div className="mt-4 text-center text-xs text-rose-500 font-bold">View Only Mode</div>}
                        </div>
                    </Card>
                 )
             )}
           </>
       )}

       {tab === 'spelling' && (
           <div className="space-y-4">
               {spellingSuggestions.map(sugg => (
                   <Card key={sugg.id} className="border-l-4 border-l-purple-500">
                       <div className="flex justify-between items-start mb-4">
                           <Badge color="purple">Correction</Badge>
                           <div className="text-xs text-slate-400">{new Date(sugg.createdAt).toLocaleDateString()}</div>
                       </div>
                       <div className="grid grid-cols-2 gap-4 mb-4">
                           <div className="bg-rose-50 p-3 rounded-xl"><div className="text-xs font-bold text-rose-400">Original</div><div className="line-through">{sugg.originalText}</div></div>
                           <div className="bg-emerald-50 p-3 rounded-xl"><div className="text-xs font-bold text-emerald-500">Suggested</div><div className="font-bold">{sugg.suggestedText}</div></div>
                       </div>
                       <div className="flex gap-3 justify-end">
                           <Button size="sm" variant="danger" onClick={() => handleSpellingAction(sugg, 'rejected')} disabled={isProcessing || !canApprove}>Reject</Button>
                           <Button size="sm" className="bg-purple-600 text-white" onClick={() => handleSpellingAction(sugg, 'accepted')} disabled={isProcessing || !canApprove}>Accept</Button>
                       </div>
                   </Card>
               ))}
           </div>
       )}

       {current && <MinorFixModal isOpen={isMinorFixOpen} initialText={current.text} onClose={() => setIsMinorFixOpen(false)} onSave={handleMinorFixSubmit} />}
       <ReviewHistoryDrawer isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} reviews={history} />
    </div>
  );
};