import React, { useState } from 'react';
import { Word, WordTranslation } from '../types';
import { Card, Input } from './UI';

export const Dictionary: React.FC<{ words: Word[], wordTranslations: WordTranslation[] }> = ({ words, wordTranslations }) => {
  const [search, setSearch] = useState('');
  const filtered = words.filter(w => w.text.includes(search));

  return (
    <div className="max-w-4xl mx-auto">
       <Input label="Search" value={search} onChange={e => setSearch(e.target.value)} className="mb-6" />
       <div className="grid gap-4">
          {filtered.map(w => {
             const trans = wordTranslations.filter(wt => wt.wordId === w.id);
             return (
                 <Card key={w.id}>
                    <h3 className="font-bold text-lg">{w.text}</h3>
                    <ul className="mt-2">{trans.map(t => <li key={t.id} className="text-brand-700">{t.translation}</li>)}</ul>
                 </Card>
             );
          })}
       </div>
    </div>
  );
};