import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Sentence, Translation, Language } from '../types';
import { Card } from './UI';

export const Dashboard: React.FC<{ sentences: Sentence[]; translations: Translation[]; language: Language }> = ({ sentences, translations, language }) => {
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
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <Card className="h-80">
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                     <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="value">
                        {data.map((_entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index]} />)}
                     </Pie>
                     <Tooltip />
                     <Legend />
                  </PieChart>
               </ResponsiveContainer>
           </Card>
       </div>
    </div>
  );
};