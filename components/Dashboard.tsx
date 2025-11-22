import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Sentence, Translation, Language, User } from '../types';
import { Card, Badge } from './UI';

export const Dashboard: React.FC<{ sentences: Sentence[]; translations: Translation[]; language: Language; users: User[] }> = ({ sentences, translations, language, users }) => {
  const langTrans = translations.filter(t => t.languageCode === language.code);
  const approved = langTrans.filter(t => t.status === 'approved').length;
  const pending = langTrans.filter(t => t.status === 'pending').length;
  const remaining = sentences.length - langTrans.length;
  
  const data = [
    { name: 'Approved', value: approved },
    { name: 'Pending', value: pending },
    { name: 'Remaining', value: remaining > 0 ? remaining : 0 },
  ];
  const COLORS = ['#22c55e', '#f59e0b', '#e2e8f0'];

  // Calculate Top Contributors for Dashboard
  const topContributors = users.map(u => {
      const userTrans = langTrans.filter(t => t.translatorId === u.id);
      const approvedCount = userTrans.filter(t => t.status === 'approved').length;
      const totalVotes = userTrans.reduce((acc, t) => acc + (t.votes || 0), 0);
      return { 
          id: u.id, 
          name: u.name, 
          approvedCount, 
          totalVotes 
      };
  })
  .filter(u => u.approvedCount > 0 || u.totalVotes > 0)
  .sort((a, b) => b.approvedCount - a.approvedCount)
  .slice(0, 5); // Show top 5

  return (
    <div className="space-y-6">
       <h1 className="text-2xl font-bold">Dashboard</h1>
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
             <h3 className="text-gray-500">Total Sentences</h3>
             <p className="text-2xl font-bold">{sentences.length}</p>
          </Card>
          <Card>
             <h3 className="text-green-600">Approved</h3>
             <p className="text-2xl font-bold">{approved}</p>
          </Card>
          <Card>
             <h3 className="text-yellow-600">Pending</h3>
             <p className="text-2xl font-bold">{pending}</p>
          </Card>
       </div>
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <Card className="h-80 lg:col-span-2">
               <h3 className="font-bold text-lg mb-4">Translation Progress</h3>
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                     <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="value">
                        {data.map((_entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index]} />)}
                     </Pie>
                     <Tooltip />
                     <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
               </ResponsiveContainer>
           </Card>
           
           <Card className="h-80 overflow-y-auto">
               <h3 className="font-bold text-lg mb-4">Top Contributors</h3>
               {topContributors.length > 0 ? (
                   <div className="space-y-4">
                       {topContributors.map((c, i) => (
                           <div key={c.id} className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0">
                               <div className="flex items-center">
                                   <span className={`flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold mr-3 ${i === 0 ? 'bg-yellow-100 text-yellow-800' : i === 1 ? 'bg-gray-100 text-gray-800' : i === 2 ? 'bg-orange-100 text-orange-800' : 'bg-white text-gray-500'}`}>
                                       {i + 1}
                                   </span>
                                   <div>
                                       <div className="text-sm font-medium text-gray-900">{c.name}</div>
                                       <div className="text-xs text-gray-500">{c.totalVotes} votes</div>
                                   </div>
                               </div>
                               <Badge color="green">{c.approvedCount} Approved</Badge>
                           </div>
                       ))}
                   </div>
               ) : (
                   <p className="text-sm text-gray-500 italic text-center mt-10">No contributions yet.</p>
               )}
           </Card>
       </div>
    </div>
  );
};