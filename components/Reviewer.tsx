
import React, { useState, useEffect } from 'react';
import { Sentence, Translation, User, Language, SpellingSuggestion } from '../types';
import { Button, Card, Badge, toast, Skeleton, EmptyState } from './UI';
import { validateTranslation } from '../services/geminiService';
import { StorageService } from '../services/storageService';

interface ReviewerProps {
  sentences: Sentence[];
  translations: Translation[];
  user: User;
  targetLanguage: Language;
  onReviewAction: (id: string, status: 'approved' | 'rejected', feedback?: string) => Promise<void>;
  onUpdateTranslation: (t: Translation) => Promise<void>;
}

export const Reviewer: React.FC<ReviewerProps> = ({ sentences, translations, user, targetLanguage, onReviewAction, onUpdateTranslation }) => {
  const [tab, setTab] = useState<'translations' | 'spelling'>('translations');
  const [spellingSuggestions, setSpellingSuggestions] = useState<SpellingSuggestion[]>([]);
  
  // Translation Review State
  const pending = translations.filter(t => t.languageCode === targetLanguage.code && t.status === 'pending');
  const [idx] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const current = pending[idx];
  const sentence = current ? sentences.find(s => s.id === current.sentenceId) : null;
  
  const canApprove = StorageService.hasPermission(user, 'translation.approve');

  // Load suggestions when tab changes
  useEffect(() => {
      if (tab === 'spelling') {
          loadSuggestions();
      }
  }, [tab]);

  const loadSuggestions = async () => {
      try {
          const list = await StorageService.getOpenSpellingSuggestions();
          setSpellingSuggestions(list);
      } catch (error) {
          console.error(error);
          toast.error("Failed to load suggestions.");
      }
  };

  const handleAction = async (id: string, status: 'approved' | 'rejected', feedback?: string) => {
      setIsProcessing(true);
      try {
          await onReviewAction(id, status, feedback);
          toast.success(status === 'approved' ? "Translation approved! 🎉" : "Translation rejected.");
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
          await onUpdateTranslation({...current, aiQualityScore: res.score}); 
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
          // Ideally refresh translations here too, but App sync might catch it eventually.
      } catch (error) {
          console.error(error);
          toast.error("Failed to resolve suggestion.");
      } finally {
          setIsProcessing(false);
      }
  };
  
  return (
    <div className="max-w-3xl mx-auto pb-20 space-y-6">
       {/* Tabs */}
       <div className="flex justify-center p-1 bg-slate-100 rounded-xl w-fit mx-auto">
           <button onClick={() => setTab('translations')} className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'translations' ? 'bg-white shadow text-brand-600' : 'text-slate-500'}`}>
               Pending Translations ({pending.length})
           </button>
           <button onClick={() => setTab('spelling')} className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${tab === 'spelling' ? 'bg-white shadow text-brand-600' : 'text-slate-500'}`}>
               Spelling Fixes
           </button>
       </div>

       {/* TAB: TRANSLATIONS */}
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
                            <div className="text-slate-400 text-xs font-extrabold uppercase tracking-widest mb-3">English Source</div>
                            <div className="text-2xl font-medium text-slate-800 leading-relaxed">
                                {sentence ? sentence.english : <span className="italic text-slate-400">Loading source text for ID #{current.sentenceId}...</span>}
                            </div>
                        </div>

                        <div className="p-8 bg-white">
                            <div className="flex justify-between items-start mb-3">
                                <div className="text-brand-500 text-xs font-extrabold uppercase tracking-widest">Translation ({targetLanguage.name})</div>
                                {current.aiQualityScore && (
                                    <Badge color={current.aiQualityScore > 7 ? 'green' : 'red'}>AI: {current.aiQualityScore}/10</Badge>
                                )}
                            </div>
                            <div className="text-3xl font-bold text-slate-900 leading-tight mb-8">
                                {current.text}
                            </div>

                            <div className="flex items-center gap-3 text-sm text-slate-500 bg-slate-50 p-3 rounded-xl">
                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs">
                                    {current.translatorId.substring(0,2)}
                                </div>
                                <div>
                                    <span className="block text-slate-900 font-bold">Translator {current.translatorId.substring(0,6)}</span>
                                    <span className="text-xs">{new Date(current.timestamp).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50/50 border-t border-slate-100 grid grid-cols-3 gap-3">
                            <Button variant="danger" size="lg" onClick={() => handleAction(current.id, 'rejected', 'Needs work')} disabled={isProcessing || !canApprove} className="w-full">
                                Reject
                            </Button>
                            <Button variant="secondary" size="lg" onClick={handleAI} disabled={isProcessing || !sentence} className="w-full !px-0">
                                AI Check
                            </Button>
                            <Button variant="primary" size="lg" onClick={() => handleAction(current.id, 'approved')} disabled={isProcessing || !canApprove} className="w-full bg-emerald-500 hover:bg-emerald-600 border-none shadow-emerald-200">
                                Approve
                            </Button>
                        </div>
                        {!canApprove && <div className="bg-rose-50 text-rose-600 text-center p-2 text-xs font-bold">View Only Mode</div>}
                    </Card>
                 )
             )}
           </>
       )}

       {/* TAB: SPELLING SUGGESTIONS */}
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
    </div>
  );
};
