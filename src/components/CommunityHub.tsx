import React, { useState } from 'react';
import { Announcement, ForumTopic, User, ResourceItem } from '@/types';
import { Card, Button, Input, Modal, Badge } from '@/components/UI';
import { hasPermission } from '@/services/permissionService';

interface CommunityHubProps {
  announcements: Announcement[];
  forumTopics: ForumTopic[];
  onAddAnnouncement: (title: string, content: string) => void;
  onAddTopic: (title: string, content: string, category: ForumTopic['category']) => void;
  onReplyToTopic: (topicId: string, content: string) => void;
  user: User | null;
}

export const CommunityHub: React.FC<CommunityHubProps> = ({ announcements, forumTopics, onAddAnnouncement, onAddTopic, onReplyToTopic, user }) => {
  // ... rest of the component (no logic changes)
  const [tab, setTab] = useState<'announcements' | 'forum' | 'resources'>('announcements');
  
  // State for Forum Navigation
  const [selectedTopic, setSelectedTopic] = useState<ForumTopic | null>(null);
  
  // Modals
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '' });
  
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [newTopic, setNewTopic] = useState<{ title: string, content: string, category: ForumTopic['category'] }>({ title: '', content: '', category: 'general' });
  
  const [replyContent, setReplyContent] = useState('');

  // RBAC Check
  const canManageAnnouncements = hasPermission(user, 'community.manage');

  const resources: ResourceItem[] = [
      { id: '1', title: 'Translator Guidelines', description: 'Best practices for translating into PNG languages.', type: 'document', url: '#' },
      { id: '2', title: 'Video Tutorial: Using the Editor', description: 'A 5-minute guide to the translation interface.', type: 'video', url: '#' },
      { id: '3', title: 'Glossary of Common Terms', description: 'Standard translations for government and tech terms.', type: 'link', url: '#' },
      { id: '4', title: 'Community Code of Conduct', description: 'Rules for respectful participation.', type: 'document', url: '#' },
  ];

  const handleCreateAnnouncement = () => {
      if (newAnnouncement.title && newAnnouncement.content) {
          onAddAnnouncement(newAnnouncement.title, newAnnouncement.content);
          setIsAnnouncementModalOpen(false);
          setNewAnnouncement({ title: '', content: '' });
      }
  };

  const handleCreateTopic = () => {
      if (newTopic.title && newTopic.content) {
          onAddTopic(newTopic.title, newTopic.content, newTopic.category);
          setIsTopicModalOpen(false);
          setNewTopic({ title: '', content: '', category: 'general' });
      }
  };

  const handlePostReply = () => {
      if (selectedTopic && replyContent) {
          onReplyToTopic(selectedTopic.id, replyContent);
          setReplyContent('');
      }
  };

  React.useEffect(() => {
      if (selectedTopic) {
          const updated = forumTopics.find(t => t.id === selectedTopic.id);
          if (updated) setSelectedTopic(updated);
      }
  }, [forumTopics]);

  return (
    <div className="max-w-6xl mx-auto">
       {/* Navigation Tabs */}
       <div className="flex border-b border-gray-200 mb-6">
           <button className={`px-6 py-3 font-medium text-sm ${tab === 'announcements' ? 'border-b-2 border-brand-600 text-brand-600' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => setTab('announcements')}>Announcements</button>
           <button className={`px-6 py-3 font-medium text-sm ${tab === 'forum' ? 'border-b-2 border-brand-600 text-brand-600' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => setTab('forum')}>Discussion Forum</button>
           <button className={`px-6 py-3 font-medium text-sm ${tab === 'resources' ? 'border-b-2 border-brand-600 text-brand-600' : 'text-gray-500 hover:text-gray-700'}`} onClick={() => setTab('resources')}>Resources</button>
       </div>

       {/* ANNOUNCEMENTS TAB */}
       {tab === 'announcements' && (
           <div>
               <div className="flex justify-between items-center mb-6">
                   <h2 className="text-2xl font-bold">Latest News</h2>
                   {canManageAnnouncements && (
                       <Button onClick={() => setIsAnnouncementModalOpen(true)}>Post Announcement</Button>
                   )}
               </div>
               <div className="space-y-6">
                   {announcements.length === 0 && <p className="text-gray-500 italic">No announcements yet.</p>}
                   {announcements.map(a => (
                       <Card key={a.id} className="border-l-4 border-l-brand-500">
                           <div className="flex justify-between items-start mb-2">
                               <h3 className="text-xl font-bold text-gray-900">{a.title}</h3>
                               <span className="text-sm text-gray-500">{new Date(a.date).toLocaleDateString()}</span>
                           </div>
                           <p className="text-gray-700 whitespace-pre-line">{a.content}</p>
                           <div className="mt-4 text-sm text-gray-500 font-medium">Posted by {a.author}</div>
                       </Card>
                   ))}
               </div>
           </div>
       )}

       {/* FORUM TAB */}
       {tab === 'forum' && (
           <div>
               {!selectedTopic ? (
                   // Topic List View
                   <>
                       <div className="flex justify-between items-center mb-6">
                           <h2 className="text-2xl font-bold">Community Discussions</h2>
                           <Button onClick={() => setIsTopicModalOpen(true)}>Start New Topic</Button>
                       </div>
                       <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
                           <table className="min-w-full divide-y divide-gray-200">
                               <thead className="bg-gray-50">
                                   <tr>
                                       <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Topic</th>
                                       <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                       <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Author</th>
                                       <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Replies</th>
                                   </tr>
                               </thead>
                               <tbody className="bg-white divide-y divide-gray-200">
                                   {forumTopics.length === 0 && (
                                       <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-500 italic">No discussions yet. Start one!</td></tr>
                                   )}
                                   {forumTopics.map(topic => (
                                       <tr key={topic.id} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => setSelectedTopic(topic)}>
                                           <td className="px-6 py-4">
                                               <div className="text-sm font-medium text-brand-600 hover:underline">{topic.title}</div>
                                               <div className="text-xs text-gray-500 truncate max-w-md">{topic.content.substring(0, 60)}...</div>
                                           </td>
                                           <td className="px-6 py-4 whitespace-nowrap">
                                               <Badge color={topic.category === 'help' ? 'red' : topic.category === 'feedback' ? 'yellow' : 'blue'}>
                                                   {topic.category}
                                               </Badge>
                                           </td>
                                           <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                               {topic.authorName}
                                               <div className="text-xs text-gray-400">{new Date(topic.date).toLocaleDateString()}</div>
                                           </td>
                                           <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                               {topic.replies.length}
                                           </td>
                                       </tr>
                                   ))}
                               </tbody>
                           </table>
                       </div>
                   </>
               ) : (
                   // Topic Detail View
                   <div>
                       <button onClick={() => setSelectedTopic(null)} className="mb-4 text-sm text-brand-600 hover:underline flex items-center">
                           ← Back to Discussions
                       </button>
                       <Card className="mb-6">
                           <div className="flex justify-between items-start border-b pb-4 mb-4">
                               <div>
                                   <div className="flex items-center gap-2 mb-1">
                                       <h1 className="text-2xl font-bold text-gray-900">{selectedTopic.title}</h1>
                                       <Badge color="gray">{selectedTopic.category}</Badge>
                                   </div>
                                   <div className="text-sm text-gray-500">
                                       Started by <span className="font-medium text-gray-900">{selectedTopic.authorName}</span> on {new Date(selectedTopic.date).toLocaleDateString()}
                                   </div>
                               </div>
                           </div>
                           <div className="prose max-w-none text-gray-800 mb-8 whitespace-pre-line">
                               {selectedTopic.content}
                           </div>
                       </Card>

                       <h3 className="text-lg font-bold mb-4 px-1">{selectedTopic.replies.length} Replies</h3>
                       
                       <div className="space-y-4 mb-8">
                           {selectedTopic.replies.map(reply => (
                               <Card key={reply.id} className="bg-gray-50 border-none">
                                   <div className="flex justify-between items-start mb-2">
                                       <span className="font-bold text-sm">{reply.authorName}</span>
                                       <span className="text-xs text-gray-500">{new Date(reply.date).toLocaleString()}</span>
                                   </div>
                                   <p className="text-gray-700 whitespace-pre-line">{reply.content}</p>
                               </Card>
                           ))}
                       </div>

                       <Card className="border-brand-200 bg-brand-50">
                           <h4 className="font-bold text-sm mb-2 text-brand-800">Post a Reply</h4>
                           <textarea 
                               className="w-full border border-gray-300 rounded p-3 focus:ring-brand-500 focus:border-brand-500 mb-3" 
                               rows={3}
                               placeholder="Join the conversation..."
                               value={replyContent}
                               onChange={e => setReplyContent(e.target.value)}
                           />
                           <div className="flex justify-end">
                               <Button onClick={handlePostReply} disabled={!replyContent.trim()}>Reply</Button>
                           </div>
                       </Card>
                   </div>
               )}
           </div>
       )}

       {/* RESOURCES TAB */}
       {tab === 'resources' && (
           <div>
               <h2 className="text-2xl font-bold mb-6">Training & Resources</h2>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {resources.map(res => (
                       <Card key={res.id} className="flex flex-col h-full hover:shadow-md transition-shadow">
                           <div className="flex-1">
                               <div className="text-sm font-bold text-brand-600 uppercase tracking-wide mb-2">{res.type}</div>
                               <h3 className="text-xl font-bold mb-2">{res.title}</h3>
                               <p className="text-gray-600 mb-4">{res.description}</p>
                           </div>
                           <Button variant="secondary" className="w-full mt-4" onClick={() => alert("This is a prototype link.")}>View Resource</Button>
                       </Card>
                   ))}
               </div>
           </div>
       )}

       {/* MODALS */}
       <Modal isOpen={isAnnouncementModalOpen} onClose={() => setIsAnnouncementModalOpen(false)} title="Post Announcement">
           <div className="space-y-4">
               <Input label="Title" value={newAnnouncement.title} onChange={e => setNewAnnouncement({...newAnnouncement, title: e.target.value})} />
               <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                   <textarea 
                       className="w-full border border-gray-300 rounded p-2" 
                       rows={5}
                       value={newAnnouncement.content}
                       onChange={e => setNewAnnouncement({...newAnnouncement, content: e.target.value})}
                   />
               </div>
               <Button onClick={handleCreateAnnouncement} className="w-full">Post</Button>
           </div>
       </Modal>

       <Modal isOpen={isTopicModalOpen} onClose={() => setIsTopicModalOpen(false)} title="Start New Topic">
           <div className="space-y-4">
               <Input label="Topic Title" value={newTopic.title} onChange={e => setNewTopic({...newTopic, title: e.target.value})} />
               <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                   <select 
                       className="w-full border border-gray-300 rounded p-2"
                       value={newTopic.category}
                       onChange={e => setNewTopic({...newTopic, category: e.target.value as any})}
                   >
                       <option value="general">General Discussion</option>
                       <option value="help">Translation Help</option>
                       <option value="feedback">App Feedback</option>
                   </select>
               </div>
               <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                   <textarea 
                       className="w-full border border-gray-300 rounded p-2" 
                       rows={5}
                       value={newTopic.content}
                       onChange={e => setNewTopic({...newTopic, content: e.target.value})}
                   />
               </div>
               <Button onClick={handleCreateTopic} className="w-full">Create Topic</Button>
           </div>
       </Modal>
    </div>
  );
};