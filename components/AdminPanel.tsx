import React, { useState } from 'react';
import { Sentence, Translation } from '../types';
import { Button, Card, Input } from './UI';
import { StorageService } from '../services/storageService';

export const AdminPanel: React.FC<{ onImportSentences: Function, sentences: Sentence[], translations: Translation[], onClearAll: Function }> = ({ onImportSentences, onClearAll }) => {
  const [tab, setTab] = useState('users');
  const [users] = useState(StorageService.getAllUsers());
  const [settings, setSettings] = useState(StorageService.getSystemSettings());

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
              const json = JSON.parse(ev.target?.result as string);
              onImportSentences(json.map((x: any) => ({ id: x.id, english: x.english || x.sentence })));
              alert('Imported');
          };
          reader.readAsText(file);
      }
  };

  const saveSettings = () => { StorageService.saveSystemSettings(settings); alert('Saved'); };

  return (
    <div className="flex">
       <aside className="w-64 p-4 border-r min-h-screen">
          <button className="block w-full text-left p-2 hover:bg-gray-100" onClick={() => setTab('users')}>Users</button>
          <button className="block w-full text-left p-2 hover:bg-gray-100" onClick={() => setTab('data')}>Data</button>
          <button className="block w-full text-left p-2 hover:bg-gray-100" onClick={() => setTab('settings')}>Settings</button>
       </aside>
       <main className="flex-1 p-6">
          {tab === 'users' && (
              <Card>
                 <h3 className="font-bold mb-4">Users</h3>
                 <ul>{users.map(u => <li key={u.id} className="border-b p-2">{u.name} ({u.email}) - {u.role}</li>)}</ul>
              </Card>
          )}
          {tab === 'data' && (
              <Card>
                 <h3 className="font-bold mb-4">Import/Export</h3>
                 <input type="file" onChange={handleImport} />
                 <div className="mt-4"><Button variant="danger" onClick={() => onClearAll()}>Clear All Data</Button></div>
              </Card>
          )}
          {tab === 'settings' && (
              <Card>
                 <h3 className="font-bold mb-4">Settings</h3>
                 <Input label="Gemini API Key" value={settings.geminiApiKey} onChange={e => setSettings({...settings, geminiApiKey: e.target.value})} />
                 <Button onClick={saveSettings} className="mt-4">Save</Button>
              </Card>
          )}
       </main>
    </div>
  );
};