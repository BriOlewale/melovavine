import React, { useState } from 'react';
import { Sentence, Translation, User, Language } from '../types';
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
  const pending = translations.filter(t => t.languageCode === targetLanguage.code && t.status === 'pending');
  const [idx] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const current = pending[idx];
  // Safely find sentence, or fallback if missing from local cache (due to 50k limit)
  const sentence = current ? sentences.find(s => s.id === current.sentenceId) : null;
  
  const canApprove = StorageService.hasPermission(user, 'translation.approve');

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
      // If sentence text is missing, we can't really use AI validation effectively
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
  
  if (!pending.length) return (
    <div className="max-w-lg mx-auto py-10">
        <EmptyState 
            icon={<span className="text-6xl">🎉</span>}
            title="All caught up!"
            description="There are no translations pending review at the moment. Great job!"
            action={<Button variant="secondary" onClick={() => window.location.reload()}>Check for new items</Button>}
        />
    </div>
  );
  
  if (!current) return <div className="max-w-3xl mx-auto"><Skeleton className="h-96 w-full rounded-3xl" /></div>;

  return (
    <div className="max-w-2xl mx-auto pb-20">
       {/* PROGRESS INDICATOR */}
       <div className="text-center mb-6">
           <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
              {pending.length} Pending Reviews
           </span>
       </div>

       <Card className="!p-0 !rounded-[32px] overflow-hidden shadow-2xl shadow-slate-200/60 border-0">
          
          {/* ENGLISH HEADER */}
          <div className="bg-slate-50 p-8 border-b border-slate-100">
              <div className="text-slate-400 text-xs font-extrabold uppercase tracking-widest mb-3">English Source</div>
              <div className="text-2xl font-medium text-slate-800 leading-relaxed">
                  {sentence ? sentence.english : <span className="italic text-slate-400">Loading source text for ID #{current.sentenceId}... (Data not in cache)</span>}
              </div>
          </div>

          {/* TRANSLATION BODY */}
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

          {/* ACTION BAR */}
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
    </div>
  );
};