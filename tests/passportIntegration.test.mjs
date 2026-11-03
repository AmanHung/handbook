import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { addDoc, collection, deleteDoc, doc, getDoc, serverTimestamp, setDoc, updateDoc, Timestamp, disableNetwork, enableNetwork, terminate, getFirestore } from 'firebase/firestore';
import { getApps } from 'firebase/app';
import { readFile } from 'node:fs/promises';
import { saveInternEntry, readInternEntries, subscribeInternEntries } from '../src/services/internPassportStore.js';
import { confirmInternSopRead, subscribeInternSopReads, toSopReadEntry } from '../src/services/internMaterials.js';
import { summarizeIntern } from '../src/utils/internAdmin.js';
import { subscribeInternWorkspace } from '../src/services/internWorkspace.js';

let env;
const email = uid => `${uid}@example.test`;
const context = uid => env.authenticatedContext(uid, { email: email(uid), firebase: { sign_in_provider: 'google.com' } });
const user = uid => ({ uid, email: email(uid), displayName: `測試帳號 ${uid}` });
const audit = uid => ({ updatedByUid: uid, updatedByEmail: email(uid), updatedByName: `測試帳號 ${uid}`, updatedAt: serverTimestamp() });
const training = status => ({ kind: 'training', targetId: 'intern_opd_01', payload: { date: '2026-11-03', note: '', status } });
const rawEntry = (actor, entry = training('pass'), studentUid = 'intern1') => ({ ...entry, studentUid, planVersion: '11409', actorUid: actor, actorEmail: email(actor), actorName: `測試帳號 ${actor}`, createdAt: serverTimestamp() });

before(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST?.startsWith('127.0.0.1:')) throw new Error('整合測試只允許使用本機 Firestore 模擬器。');
  const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
  env = await initializeTestEnvironment({ projectId: 'demo-handbook-integration', firestore: { host, port: Number(port), rules: await readFile(new URL('../backend/integration-tests/firestore.rules', import.meta.url), 'utf8') } });
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx => {
    for (const [uid, fields] of Object.entries({ intern1: { role: 'intern' }, intern2: { role: 'student', trainingType: 'intern' }, pgy1: { role: 'student' }, teacher1: { role: 'teacher' }, admin1: { role: 'admin' }, member1: { role: 'member' } })) {
      await setDoc(doc(ctx.firestore(), 'users', uid), { email: email(uid), displayName: `測試帳號 ${uid}`, ...fields });
    }
    await setDoc(doc(ctx.firestore(), 'sop_articles', 'vaccine'), { title: '測試疫苗 SOP', content: '虛構測試教材', updatedAt: Timestamp.fromMillis(1000) });
  });
});
after(async () => {
  // 規則測試套件的 cleanup 不會等待 app.delete；重連測試須明確等待串流關閉。
  await Promise.all(getApps().map(app => terminate(getFirestore(app))));
  if (env) await env.cleanup();
});

test('教師評核儲存程式可寫入模擬資料庫；新的學生連線能讀回結果，重評保留歷次紀錄', async () => {
  const teacherDb = context('teacher1').firestore();
  const saved = await saveInternEntry(teacherDb, user('teacher1'), 'intern1', training('pass'));
  const firstSession = context('intern1').firestore();
  const first = await readInternEntries(firstSession, 'intern1');
  assert.equal(first.length, 1);
  assert.equal(first[0].id, saved.id);
  assert.equal(first[0].actorUid, 'teacher1');
  assert.ok(first[0].createdAt.toMillis() > 0);
  await firstSession.terminate();
  await saveInternEntry(teacherDb, user('teacher1'), 'intern1', training('reinforce'));
  const freshSession = context('intern1').firestore();
  const history = await readInternEntries(freshSession, 'intern1');
  assert.equal(history.length, 2);
  assert.deepEqual(history.map(entry => entry.payload.status), ['pass', 'reinforce']);
});

test('新型 student＋intern 帳號也可讀寫學生表單，教師不能代填學生回饋', async () => {
  const db = context('intern2').firestore();
  await saveInternEntry(db, user('intern2'), 'intern2', { kind: 'osceFeedback', targetId: 'phone', payload: { date: '2026-11-03', note: '測試操作心得' } });
  assert.equal((await readInternEntries(context('intern2').firestore(), 'intern2')).length, 1);
  await assertFails(addDoc(collection(context('teacher1').firestore(), 'intern_passports', 'intern2', 'entries'), rawEntry('teacher1', { kind: 'osceFeedback', targetId: 'phone', payload: { date: '2026-11-03', note: '不允許代填' } }, 'intern2')));
});

