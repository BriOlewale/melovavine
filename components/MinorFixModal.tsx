import React, { useState, useEffect } from 'react';
import { Modal, Input, Button } from './UI';

interface MinorFixModalProps {
  isOpen: boolean;
  initialText: string;
  onClose: () => void;
  onSave: (newText: string, comment?: string) => void;
}

const MinorFixModal: React.FC<MinorFixModalProps> = ({ isOpen, initialText, onClose, onSave }) => {
  const [editedText, setEditedText] = useState(initialText);
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (isOpen) {
        setEditedText(initialText);
        setComment('');
    }
  }, [isOpen, initialText]);

  const handleSave = () => {
    if (!editedText.trim()) return;
    onSave(editedText, comment);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Apply Minor Fix">
      <div className="space-y-4">
          <p className="text-sm text-slate-500">Edit the translation directly. This will approve the translation with your changes.</p>
          
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Original</div>
              <div className="text-slate-800">{initialText}</div>
          </div>

          <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Corrected Text</label>
              <textarea 
                  className="w-full border-2 border-slate-100 rounded-xl p-3 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-400 outline-none transition-all"
                  rows={3}
                  value={editedText}
                  onChange={e => setEditedText(e.target.value)}
              />
          </div>

          <Input 
              label="Reason (Optional)" 
              value={comment} 
              onChange={e => setComment(e.target.value)} 
              placeholder="e.g. Fixed spelling, corrected grammar..."
          />

          <div className="flex gap-3 mt-4">
              <Button variant="secondary" fullWidth onClick={onClose}>Cancel</Button>
              <Button fullWidth onClick={handleSave} disabled={!editedText.trim()}>Apply Fix & Approve</Button>
          </div>
      </div>
    </Modal>
  );
};

export default MinorFixModal;