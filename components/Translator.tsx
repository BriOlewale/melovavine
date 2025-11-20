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
      if (index < sentences.length - 1) setIndex(index + 1);
  };
  
  const handleAi = async () => {
      if (sentence) setText(await getTranslationSuggestion(sentence.english, targetLanguage));
  };

  const getUserName = (id: string) => users.find(u => u.id === id)?.name || 'Unknown';

  if (!sentence) return <div>No sentences loaded.</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
       <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Translating to {targetLanguage.name}</h2>
          <Button variant="secondary" onClick={() => setIsNavOpen(true)}>Browse Sentences</Button>
       </div>

       {/* Sentence Display */}
       <Card className="p-6">
          <div className="text-gray-500 text-sm mb-2">Sentence #{sentence.id}</div>
          <div className="text-2xl font-medium leading-relaxed">
             {sentence.english.split(' ').map((w, i) => (
                <span key={i} onClick={() => setSelectedWord({t: w, n: w.toLowerCase().replace(/[^a-z]/g, '')})} className="cursor-pointer hover:text-brand-600 hover:bg-brand-50 rounded px-0.5 transition-colors">
                   {w}{' '}
                </span>
             ))}
          </div>
       </Card>

       {/* Community Translations */}
       <div className="space-y-4">
         <h3 className="font-bold text-gray-700">Community Translations ({communityTranslations.length})</h3>
         {communityTranslations.length === 0 && (
           <div className="text-gray-500 text-sm italic">No other translations yet. Be the first!</div>
         )}
         {communityTranslations.map(t => {
            const voteStatus = t.voteHistory?.[user.id];
            return (
              <Card key={t.id} className="bg-gray-50 border-gray-200">
                 <div className="flex justify-between items-start">
                    <div>
                       <div className="text-lg text-gray-900 mb-1">{t.text}</div>
                       <div className="text-xs text-gray-500 flex items-center gap-2">
                          <span>by {getUserName(t.translatorId)}</span>
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
                                 <div key={c.id} className="text-xs bg-white p-1 rounded border">
                                     <span className="font-bold">{c.userName}:</span> {c.text}
                                 </div>
                             ))}
                         </div>
                     )}
                     <div className="flex gap-2">
                         <input 
                            type="text" 
                            placeholder="Add a comment..." 
                            className="flex-1 text-xs border rounded px-2 py-1 focus:ring-1 focus:ring-brand-500 focus:outline-none"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    onAddComment(t.id, e.currentTarget.value);
                                    e.currentTarget.value = '';
                                }
                            }}
                         />
                         <button className="text-xs text-brand-600 hover:underline" onClick={() => setHistoryModalTranslation(t)}>
                            History
                         </button>
                     </div>
                 </div>
              </Card>
            );
         })}
       </div>

       {/* My Translation Input */}
       <div className="space-y-3">
         <h3 className="font-bold text-gray-700">Your Contribution</h3>
         <Card className="border-brand-200 ring-1 ring-brand-100">
            <textarea 
              className="w-full border-0 focus:ring-0 p-0 resize-none text-lg mb-4 placeholder-gray-300" 
              rows={3} 
              placeholder="Type your translation here..." 
              value={text} 
              onChange={e => setText(e.target.value)} 
            />
            <div className="flex justify-between items-center border-t pt-4">
               <Button variant="ghost" onClick={handleAi} className="text-brand-600">✨ AI Suggestion</Button>
               <div className="flex gap-2">
                 {myTranslation && <span className="text-xs text-gray-400 self-center mr-2">Status: {myTranslation.status}</span>}
                 <Button onClick={handleSave}>
                    {myTranslation ? 'Update' : 'Submit'} Translation
                 </Button>
               </div>
            </div>
         </Card>
       </div>

       {selectedWord && <WordDefinitionModal isOpen={!!selectedWord} onClose={() => setSelectedWord(null)} selectedWord={selectedWord.t} normalizedWord={selectedWord.n} existingTranslations={wordTranslations.filter(wt => wt.wordId === selectedWord.n || wt.wordId === 'temp')} targetLanguage={targetLanguage} onSave={(t, n) => { onSaveWordTranslation(selectedWord.t, selectedWord.n, t, n, sentence.id); setSelectedWord(null); }} />}
       <SentenceNavigator isOpen={isNavOpen} onClose={() => setIsNavOpen(false)} sentences={sentences} translations={translations} targetLanguage={targetLanguage} onSelectSentence={setIndex} />
       <TranslationHistoryModal isOpen={!!historyModalTranslation} onClose={() => setHistoryModalTranslation(null)} translation={historyModalTranslation} />
    </div>
  );
};