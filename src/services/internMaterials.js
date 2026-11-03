import { collection, doc, getDocFromServer, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { getLearnerTrack } from '../utils/learnerIdentity.js';

export const getSopVersion = sop => {
  const value = sop?.updatedAt || sop?.createdAt;
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (value.seconds) return value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1000000);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};
export const toSopReadEntry = receipt => {
  const timestamp = receipt.confirmedAt;
  const date = timestamp?.toDate?.() || (timestamp?.seconds ? new Date(timestamp.seconds * 1000) : null);
  return { id: `sop-read:${receipt.id}`, source: 'sop_read_receipts', kind: 'materialRead', targetId: receipt.sopId, actorName: receipt.studentName || receipt.studentEmail, actorUid: receipt.studentUid, createdAt: timestamp, payload: { date: date ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date) : '', note: 'SOP 最新閱讀確認，與教師評核分開記錄。', title: receipt.sopTitleSnapshot, sopVersion: receipt.sopVersion } };
};
export const subscribeInternSopReads = (db, uid, onData, onError, onServerState) => onSnapshot(query(collection(db, 'sop_read_receipts'), where('studentUid', '==', uid)), { includeMetadataChanges: true }, snapshot => {
  if (snapshot.metadata.fromCache) { onServerState?.(false); return; }
  onData(snapshot.docs.filter(record => !record.metadata.hasPendingWrites).map(record => ({ ...record.data(), id: record.id })).sort((a, b) => (a.confirmedAt?.toMillis?.() || 0) - (b.confirmedAt?.toMillis?.() || 0)));
  onServerState?.(true);
}, onError);
export async function confirmInternSopRead(db, user, studentUid, sop) {
  if (!user?.uid || !user.email || user.uid !== studentUid) throw new Error('只能確認自己的教材閱讀。');
  const [profile, currentSop] = await Promise.all([getDocFromServer(doc(db, 'users', user.uid)), getDocFromServer(doc(db, 'sop_articles', sop.id))]);
  if (!profile.exists() || getLearnerTrack(profile.data()) !== 'intern') throw new Error('此帳號不是實習生。');
  if (!currentSop.exists()) throw new Error('這份 SOP 已不存在，請通知管理者。');
  if (getSopVersion(currentSop.data()) !== getSopVersion(sop)) throw new Error('教材已更新，請重新開啟閱讀後再確認。');
  return setDoc(doc(db, 'sop_read_receipts', `${encodeURIComponent(user.email)}__${sop.id}`), {
    studentUid: user.uid, studentEmail: user.email, studentName: profile.data().displayName || user.displayName || user.email,
    sopId: sop.id, sopTitleSnapshot: currentSop.data().title || '', sopVersion: getSopVersion(currentSop.data()), confirmedAt: serverTimestamp(),
  });
}
