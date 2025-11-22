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

export const Translator: React.FC<TranslatorProps> = ({ sentences, translations, user, users = [], targetLanguage, onSaveTranslation, wordTranslations, onSaveWordTranslation, onAddComment, onVote }) => {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState('');
  const [selectedWord, setSelectedWord] = useState<{t: string, n: string} | null>(null);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [historyModalTranslation, setHistoryModalTranslation] = useState<Translation | null>(null);

  const sentence = sentences[index];

  // Filter translations for this sentence
  const sentenceTranslations = translations.filter(t => t.sentenceId === sentence?.id && t.languageCode === targetLanguage.code);
  
  // Identify "My" translation vs "Community" translations
  const myTranslation = sentenceTranslations.find(t => t.translatorId === user.id);
  const communityTranslations = sentenceTranslations
    .filter(t => t.translatorId !== user.id)
    .sort((a, b) => b.votes - a.votes); // Sort by votes

  useEffect(() => { 
    setText(myTranslation?.text || ''); 
  }, [myTranslation, sentence]);

  const handleSave = () => {
      if (!sentence) return;
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
      // Auto-advance on save
      if (index < sentences.length - 1) setIndex(index + 1);
  };
  
  const handleAi = async () => {
      if (sentence) setText(await getTranslationSuggestion(sentence.english, targetLanguage));
  };

  const handleNext = () => {
      if (index < sentences.length - 1) setIndex(index + 1);
  };

  const handlePrev = () => {
      if (index > 0) setIndex(index - 1);
  };

  const getUserName = (id: string) => users.find(u => u.id === id)?.name || 'Unknown';

  if (!sentence) return <div>No sentences loaded.</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
       {/* Navigation Header */}
       <div className="flex justify-between items-center">
          <div className="flex gap-2">
              <Button variant="secondary" onClick={handlePrev} disabled={index === 0}>← Prev</Button>
              <span className="self-center text-gray-500 font-medium text-sm">
                  {index + 1} / {sentences.length}
              </span>
              <Button variant="secondary" onClick={handleNext} disabled={index === sentences.length - 1}>Next →</Button>
          </div>
          <Button variant="ghost" onClick={() => setIsNavOpen(true)}>Browse All</Button>
       </div>

       {/* Sentence Display */}
       <Card className="p-6 border-t-4 border-t-brand-500">
          <div className="text-gray-400 text-xs uppercase font-bold tracking-wider mb-2">Translate to {targetLanguage.name}</div>
          <div className="text-2xl font-medium leading-relaxed text-gray-900">
             {sentence.english.split(' ').map((w, i) => (
                <span key={i} onClick={() => setSelectedWord({t: w, n: w.toLowerCase().replace(/[^a-z]/g, '')})} className="cursor-pointer hover:text-brand-600 hover:bg-brand-50 rounded px-0.5 transition-colors">
                   {w}{' '}
                </span>
             ))}
          </div>
       </Card>

       {/* Community Translations */}
       <div className="space-y-4">
         {communityTranslations.length > 0 && (
             <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide mt-6">Community Contributions</h3>
         )}
         {communityTranslations.map(t => {
            const voteStatus = t.voteHistory?.[user.id];
            return (
              <Card key={t.id} className="bg-gray-50 border-gray-200">
                 <div className="flex justify-between items-start">
                    <div>
                       <div className="text-lg text-gray-900 mb-1">{t.text}</div>
                       <div className="text-xs text-gray-500 flex items-center gap-2">
                          <span className="font-medium">{getUserName(t.translatorId)}</span>
                          <span>•</span>
                          <span>{new Date(t.timestamp).toLocaleDateString()}</span>
                          {t.status === 'approved' && <Badge color="green">Approved</Badge>}
                       </div>
                    </div>
                    <div className="flex flex-col items-center bg-white rounded border p-1 shadow-sm">
                       <button 
                         onClick={() => onVote(t.id, 'up')}
                         className={`p-1 hover:bg-gray-100 rounded ${voteStatus === 'up' ? 'text-green-600' : 'text-gray-400'}`}
                       >
                         ▲
                       </button>
                       <span className={`text-sm font-bold ${t.votes > 0 ? 'text-green-600' : t.votes < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                         {t.votes}
                       </span>
                       <button 
                         onClick={() => onVote(t.id, 'down')}
                         className={`p-1 hover:bg-gray-100 rounded ${voteStatus === 'down' ? 'text-red-600' : 'text-gray-400'}`}
                       >
                         ▼
                       </button>
                    </div>
                 </div>
                 
                 {/* Comments Section */}
                 <div className="mt-3 pt-2 border-t border-gray-200">
                     {t.comments && t.comments.length > 0 && (
                         <div className="space-y-1 mb-2">
                             {t.comments.map(c => (
                                 <div key={c.id} className="text-xs bg-white p-1 rounded border text-gray-600">
                                     <span className="font-bold text-gray-800">{c.userName}:</span> {c.text}
                                 </div>
                             ))}
                         </div>
                     )}
                     <div className="flex gap-2">
                         <input 
                            type="text" 
                            placeholder="Discuss translation..." 
                            className="flex-1 text-xs border rounded px-2 py-1 focus:ring-1 focus:ring-brand-500 focus:outline-none"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    onAddComment(t.id, e.currentTarget.value);
                                    e.currentTarget.value = '';
                                }
                            }}
                         />
                         <button className="text-xs text-brand-600 hover:underline whitespace-nowrap" onClick={() => setHistoryModalTranslation(t)}>
                            View History
                         </button>
                     </div>
                 </div>
              </Card>
            );
         })}
       </div>

       {/* My Translation Input */}
       <div className="space-y-3 pt-4">
         <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Your Translation</h3>
         <Card className={`border-2 transition-shadow ${text ? 'border-brand-200 shadow-md' : 'border-gray-200'}`}>
            <textarea 
              className="w-full border-0 focus:ring-0 p-0 resize-none text-xl mb-4 placeholder-gray-300 min-h-[80px]" 
              rows={3} 
              placeholder="Type Hula translation here..." 
              value={text} 
              onChange={e => setText(e.target.value)} 
            />
            <div className="flex justify-between items-center border-t border-gray-100 pt-4">
               <Button variant="ghost" onClick={handleAi} className="text-brand-600 text-xs">✨ AI Suggestion</Button>
               <div className="flex gap-2 items-center">
                 {myTranslation && <span className="text-xs text-gray-400 mr-2 uppercase font-bold tracking-wider">{myTranslation.status}</span>}
                 <Button onClick={handleSave} className="px-6">
                    {myTranslation ? 'Update' : 'Submit'}
                 </Button>
               </div>
            </div>
         </Card>
       </div>

       {/* Bottom Navigation for ease of use */}
       <div className="flex justify-between pt-6 border-t border-gray-200 mt-8">
            <Button variant="ghost" onClick={handlePrev} disabled={index === 0}>← Previous Sentence</Button>
            <Button variant="ghost" onClick={handleNext} disabled={index === sentences.length - 1}>Skip / Next →</Button>
       </div>

       {selectedWord && <WordDefinitionModal isOpen={!!selectedWord} onClose={() => setSelectedWord(null)} selectedWord={selectedWord.t} normalizedWord={selectedWord.n} existingTranslations={wordTranslations.filter(wt => wt.wordId === selectedWord.n || wt.wordId === 'temp')} targetLanguage={targetLanguage} onSave={(t, n) => { onSaveWordTranslation(selectedWord.t, selectedWord.n, t, n, sentence.id); setSelectedWord(null); }} />}
       <SentenceNavigator isOpen={isNavOpen} onClose={() => setIsNavOpen(false)} sentences={sentences} translations={translations} targetLanguage={targetLanguage} onSelectSentence={setIndex} />
       <TranslationHistoryModal isOpen={!!historyModalTranslation} onClose={() => setHistoryModalTranslation(null)} translation={historyModalTranslation} />
    </div>
  );
};