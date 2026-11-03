import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { auth, db } from '../firebase';
import PassportSection from './PassportSection';
import InternPassport from './InternPassport';
import PassportTrackSelector from './PassportTrackSelector';
import { getLearnerTrack } from '../utils/learnerIdentity';
import { saveInternEntry, subscribeInternEntries } from '../services/internPassportStore';

function ConnectedInternPassport({ user, userRole, userProfile }) {
  const isTeacher = ['teacher', 'admin'].includes(userRole);
  const [students, setStudents] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [listLoading, setListLoading] = useState(isTeacher);
  const [listError, setListError] = useState('');

  useEffect(() => {
    if (!isTeacher) return undefined;
    return onSnapshot(query(collection(db, 'users'), where('role', 'in', ['student', 'intern'])), snapshot => {
      const list = snapshot.docs.map(profile => ({ ...profile.data(), id: profile.id })).filter(profile => getLearnerTrack(profile) === 'intern').sort((a, b) => (a.displayName || '').localeCompare(b.displayName || '', 'zh-TW'));
      setStudents(list);
      setSelectedId(current => list.some(student => student.id === current) ? current : list[0]?.id || '');
      setListError('');
      setListLoading(false);
    }, () => { setListError('無法讀取實習生名單，請確認登入與資料庫權限。'); setListLoading(false); });
  }, [isTeacher]);

  const student = isTeacher ? students.find(profile => profile.id === selectedId) : getLearnerTrack({ ...userProfile, role: userRole }) === 'intern' ? { ...userProfile, id: user.uid } : null;
  return <>
    {isTeacher && <label className="ip-student-select">選擇實習生<select aria-label="選擇實習生" value={selectedId} onChange={event => setSelectedId(event.target.value)} disabled={listLoading || Boolean(listError)}>{!students.length && <option value="">{listLoading ? '載入中…' : '目前尚無實習生'}</option>}{students.map(profile => <option key={profile.id} value={profile.id}>{profile.displayName || profile.email}{profile.internshipCohort ? `（${profile.internshipCohort}）` : ''}</option>)}</select></label>}
    <InternRecords key={student?.id || 'empty'} student={student} user={user} userRole={userRole} listLoading={listLoading} listError={listError} />
  </>;
}

function InternRecords({ student, user, userRole, listLoading, listError }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(Boolean(student));
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const isTeacher = ['teacher', 'admin'].includes(userRole);
  useEffect(() => {
    if (!student?.id) return undefined;
    return subscribeInternEntries(db, student.id, records => {
      setEntries(records);
      setError('');
      setLoading(false);
      setHasLoaded(true);
    }, () => { setError('無法讀取實習護照，請確認登入權限與網路後重新整理。'); setConfirmed(false); setLoading(false); }, setConfirmed);
  }, [student?.id]);

  const saveEntry = async ({ kind, targetId, payload }) => {
    if (!confirmed) throw new Error('目前尚未確認最新紀錄，請等候連線恢復後再儲存。');
    if (!auth.currentUser || auth.currentUser.uid !== user.uid || !student?.id) throw new Error('登入身分已變更，請重新整理後再試。');
    try {
      return await saveInternEntry(db, auth.currentUser, student.id, { kind, targetId, payload });
    } catch (failure) { throw new Error(failure.code === 'permission-denied' ? '無法儲存，請確認學員身分及資料庫權限。表單內容仍保留。' : failure.message || '儲存未完成，請稍後重試。'); }
  };
  return <InternPassport currentUserName={user.displayName || user.email} student={student ? { ...student, viewerRole: userRole } : null} entries={entries} isTeacher={isTeacher} isSelf={!isTeacher && user.uid === student?.id} onSave={saveEntry} loading={listLoading || loading} error={listError || error || (hasLoaded && !confirmed ? '目前無法確認最新紀錄，正在重新連線；連線恢復後即可填寫。' : '')} />;
}

export default function LearningPassportSection(props) {
  const isTeacher = ['teacher', 'admin'].includes(props.userRole);
  const [track, setTrack] = useState(new URLSearchParams(window.location.search).get('passportTrack') === 'intern' ? 'intern' : 'pgy');
  const changeTrack = nextTrack => {
    setTrack(nextTrack);
    const url = new URL(window.location.href);
    url.searchParams.set('passportTrack', nextTrack);
    window.history.replaceState(null, '', url);
  };
  if (getLearnerTrack({ ...props.userProfile, role: props.userRole }) === 'intern') return <ConnectedInternPassport {...props} />;
  if (!isTeacher) return props.userRole === 'student' ? <PassportSection {...props} /> : null;
  return <>
    <PassportTrackSelector track={track} onChange={changeTrack} />
    {track === 'intern' ? <ConnectedInternPassport {...props} /> : <PassportSection {...props} />}
  </>;
}
