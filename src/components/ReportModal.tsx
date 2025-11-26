import React, { useState } from 'react';
import { Modal, Button, Input } from '@/components/UI';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, onSubmit }) => {
  // ... rest of the component (no logic changes)
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  const reasons = [
    "Incorrect translation",
    "Duplicate content",
    "Offensive or inappropriate",
    "Needs cultural clarification",
    "Other"
  ];

  const handleSubmit = () => {
    const finalReason = reason === 'Other' ? customReason : reason;
    if (finalReason.trim()) {
      onSubmit(finalReason);
      setReason('');
      setCustomReason('');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Flag Issue">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">Why are you flagging this item? Your report will be reviewed by moderators.</p>
        
        <div className="space-y-2">
          {reasons.map(r => (
            <label key={r} className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input 
                type="radio" 
                name="reportReason" 
                value={r} 
                checked={reason === r} 
                onChange={() => setReason(r)}
                className="text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm font-medium text-gray-700">{r}</span>
            </label>
          ))}
        </div>

        {reason === 'Other' && (
          <Input 
            label="Please specify" 
            value={customReason} 
            onChange={e => setCustomReason(e.target.value)} 
            placeholder="Describe the issue..."
            autoFocus
          />
        )}

        <div className="flex gap-3 mt-6">
          <Button variant="secondary" fullWidth onClick={onClose}>Cancel</Button>
          <Button 
            fullWidth 
            onClick={handleSubmit} 
            disabled={!reason || (reason === 'Other' && !customReason.trim())}
            className="bg-red-600 hover:bg-red-700 shadow-red-200"
          >
            Submit Report
          </Button>
        </div>
      </div>
    </Modal>
  );
};