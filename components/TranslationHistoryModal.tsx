import React from 'react';
import { Modal } from './UI';
import { Translation } from '../types';

export const TranslationHistoryModal: React.FC<{ isOpen: boolean, onClose: () => void, translation?: Translation | null }> = ({ isOpen, onClose, translation }) => {
  if (!translation) return null;
  return (
     <Modal isOpen={isOpen} onClose={onClose} title="History">
        <ul className="space-y-2">
           {translation.history?.map((h, i) => (
               <li key={i} className="text-sm border-b pb-2">
                  <div className="font-bold">{h.action.toUpperCase()} by {h.userName}</div>
                  <div className="text-xs text-gray-500">{new Date(h.timestamp).toLocaleString()}</div>
               </li>
           ))}
        </ul>
     </Modal>
  );
};