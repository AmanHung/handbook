import { useState } from 'react';
import InternPassport from './InternPassport';
import { demoStudent, demoEntries } from '../dev/passportFixtures';

// 僅由 DEV 入口載入；無登入、無雲端讀寫，與正式畫面共用同一表單。
export default function InternPassportPreview() {
  const [role, setRole] = useState(new URLSearchParams(window.location.search).get('role') === 'teacher' ? 'teacher' : 'student');
  const [entries, setEntries] = useState(demoEntries);
  const save = async entry => setEntries(current => [...current, { ...entry, payload: entry.kind === 'signoff' ? { ...entry.payload, reviewedEntryIds: current.filter(record => record.kind !== 'signoff').map(record => record.id).sort() } : entry.payload, id: crypto.randomUUID(), actorName: role === 'student' ? '陳同學' : '示範指導藥師', createdAt: { seconds: Date.now() / 1000 } }]);
  return <div style={{ background: '#f4f7fa', minHeight: '100vh', paddingBottom: 25 }}><div className="ip-preview-toolbar"><span>實習生護照・互動設計稿</span><label>檢視身分<select aria-label="檢視身分" value={role} onChange={event => setRole(event.target.value)}><option value="student">實習生</option><option value="teacher">指導藥師</option><option value="admin">教學負責人</option></select></label></div><InternPassport initialTab="training" currentUserName="示範指導藥師" key={role} student={{ ...demoStudent, viewerRole: role }} entries={entries} onSave={save} isTeacher={role !== 'student'} isSelf={role === 'student'} preview /></div>;
}
