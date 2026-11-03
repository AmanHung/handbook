import test from 'node:test';
import assert from 'node:assert/strict';
import { savePgyEvaluation, savePgyPeriod } from '../src/services/pgyTrainingStore.js';

test('共用評核介面仍用 PGY 的原始 GAS 欄位與 improve 狀態', async () => {
  let sent;
  const entry = { studentEmail: 'pgy@example.test', itemId: 'opd_01', status: 'improve', assessDate: '2026-11-03', teacherName: '測試藥師' };
  await savePgyEvaluation('https://example.test/api', entry, async (url, options) => { sent = { url, ...options }; return { ok: true, json: async () => ({ status: 'success' }) }; });
  assert.equal(sent.headers['Content-Type'], 'text/plain;charset=utf-8');
  assert.deepEqual(JSON.parse(sent.body), { type: 'saveEval', ...entry, note: '' });
});
test('PGY 儲存須確認伺服器成功；日期錯誤不送出，失敗可留在表單重試', async () => {
  const entry = { studentEmail: 'pgy@example.test', itemId: 'opd_01', status: 'pass', assessDate: '2026-11-03', teacherName: '測試藥師' };
  await assert.rejects(savePgyEvaluation('https://example.test', entry, async () => ({ ok: false })), /連線/);
  await assert.rejects(savePgyEvaluation('https://example.test', entry, async () => ({ ok: true, json: async () => ({ status: 'error', message: '未儲存' }) })), /未儲存/);
  assert.throws(() => savePgyEvaluation('https://example.test', { ...entry, assessDate: '2026-02-30' }), /日期/);
  assert.throws(() => savePgyEvaluation('https://example.test', { ...entry, status: 'reinforce' }), /評核/);
});
test('PGY 日期設定保留原始欄位，也可清空日期', async () => {
  let body;
  const entry = { studentEmail: 'pgy@example.test', categoryId: 'outpatient', updatedBy: '測試藥師' };
  await savePgyPeriod('https://example.test', entry, async (_, options) => { body = JSON.parse(options.body); return { ok: true, json: async () => ({ status: 'success' }) }; });
  assert.deepEqual(body, { type: 'savePeriod', ...entry, startDate: '', endDate: '' });
  assert.throws(() => savePgyPeriod('https://example.test', { ...entry, startDate: '2026-11-04', endDate: '2026-11-03' }), /日期/);
});
