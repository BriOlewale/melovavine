import React, { useState } from 'react';
import { Sentence, Translation, User, Language } from '../types';
import { Button, Card, Badge } from './UI';
import { validateTranslation } from '../services/geminiService';

interface ReviewerProps {
  sentences: Sentence[];
  translations: Translation[];
  user: User;
  targetLanguage: Language;
  onReviewAction: (id: string, status: 'approved' | 'rejected', feedback?: string) => void;
  onUpdateTranslation: (t: Translation) => void;
  onVote: (id: string, type: 'up' | 'down') => void;
  onAddComment: (id: string, text: string) => void;
}

export const Reviewer: React.FC<ReviewerProps> = ({ sentences, translations, targetLanguage, onReviewAction, onUpdateTranslation, onVote, onAddComment }) => {
  const pending = translations.filter(t => t.languageCode === targetLanguage.code && t.status === 'pending');
  const [idx, setIdx] = useState(0);
  
  const current = pending[idx];
  const sentence = current ? sentences.find(s => s.id === current.sentenceId) : null;
  
  if (!current) return <div className="text-center py-10">All caught up!</div>;
  
  return (
    <div className="max-w-3xl mx-auto">
       <Card>
          <h3 className="font-bold mb-2">Original</h3>
          <p className="bg-gray-50 p-3 rounded mb-4">{sentence?.english}</p>
          <h3 className="font-bold mb-2">Translation</h3>
          <p className="bg-blue-50 p-3 rounded mb-4 text-lg">{current.text}</p>
          {current.aiQualityScore && <Badge color={current.aiQualityScore > 7 ? 'green' : 'red'}>AI Score: {current.aiQualityScore}/10</Badge>}
          <div className="flex space-x-3 mt-4">
             <Button variant="danger" onClick={() => onReviewAction(current.id, 'rejected', 'Needs work')}>Reject</Button>
             <Button className="bg-green-600" onClick={() => onReviewAction(current.id, 'approved')}>Approve</Button>
             <Button variant="secondary" onClick={async () => { 
                 if(!sentence) return;
                 const res = await validateTranslation(sentence.english, current.text, targetLanguage); 
                 onUpdateTranslation({...current, aiQualityScore: res.score}); 
             }}>Check AI</Button>
          </div>
       </Card>
    </div>
  );
};