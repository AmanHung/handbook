import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, serverTimestamp, getFirestore, terminate } from 'firebase/firestore';
import { getApps } from 'firebase/app';

let env;
const context = (uid, email = `${uid}@example.test`) => env.authenticatedContext(uid, { email, firebase: { sign_in_provider: 'google.com' } });
const audit = uid => ({ updatedByUid: uid, updatedByEmail: `${uid}@example.test`, updatedByName: '測試帳號', updatedAt: serverTimestamp() });

before(async () => {
  if (!process.env.PASSPORT_RULES_FILE || !process.env.FIRESTORE_EMULATOR_HOST?.startsWith('127.0.0.1:')) throw new Error('僅接受明確指定的候選規則與本機模擬器。');
  const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
  env = await initializeTestEnvironment({ projectId: 'demo-handbook-integration', firestore: { host, port: Number(port), rules: await readFile(process.env.PASSPORT_RULES_FILE, 'utf8') } });
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx => {
    for (const [uid, role] of [['student', 'student'], ['teacher', 'teacher']]) await setDoc(doc(ctx.firestore(), 'users', uid), { role, email: `${uid}@example.test` });
    await setDoc(doc(ctx.firestore(), 'sop_articles', 'existing'), { title: '既有共用教材' });
  });
});
after(async () => { await Promise.all(getApps().map(app => terminate(getFirestore(app)))); if (env) await env.cleanup(); });

test('合併規則保留既有 SOP、影音、訓練連結與設定的有效編修及公開讀取', async () => {
  const db = context('teacher').firestore();
  for (const name of ['sop_articles', 'training_videos', 'training_sop_links', 'site_settings']) {
    await assertSucceeds(setDoc(doc(db, name, 'compat-test'), { title: '虛構相容性測試', ...audit('teacher') }));
    await assertFails(setDoc(doc(db, name, 'invalid-audit'), { title: '缺少身分稽核' }));
    await assertSucceeds(getDoc(doc(env.unauthenticatedContext().firestore(), name, 'compat-test')));
  }
});

test('合併規則保留 PGY 舊學習紀錄與共用閱讀確認，拒絕未登入的修改', async () => {
  const db = context('student').firestore();
  await assertSucceeds(setDoc(doc(db, 'users', 'student', 'learning_records', 'old-contract'), { note: 'PGY 舊紀錄契約' }));
  const receipt = { studentUid: 'student', studentEmail: 'student@example.test', studentName: '測試學員', sopId: 'existing', sopTitleSnapshot: '既有共用教材', sopVersion: 0, confirmedAt: serverTimestamp() };
  await assertSucceeds(setDoc(doc(db, 'sop_read_receipts', 'student%40example.test__existing'), receipt));
  await assertFails(setDoc(doc(env.unauthenticatedContext().firestore(), 'sop_read_receipts', 'anonymous'), receipt));
  await assertFails(setDoc(doc(env.unauthenticatedContext().firestore(), 'sop_articles', 'anonymous'), { ...audit('student') }));
});

test('合併規則保留既有指定管理員，並且沒有開放未知集合', async () => {
  const adminDb = context('owner', 'obm0304@gmail.com').firestore();
  await assertSucceeds(setDoc(doc(adminDb, 'users', 'student'), { email: 'student@example.test', role: 'student', trainingType: 'intern', updatedByUid: 'owner', updatedByEmail: 'obm0304@gmail.com', updatedByName: '測試管理者', updatedAt: serverTimestamp() }));
  assert.equal((await getDoc(doc(adminDb, 'users', 'student'))).data().trainingType, 'intern');
  await assertFails(setDoc(doc(context('teacher').firestore(), 'unknown_collection', 'x'), { value: '不可寫入' }));
});
