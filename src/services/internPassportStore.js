import { addDoc, collection, doc, getDocFromServer, getDocsFromServer, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { INTERN_PLAN_VERSION, getCompletionChecks, getLatestEntries } from '../data/internPassport.js';
import { getLearnerTrack, isTeachingRole } from '../utils/learnerIdentity.js';
import { validateInternEntry } from '../utils/internPassportValidation.js';

const entriesRef = (db, uid) => collection(db, 'intern_passports', uid, 'entries');
export const sortInternEntries = entries => [...entries].sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0) || a.id.localeCompare(b.id));
export const readInternEntries = async (db, uid) => sortInternEntries((await getDocsFromServer(entriesRef(db, uid))).docs.map(record => ({ ...record.data(), id: record.id })));
export const subscribeInternEntries = (db, uid, onData, onError, onServerState) => onSnapshot(entriesRef(db, uid), { includeMetadataChanges: true }, snapshot => {
  // 尚未得到伺服器確認的紀錄不列為評核完成。
  if (snapshot.metadata.fromCache) { onServerState?.(false); return; }
  onData(sortInternEntries(snapshot.docs.filter(record => !record.metadata.hasPendingWrites).map(record => ({ ...record.data(), id: record.id }))));
  onServerState?.(true);
}, onError);

export async function saveInternEntry(db, authenticatedUser, studentUid, entry) {
  if (!authenticatedUser?.uid || !authenticatedUser.email || !studentUid) throw new Error('登入身分不完整，請重新登入。');
  const [actorDoc, studentDoc] = await Promise.all([
    getDocFromServer(doc(db, 'users', authenticatedUser.uid)),
    getDocFromServer(doc(db, 'users', studentUid)),
  ]);
  if (!actorDoc.exists() || !studentDoc.exists()) throw new Error('找不到學員或評核者資料。');
  const actor = actorDoc.data();
  if (getLearnerTrack(studentDoc.data()) !== 'intern') throw new Error('此學員目前未指定為實習生。');
  const isTeacher = isTeachingRole(actor.role);
  if (!isTeacher && (authenticatedUser.uid !== studentUid || getLearnerTrack(actor) !== 'intern')) throw new Error('只能填寫自己的實習紀錄。');
  if (entry.kind === 'signoff' && actor.role !== 'admin') throw new Error('結訓確認須由教學負責人執行。');
  const payload = validateInternEntry(entry.kind, entry.targetId, entry.payload, isTeacher);
  if (entry.kind === 'signoff') {
    const entries = await readInternEntries(db, studentUid);
    if (!getCompletionChecks(getLatestEntries(entries)).every(check => check.done)) throw new Error('結訓檢核尚未全部完成，請重新載入確認。');
    payload.reviewedEntryIds = entries.filter(record => record.kind !== 'signoff').map(record => record.id).sort();
  }
  return addDoc(entriesRef(db, studentUid), {
    planVersion: INTERN_PLAN_VERSION, studentUid, kind: entry.kind, targetId: entry.targetId, payload,
    actorUid: authenticatedUser.uid, actorEmail: authenticatedUser.email,
    actorName: actor.displayName || authenticatedUser.displayName || authenticatedUser.email,
    createdAt: serverTimestamp(),
  });
}
