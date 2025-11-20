import React, { useState } from 'react';
import { Translation, User, Language } from '../types';
import { Card, Button } from './UI';

export const Leaderboard: React.FC<{ translations: Translation[], users: User[], targetLanguage: Language }> = ({ translations, users, targetLanguage }) => {
  const [metric, setMetric] = useState<'approved' | 'votes'>('approved');

  const stats = users.map(u => {
      // Filter translations for this user and the current target language
      const userTranslations = translations.filter(t => t.translatorId === u.id && t.languageCode === targetLanguage.code);
      
      const approvedCount = userTranslations.filter(t => t.status === 'approved').length;
      const totalVotes = userTranslations.reduce((sum, t) => sum + (t.votes || 0), 0);
      
      return { 
          id: u.id,
          name: u.name, 
          approvedCount, 
          totalVotes 
      };
  })
  .filter(s => s.approvedCount > 0 || s.totalVotes > 0) // Only show active users
  .sort((a, b) => {
      if (metric === 'approved') return b.approvedCount - a.approvedCount;
      return b.totalVotes - a.totalVotes;
  });

  const getMedal = (rank: number) => {
      if (rank === 0) return '🥇';
      if (rank === 1) return '🥈';
      if (rank === 2) return '🥉';
      return `#${rank + 1}`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
       <div className="text-center">
           <h2 className="text-3xl font-bold text-gray-900">Leaderboard</h2>
           <p className="text-gray-500 mt-2">Top contributors for {targetLanguage.name}</p>
       </div>

       <div className="flex justify-center space-x-4">
           <Button 
               variant={metric === 'approved' ? 'primary' : 'secondary'} 
               onClick={() => setMetric('approved')}
           >
               Most Approved
           </Button>
           <Button 
               variant={metric === 'votes' ? 'primary' : 'secondary'} 
               onClick={() => setMetric('votes')}
           >
               Highest Voted
           </Button>
       </div>

       {stats.length > 0 && (
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 items-end">
               {/* Silver */}
               {stats[1] && (
                   <Card key={stats[1].id} className="text-center order-2 md:order-1 h-40 flex flex-col justify-center">
                       <div className="text-4xl mb-2">🥈</div>
                       <div className="font-bold text-lg truncate px-2">{stats[1].name}</div>
                       <div className="text-2xl font-bold text-gray-600 mt-1">
                           {metric === 'approved' ? stats[1].approvedCount : stats[1].totalVotes}
                       </div>
                   </Card>
               )}
               
               {/* Gold */}
               {stats[0] && (
                   <Card key={stats[0].id} className="text-center order-1 md:order-2 h-48 flex flex-col justify-center border-yellow-400 ring-2 ring-yellow-100 shadow-lg z-10">
                       <div className="text-5xl mb-2">👑</div>
                       <div className="font-bold text-xl truncate px-2">{stats[0].name}</div>
                       <div className="text-3xl font-bold text-brand-600 mt-1">
                           {metric === 'approved' ? stats[0].approvedCount : stats[0].totalVotes}
                       </div>
                       <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">
                           {metric === 'approved' ? 'Approved' : 'Votes'}
                       </div>
                   </Card>
               )}

               {/* Bronze */}
               {stats[2] && (
                   <Card key={stats[2].id} className="text-center order-3 md:order-3 h-36 flex flex-col justify-center">
                       <div className="text-3xl mb-2">🥉</div>
                       <div className="font-bold text-lg truncate px-2">{stats[2].name}</div>
                       <div className="text-xl font-bold text-gray-600 mt-1">
                           {metric === 'approved' ? stats[2].approvedCount : stats[2].totalVotes}
                       </div>
                   </Card>
               )}
           </div>
       )}

       <Card>
          <table className="w-full">
             <thead>
                 <tr className="border-b border-gray-100">
                     <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Rank</th>
                     <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Translator</th>
                     <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">Approved</th>
                     <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">Total Votes</th>
                 </tr>
             </thead>
             <tbody className="divide-y divide-gray-100">
                {stats.map((s, i) => (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                       <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                           {getMedal(i)}
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                           {s.name}
                       </td>
                       <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${metric === 'approved' ? 'font-bold text-brand-600' : 'text-gray-500'}`}>
                           {s.approvedCount}
                       </td>
                       <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${metric === 'votes' ? 'font-bold text-brand-600' : 'text-gray-500'}`}>
                           {s.totalVotes}
                       </td>
                    </tr>
                ))}
                {stats.length === 0 && (
                    <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                            No contributions found yet. Start translating to see your name here!
                        </td>
                    </tr>
                )}
             </tbody>
          </table>
       </Card>
    </div>
  );
};