test('學生即使繞過畫面直接呼叫資料庫，也不能自評通過或讀取其他學生紀錄', async () => {
  for (const uid of ['intern1', 'intern2']) {
    const db = context(uid).firestore();
    await assertFails(addDoc(collection(db, 'intern_passports', uid, 'entries'), rawEntry(uid, training('pass'), uid)));
  }
  await assert.rejects(readInternEntries(context('intern2').firestore(), 'intern1'), /permission|權限|Missing/i);
  await assert.rejects(saveInternEntry(context('intern1').firestore(), user('intern1'), 'intern1', training('pass')), /身分/);
  await assert.rejects(saveInternEntry(context('teacher1').firestore(), user('teacher1'), 'pgy1', training('pass')), /未指定為實習生/);
});

test('學生可送出完整自評問卷及成果，資料庫會拒絕未填完整的問卷', async () => {
  const db = context('intern2').firestore();
  const payload = { date: '2026-11-03', note: '', teacher: '', ratings: Object.fromEntries(Array.from({ length: 12 }, (_, index) => [index, 5])) };
  await saveInternEntry(db, user('intern2'), 'intern2', { kind: 'feedback', targetId: 'self', payload });
  await saveInternEntry(db, user('intern2'), 'intern2', { kind: 'deliverable', targetId: 'literature', payload: { date: '2026-11-03', note: '示範文獻摘要', url: '' } });
  await assertFails(addDoc(collection(db, 'intern_passports', 'intern2', 'entries'), rawEntry('intern2', { kind: 'feedback', targetId: 'self', payload: { ...payload, ratings: {} } }, 'intern2')));
  const records = await readInternEntries(context('intern2').firestore(), 'intern2');
  assert.ok(records.some(record => record.kind === 'feedback' && record.payload.ratings['0'] === 5));
  assert.ok(records.some(record => record.kind === 'deliverable'));
});

test('實際評核者與伺服器時間不可偽造，已保存紀錄不能覆寫或刪除', async () => {
  const db = context('teacher1').firestore();
  const path = collection(db, 'intern_passports', 'intern1', 'entries');
  await assertFails(addDoc(path, { ...rawEntry('teacher1'), actorUid: 'admin1' }));
  await assertFails(addDoc(path, { ...rawEntry('teacher1'), createdAt: new Date('2020-01-01') }));
  const existing = (await readInternEntries(db, 'intern1'))[0];
  await assertFails(updateDoc(doc(path, existing.id), { 'payload.status': 'pass' }));
  await assertFails(deleteDoc(doc(path, existing.id)));
  await assertFails(addDoc(path, rawEntry('teacher1', { kind: 'signoff', targetId: 'overall', payload: { date: '2026-11-03', note: '' } })));
});

test('只有管理員可以變更學員類型；學生不能升權，舊 PGY 帳號仍可改姓名', async () => {
  const db = context('pgy1').firestore();
  await assertFails(updateDoc(doc(db, 'users', 'pgy1'), { trainingType: 'intern', ...audit('pgy1') }));
  await assertFails(updateDoc(doc(db, 'users', 'pgy1'), { role: 'admin', ...audit('pgy1') }));
  await assertSucceeds(updateDoc(doc(db, 'users', 'pgy1'), { displayName: '修改後的測試姓名', ...audit('pgy1') }));
  await assertFails(updateDoc(doc(context('teacher1').firestore(), 'users', 'pgy1'), { trainingType: 'intern', ...audit('teacher1') }));
  const adminDb = context('admin1').firestore();
  await assertSucceeds(updateDoc(doc(adminDb, 'users', 'pgy1'), { trainingType: 'intern', ...audit('admin1') }));
  assert.equal((await getDoc(doc(db, 'users', 'pgy1'))).data().trainingType, 'intern');
  await assertSucceeds(updateDoc(doc(adminDb, 'users', 'pgy1'), { trainingType: 'pgy', ...audit('admin1') }));
  const freshDb = context('newstudent').firestore();
  await assertFails(setDoc(doc(freshDb, 'users', 'newstudent'), { role: 'student', trainingType: 'intern', email: email('newstudent'), ...audit('newstudent') }));
});

test('教師權限被撤銷後，即使沿用同一連線也無法新增評核', async () => {
  const teacherDb = context('teacher1').firestore();
  await env.withSecurityRulesDisabled(ctx => updateDoc(doc(ctx.firestore(), 'users', 'teacher1'), { role: 'member' }));
  await assertFails(addDoc(collection(teacherDb, 'intern_passports', 'intern1', 'entries'), rawEntry('teacher1')));
  await env.withSecurityRulesDisabled(ctx => updateDoc(doc(ctx.firestore(), 'users', 'teacher1'), { role: 'teacher' }));
});

