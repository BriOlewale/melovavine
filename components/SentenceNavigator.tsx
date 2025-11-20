import React, { useState } from 'react';
import { Modal, Input } from './UI';
import { Sentence, Translation, Language } from '../types';

export const SentenceNavigator: React.FC<{ isOpen: boolean, onClose: () => void, sentences: Sentence[], translations: Translation[], targetLanguage: Language, onSelectSentence: (i: number) => void }> = ({ isOpen, onClose, sentences, onSelectSentence }) => {
  const [q, setQ] = useState('');
  const filtered = sentences.filter(s => s.english.toLowerCase().includes(q.toLowerCase())).slice(0, 20);
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Navigate">
       <Input label="Search" value={q} onChange={e => setQ(e.target.value)} />
       <ul className="mt-4 max-h-60 overflow-y-auto">
          {filtered.map((s, i) => (
              <li key={s.id} onClick={() => { onSelectSentence(i); onClose(); }} className="p-2 hover:bg-gray-100 cursor-pointer truncate">
                 {s.id}: {s.english}
              </li>
          ))}
       </ul>
    </Modal>
  );
};