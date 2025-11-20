import React from 'react';
import { Translation, User, Language } from '../types';
import { Card } from './UI';

export const Leaderboard: React.FC<{ translations: Translation[], users: User[], targetLanguage: Language }> = ({ translations, users }) => {
  const stats = users.map(u => {
      const count = translations.filter(t => t.translatorId === u.id && t.status === 'approved').length;
      return { name: u.name, count };
  }).sort((a, b) => b.count - a.count);

  return (
    <div className="max-w-2xl mx-auto">
       <h2 className="text-2xl font-bold mb-6 text-center">Top Contributors</h2>
       <Card>
          <table className="w-full">
             <thead><tr><th className="text-left">Rank</th><th className="text-left">User</th><th className="text-right">Approved</th></tr></thead>
             <tbody>
                {stats.map((s, i) => (
                    <tr key={i} className="border-b">
                       <td className="py-2">#{i+1}</td>
                       <td className="py-2">{s.name}</td>
                       <td className="py-2 text-right font-bold">{s.count}</td>
                    </tr>
                ))}
             </tbody>
          </table>
       </Card>
    </div>
  );
};