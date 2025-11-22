import React, { useState } from 'react';
import { Sentence, Translation, User, Language } from '../types';
import { Button, Card, Badge } from './UI';
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
  const sentence = current ? sentences.find(s => s.id === current.sentenceId) : null;
  
  const canApprove = StorageService.hasPermission(user, 'translation.approve');

  const handleAction = async (id: string, status: 'approved' | 'rejected', feedback?: string) => {
      setIsProcessing(true);
      try {
          await onReviewAction(id, status, feedback);
      } catch (e: any) {
          console.error("Review Action Error:", e);
          // Detect specific Firebase Quota error
          if (e.code === 'resource-exhausted' || (e.message && e.message.includes('quota'))) {
              alert("❌ QUOTA EXCEEDED: The database daily write limit has been reached.\n\nBecause you uploaded a large dataset on the Free Plan, you have used all 20,000 daily writes.\n\nPlease upgrade to the Firebase Blaze plan (Pay-as-you-go) or wait 24 hours for the quota to reset.");
          } else {
              alert(`Action failed: ${e.message || "Unknown error. Check console."}`);
          }
      } finally {
          setIsProcessing(false);
      }
  };

  const handleAI = async () => {
      if(!sentence || !current) return;
      setIsProcessing(true);
      try {
          const res = await validateTranslation(sentence.english, current.text, targetLanguage); 
          await onUpdateTranslation({...current, aiQualityScore: res.score}); 
      } catch(e: any) {
          if (e.code === 'resource-exhausted') {
             alert("Cannot save AI score: Database quota exceeded.");
          } else {
             alert("AI Check failed.");
          }
      } finally {
          setIsProcessing(false);
      }
  };
  
  if (!current) return <div className="text-center py-10 text-gray-500">All caught up! No pending translations found.</div>;
  
  return (
    <div className="max-w-3xl mx-auto">
       <Card>
          <h3 className="font-bold mb-2 text-gray-700">English Original</h3>
          <p className="bg-gray-50 p-4 rounded mb-6 text-lg font-medium">{sentence?.english || "Loading sentence..."}</p>
          
          <h3 className="font-bold mb-2 text-gray-700">Proposed Translation</h3>
          <p className="bg-blue-50 p-4 rounded mb-4 text-xl text-blue-900">{current.text}</p>
          
          <div className="flex items-center justify-between mb-4">
              <div className="text-xs text-gray-500">
                  Submitted by <span className="font-medium">{current.translatorId}</span> on {new Date(current.timestamp).toLocaleDateString()}
              </div>
              {current.aiQualityScore && <Badge color={current.aiQualityScore > 7 ? 'green' : 'red'}>AI Score: {current.aiQualityScore}/10</Badge>}
          </div>

          <div className="flex space-x-3 mt-6 pt-4 border-t border-gray-100">
             <Button variant="danger" onClick={() => handleAction(current.id, 'rejected', 'Needs work')} disabled={isProcessing || !canApprove} isLoading={isProcessing}>
                 Reject
             </Button>
             <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleAction(current.id, 'approved')} disabled={isProcessing || !canApprove} isLoading={isProcessing}>
                 Approve
             </Button>
             <Button variant="secondary" onClick={handleAI} disabled={isProcessing} isLoading={isProcessing}>
                 Check AI
             </Button>
          </div>
          {!canApprove && <p className="text-xs text-red-500 mt-2">You do not have permission to approve/reject.</p>}
       </Card>
    </div>
  );
};