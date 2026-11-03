import test from 'node:test';
import assert from 'node:assert/strict';
import { buildInternTrainingItems, summarizeIntern, buildInternExport, buildInternRecordsCsv, getInternRecordTitle } from '../src/utils/internAdmin.js';
import { toSopReadEntry, getSopVersion } from '../src/services/internMaterials.js';
import { INTERN_BASE_ITEMS, INTERN_DOMAINS, INTERN_OSCE_STATIONS, SAFETY_ITEMS, SCORE_DEPARTMENTS, SCORE_DIMENSIONS } from '../src/data/internPassport.js';

const student = { id: 'a', displayName: '=示範學員', school: '示範大學', internshipCohort: '秋季' };
const entry = (id, kind, targetId, payload, seconds = 1) => ({ id, kind, targetId, payload: { date: '2026-11-03', ...payload }, createdAt: { seconds }, actorUid: 'teacher', actorName: '測試教師' });

test('後台教材目錄含 66 個唯一實習生 ID，並以核心 50 項計算進度', () => {
  const catalog = buildInternTrainingItems();
  assert.equal(catalog.length, 66);
  assert.equal(new Set(catalog.map(item => item.id)).size, 66);
  assert.ok(catalog.every(item => item.id.startsWith('intern_') && item.category_id.startsWith('intern_')));
  const entries = [entry('first', 'training', INTERN_BASE_ITEMS[0].id, { status: 'reinforce' }), entry('retest', 'training', INTERN_BASE_ITEMS[0].id, { status: 'pass' }, 2), entry('extra', 'training', INTERN_DOMAINS[0].supplements[0].id, { status: 'pass' }), ...INTERN_OSCE_STATIONS.map(item => entry(item.id, 'osce', item.id, { status: 'pass' })), ...SAFETY_ITEMS.map(item => entry(item.id, 'safety', item.id, { status: 'pass' }))];
  const summary = summarizeIntern(student, entries);
  assert.deepEqual(summary.progress, { complete: 1, total: 50, percent: 2 });
  assert.equal(summary.osce, 4);
  assert.equal(summary.safety, 5);
  assert.equal(summary.reinforce, 0);
  assert.equal(summary.records, entries.length);
  assert.equal(summary.score, null);
  const scores = Object.fromEntries(SCORE_DEPARTMENTS.flatMap((_, index) => SCORE_DIMENSIONS.map(dim => [`${index}_${dim.id}`, 0])));
  assert.equal(summarizeIntern(student, [entry('final', 'final', 'overall', { scores, literature: 0, topic: 0 })]).score, 0);
});

test('匯出保留歷次評核、完整稽核欄位及選定範圍，CSV 可處理換行與公式內容', () => {
  const note = '第一行，含 "引號"\n第二行';
  const records = { a: [entry('old', 'training', INTERN_BASE_ITEMS[0].id, { status: 'reinforce', note }), entry('new', 'training', INTERN_BASE_ITEMS[0].id, { status: 'pass', note: '@測試' }, 2)], b: [entry('other', 'care', 'overall', { note: '不應匯出' })] };
  const exported = buildInternExport([student], records, '2026-11-03T00:00:00Z');
  assert.equal(exported.students.length, 1);
  assert.equal(exported.students[0].entries.length, 2);
  assert.equal(exported.students[0].entries[0].actorUid, 'teacher');
  assert.equal(exported.exportedAt, '2026-11-03T00:00:00Z');
  const csv = buildInternRecordsCsv([student], records);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('"\'=示範學員"'));
  assert.ok(csv.includes('"\'@測試"'));
  assert.ok(csv.includes('"第一行，含 ""引號""\n第二行"'));
  assert.ok(csv.includes('需再加強') && csv.includes('通過'));
  assert.ok(!csv.includes('不應匯出'));
});

test('共用 SOP 閱讀紀錄保留教材標題、版本與確認者，不增加教師評核完成率', () => {
  const receipt = { id: 'a__sop', sopId: INTERN_BASE_ITEMS[0].id, sopTitleSnapshot: '教材名稱', studentUid: 'a', studentName: '示範學員', sopVersion: 1000, confirmedAt: { seconds: 1793664000 } };
  const record = toSopReadEntry(receipt);
  assert.equal(getInternRecordTitle(record), '教材名稱');
  assert.equal(record.actorUid, 'a');
  assert.equal(record.source, 'sop_read_receipts');
  assert.equal(record.payload.date, '2026-11-03');
  assert.equal(getSopVersion({ updatedAt: { seconds: 1, nanoseconds: 500000000 } }), 1500);
  assert.equal(summarizeIntern(student, [record]).progress.complete, 0);
});
