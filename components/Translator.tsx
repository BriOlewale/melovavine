import React, { useState } from 'react';
import { Sentence, Translation, User, Language, Word, WordTranslation } from '../types';
import { Button, Card } from './UI';
import { getTranslationSuggestion } from '../services/geminiService';
import { WordDefinitionModal } from './WordDefinitionModal';
import { SentenceNavigator } from './SentenceNavigator';

interface TranslatorProps {
  sentences: Sentence[];
  translations: Translation[];
  user: User;
  targetLanguage: Language;
  onSaveTranslation: (t: Translation) => void;
  words: Word[];
  wordTranslations: WordTranslation[];
  onSaveWordTranslation: (wt: string, nt: string, t: string, n: string, id: number) => void;
  onAddComment: (id: string, txt: string) => void;
  onVote: (id: string, type: 'up' | 'down') => void;
}

export const Translator: React.FC<TranslatorProps> = ({ sentences, translations, user, targetLanguage, onSaveTranslation, wordTranslations, onSaveWordTranslation }) => {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState('');
  const [selectedWord, setSelectedWord] = useState<{t: string, n: string} | null>(null);
  const [isNavOpen, setIsNavOpen] = useState(false);

  const sentence = sentences[index];
  const existing = translations.find(t => t.sentenceId === sentence?.id && t.languageCode === targetLanguage.code);

  React.useEffect(() => { setText(existing?.text || ''); }, [existing, sentence]);

  const handleSave = () => {
      if (!sentence) return;
      onSaveTranslation({
          id: existing?.id || crypto.randomUUID(),
          sentenceId: sentence.id,
          text,
          languageCode: targetLanguage.code,
          translatorId: user.id,
          timestamp: Date.now(),
          votes: existing?.votes || 0,
          status: 'pending'
      });
      if (index < sentences.length - 1) setIndex(index + 1);
  };
  
  const handleAi = async () => {
      if (sentence) setText(await getTranslationSuggestion(sentence.english, targetLanguage));
  };

  if (!sentence) return <div>No sentences loaded.</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
       <div className="flex justify-between">
          <h2>Translating to {targetLanguage.name}</h2>
          <Button variant="secondary" onClick={() => setIsNavOpen(true)}>Navigator</Button>
       </div>
       <Card>
          <div className="mb-4 p-4 bg-gray-50 rounded text-lg">
             {sentence.english.split(' ').map((w, i) => (
                <span key={i} onClick={() => setSelectedWord({t: w, n: w.toLowerCase().replace(/[^a-z]/g, '')})} className="cursor-pointer hover:text-brand-600 hover:underline mr-1">
                   {w}
                </span>
             ))}
          </div>
          <textarea className="w-full border rounded p-2 mb-4" rows={4} value={text} onChange={e => setText(e.target.value)} />
          <div className="flex justify-between">
             <Button variant="ghost" onClick={handleAi}>Ask AI</Button>
             <Button onClick={handleSave}>Submit</Button>
          </div>
       </Card>
       {selectedWord && <WordDefinitionModal isOpen={!!selectedWord} onClose={() => setSelectedWord(null)} selectedWord={selectedWord.t} normalizedWord={selectedWord.n} existingTranslations={wordTranslations.filter(wt => wt.wordId === selectedWord.n || wt.wordId === 'temp')} targetLanguage={targetLanguage} onSave={(t, n) => { onSaveWordTranslation(selectedWord.t, selectedWord.n, t, n, sentence.id); setSelectedWord(null); }} />}
       <SentenceNavigator isOpen={isNavOpen} onClose={() => setIsNavOpen(false)} sentences={sentences} translations={translations} targetLanguage={targetLanguage} onSelectSentence={setIndex} />
    </div>
  );
};