test('即時讀取只回報伺服器確認後的紀錄', async () => {
  const db = context('teacher1').firestore();
  const observed = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { stop(); reject(new Error('等待伺服器紀錄逾時')); }, 8000);
    const stop = subscribeInternEntries(db, 'intern2', entries => {
      if (entries.some(entry => entry.kind === 'training' && entry.targetId === 'intern_opd_02')) { clearTimeout(timeout); stop(); resolve(entries); }
    }, failure => { clearTimeout(timeout); stop(); reject(failure); });
  });
  await saveInternEntry(db, user('teacher1'), 'intern2', { ...training('pass'), targetId: 'intern_opd_02' });
  const result = await observed;
  assert.ok(result.find(entry => entry.kind === 'training').createdAt.toMillis() > 0);
});

test('實習生閱讀沿用 PGY 收據格式；後台取得伺服器確認資料，閱讀不等於評核通過', async () => {
  const studentDb = context('intern2').firestore();
  const observed = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { stop(); reject(new Error('等待閱讀確認逾時')); }, 8000);
    const stop = subscribeInternSopReads(context('teacher1').firestore(), 'intern2', values => {
      if (values.some(value => value.sopId === 'vaccine')) { clearTimeout(timeout); stop(); resolve(values); }
    }, failure => { clearTimeout(timeout); stop(); reject(failure); });
  });
  await confirmInternSopRead(studentDb, user('intern2'), 'intern2', { id: 'vaccine', updatedAt: { seconds: 1 } });
  const receipts = await observed;
  assert.equal(receipts[0].id, `${encodeURIComponent(email('intern2'))}__vaccine`);
  assert.equal(receipts[0].studentUid, 'intern2');
  assert.equal(receipts[0].sopTitleSnapshot, '測試疫苗 SOP');
  assert.equal(receipts[0].sopVersion, 1000);
  assert.ok(receipts[0].confirmedAt.toMillis() > 0);
  assert.equal(summarizeIntern({ id: 'intern2' }, receipts.map(toSopReadEntry)).progress.complete, 0);
});

test('拒絕代填閱讀、舊教材版本及覆寫其他學生的閱讀確認', async () => {
  await assert.rejects(confirmInternSopRead(context('teacher1').firestore(), user('teacher1'), 'intern2', { id: 'vaccine' }), /自己的/);
  await assert.rejects(confirmInternSopRead(context('intern1').firestore(), user('intern1'), 'intern1', { id: 'vaccine', updatedAt: { seconds: 0 } }), /教材已更新/);
  await assert.rejects(confirmInternSopRead(context('pgy1').firestore(), user('pgy1'), 'pgy1', { id: 'vaccine' }), /不是實習生/);
  const receiptPath = doc(context('intern1').firestore(), 'sop_read_receipts', `${encodeURIComponent(email('intern2'))}__vaccine`);
  await assertFails(setDoc(receiptPath, { studentUid: 'intern1', studentEmail: email('intern1'), confirmedAt: serverTimestamp() }));
});

test('後台斷線後停止使用舊資料，重連時須重新取得評核及閱讀確認', async () => {
  const db = context('teacher1').firestore();
  const states = [];
  const waiters = [];
  const waitFor = predicate => new Promise((resolve, reject) => {
    const existing = states.at(-1);
    if (existing && predicate(existing)) return resolve(existing);
    const waiter = { predicate, resolve, timer: null };
    waiter.timer = setTimeout(() => { waiters.splice(waiters.indexOf(waiter), 1); reject(new Error('等候連線狀態逾時')); }, 8000);
    waiters.push(waiter);
  });
  const stop = subscribeInternWorkspace(db, 'intern2', state => {
    states.push(state);
    for (const waiter of [...waiters]) if (waiter.predicate(state)) {
      clearTimeout(waiter.timer); waiters.splice(waiters.indexOf(waiter), 1); waiter.resolve(state);
    }
  });
  try {
    const ready = await waitFor(state => state.status === 'ready');
    assert.ok(ready.entries.some(entry => entry.kind === 'training'));
    assert.ok(ready.entries.some(entry => entry.kind === 'materialRead'));
    await disableNetwork(db);
    await waitFor(state => state.status === 'reconnecting');
    assert.notEqual(states.at(-1).status, 'ready');
    await enableNetwork(db);
    await waitFor(state => state.status === 'ready');
  } finally {
    stop();
    waiters.forEach(waiter => clearTimeout(waiter.timer));
    await db.terminate();
  }
});
