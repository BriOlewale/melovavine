import React, { useState } from 'react';
import { Modal, Button, Input } from './UI';
import { WordTranslation, Language } from '../types';

export const WordDefinitionModal: React.FC<{ isOpen: boolean, onClose: () => void, selectedWord: string, normalizedWord: string, existingTranslations: WordTranslation[], targetLanguage: Language, onSave: (t: string, n: string) => void }> = ({ isOpen, onClose, selectedWord, onSave }) => {
  const [text, setText] = useState('');
  const [notes, setNotes] = useState('');
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Define: ${selectedWord}`}>
       <Input label="Translation" value={text} onChange={e => setText(e.target.value)} />
       <Input label="Notes" value={notes} onChange={e => setNotes(e.target.value)} className="mt-2" />
       <Button onClick={() => onSave(text, notes)} className="mt-4 w-full">Save</Button>
    </Modal>
  );
};