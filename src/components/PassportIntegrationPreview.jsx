import { useMemo, useState } from 'react';
import { BookOpen } from 'lucide-react';
import AdminPage from './AdminPage';
import PassportTrackSelector from './PassportTrackSelector';
import PassportSection from './PassportSection';
import InternPassport from './InternPassport';
import { demoStudent, demoEntries } from '../dev/passportFixtures';
import { createPgyPassportFixture } from '../dev/pgyPassportFixture';
import { getSiteNavigation } from '../data/siteNavigation';
import { getSopVersion, toSopReadEntry } from '../services/internMaterials';

export default function PassportIntegrationPreview() {
  const [section, setSection] = useState(new URLSearchParams(window.location.search).get('workspace') === 'admin' ? 'admin' : 'passport');
  const [track, setTrack] = useState('intern');
  const [role, setRole] = useState('teacher');
  const [selectedIntern, setSelectedIntern] = useState(demoStudent.id);
  const [entriesByStudent, setEntriesByStudent] = useState(() => ({ [demoStudent.id]: demoEntries(), 'preview-intern-b': [] }));
  const [readsByStudent, setReadsByStudent] = useState({ 'preview-intern': [], 'preview-intern-b': [] });
  const pgyRuntime = useMemo(createPgyPassportFixture, []);
  const interns = useMemo(() => [{ ...demoStudent, role: 'student', trainingType: 'intern', email: 'intern-a@example.test' }, { ...demoStudent, id: 'preview-intern-b', role: 'student', trainingType: 'intern', email: 'intern-b@example.test', displayName: '林同學（示範）', internshipCohort: '115 年冬季實習' }], []);
  const library = useMemo(() => ({ sops: [...Object.values(pgyRuntime.sops).map(sop => ({ ...sop, category: '門診作業' })), { id: 'demo-vaccine-sop', title: '疫苗管理流程（示範教材）', category: '門診作業', content: '此為疫苗管理教材的示範文件。正式作業請閱讀院內現行 SOP，並接受指導藥師評核。', updatedAt: { seconds: 1790000000 } }], settings: { quickKeywords: [], categories: ['門診作業'] }, pgyDashboard: { status: 'success', epa: [], dops: [], minicex: [], osce: [], ksa: [], final: {} } }), [pgyRuntime]);
  const [links, setLinks] = useState(() => ({ ...pgyRuntime.links, intern_opd_10: { sopIds: ['demo-vaccine-sop'] } }));
  const [videos, setVideos] = useState([{ id: 'demo-vaccine-video', title: '疫苗管理教學影片（示範連結）', category: '門診作業', url: 'https://example.com/pharmacy-training', trainingItemIds: ['intern_opd_10'] }]);
  const student = interns.find(profile => profile.id === selectedIntern);
  const user = role === 'student' ? track === 'intern' ? { uid: student.id, email: student.email, displayName: student.displayName } : { uid: 'pgy-preview-a', email: 'pgy-a@example.test', displayName: '王藥師（示範）' } : { uid: 'teacher-preview', email: 'teacher@example.test', displayName: '示範指導藥師' };
  const users = useMemo(() => [...interns, ...pgyRuntime.students, { id: 'teacher-preview', email: 'teacher@example.test', displayName: '示範指導藥師', role: 'teacher' }], [interns, pgyRuntime]);
  const saveEntry = async (uid, entry) => {
    const saved = { ...entry, planVersion: '11409', studentUid: uid, id: crypto.randomUUID(), actorName: role === 'student' ? interns.find(profile => profile.id === uid)?.displayName : user.displayName, actorUid: user.uid, createdAt: { seconds: Date.now() / 1000 } };
    setEntriesByStudent(current => ({ ...current, [uid]: [...(current[uid] || []), saved] }));
    return saved;
  };
  const combinedEntries = useMemo(() => Object.fromEntries(interns.map(profile => [profile.id, [...(entriesByStudent[profile.id] || []), ...(readsByStudent[profile.id] || []).map(toSopReadEntry)]])), [interns, entriesByStudent, readsByStudent]);
  const previewData = {
    ...library, users, trainingItems: pgyRuntime.items, initialTrack: track, links, videos,
    internEntriesByStudent: combinedEntries, internReadsByStudent: readsByStudent,
    onSaveInternEntry: saveEntry,
    onSaveLinks: async (target, type, ids) => {
      if (type === 'sop') setLinks(current => ({ ...current, [target.id]: { sopIds: [...ids], trainingTitle: target.title } }));
      else setVideos(current => current.map(video => ({ ...video, trainingItemIds: [...new Set([...(video.trainingItemIds || []).filter(id => !target.items.some(item => item.id === id)), ...(ids.includes(video.id) ? [target.id] : [])])] })));
    },
    onConfirmSopRead: async (uid, sop) => setReadsByStudent(current => ({ ...current, [uid]: [...(current[uid] || []).filter(receipt => receipt.sopId !== sop.id), { id: `${uid}__${sop.id}`, studentUid: uid, studentEmail: interns.find(profile => profile.id === uid)?.email, studentName: interns.find(profile => profile.id === uid)?.displayName, sopId: sop.id, sopTitleSnapshot: sop.title, sopVersion: getSopVersion(sop), confirmedAt: { seconds: Date.now() / 1000 } }] })),
  };
  const openSection = next => {
    setSection(next);
    const url = new URL(window.location.href);
    url.searchParams.set('workspace', next);
    window.history.replaceState(null, '', url);
  };
  return <div className="min-h-screen bg-gray-50">
    <header className="bg-white border-b border-indigo-100"><div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center gap-4"><BookOpen className="text-indigo-600 w-7 h-7" /><strong className="text-lg text-gray-800">藥師導航系統</strong><nav aria-label="網站主選單" className="flex gap-4 flex-wrap ml-auto">{getSiteNavigation(role).map(item => <a key={item.id} className={`text-sm ${item.id === section ? 'font-bold text-indigo-700' : 'text-gray-500'}`} aria-current={item.id === section ? 'page' : undefined} onClick={event => { if (['passport', 'admin'].includes(item.id)) { event.preventDefault(); openSection(item.id); } }} href={`${import.meta.env.BASE_URL}?section=${item.id}`}>{item.label}</a>)}</nav></div></header>
    <main className="max-w-7xl mx-auto py-6 sm:px-6"><div className="mx-4 mb-5 p-3 bg-amber-50 border border-amber-100 rounded-lg flex flex-wrap items-center justify-between gap-3 text-sm text-amber-800"><p>整合預覽：前台與後台共用示範資料，不寫入正式資料庫；重新整理會還原。</p><label>檢視身分<select aria-label="整合預覽身分" className="ml-2 border rounded p-1 bg-white" value={role} onChange={event => { setRole(event.target.value); if (event.target.value === 'student') openSection('passport'); }}><option value="teacher">指導藥師</option><option value="student">學員</option></select></label></div>
      {section === 'admin' && role === 'teacher' ? <AdminPage user={user} userRole={role} previewFixture={previewData} /> : <>
        {role === 'teacher' && <PassportTrackSelector track={track} onChange={setTrack} />}
        {track === 'intern' ? <>{role !== 'student' && <label className="ip-student-select">選擇實習生<select aria-label="選擇實習生" value={selectedIntern} onChange={event => setSelectedIntern(event.target.value)}>{interns.map(profile => <option key={profile.id} value={profile.id}>{profile.displayName}</option>)}</select></label>}<InternPassport key={`${student.id}:${role}`} student={{ ...student, viewerRole: role }} initialTab="training" entries={entriesByStudent[student.id]} isTeacher={role === 'teacher'} isSelf={role === 'student'} hidePreviewNotice materialPreview={previewData} onSave={entry => saveEntry(student.id, entry)} currentUserName={user.displayName} preview /></> : <PassportSection key={role} user={user} userRole={role} userProfile={{ ...user, role }} previewFixture={pgyRuntime} />}
      </>}
    </main>
  </div>;
}
