import React from 'react';
import { Announcement, ForumTopic } from '../types';
import { Card } from './UI';

export const CommunityHub: React.FC<{ announcements: Announcement[], forumTopics: ForumTopic[], onAddAnnouncement: Function, onAddTopic: Function, onReplyToTopic: Function }> = ({ announcements }) => {
  return (
    <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
       <div>
          <h2 className="text-xl font-bold mb-4">Announcements</h2>
          {announcements.map(a => (
             <Card key={a.id} className="mb-4">
                <h3 className="font-bold">{a.title}</h3>
                <p className="text-gray-600">{a.content}</p>
             </Card>
          ))}
       </div>
       <div>
          <h2 className="text-xl font-bold mb-4">Forum</h2>
          <Card><p>Coming soon...</p></Card>
       </div>
    </div>
  );
};