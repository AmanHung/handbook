import test from 'node:test';
import assert from 'node:assert/strict';
import { createPgyPassportFixture } from '../src/dev/pgyPassportFixture.js';
import { savePgyEvaluation } from '../src/services/pgyTrainingStore.js';
test('整合預覽使用原 GAS 合約，評核與不同學員資料各自保留', async () => {
  const fixture = createPgyPassportFixture();
  await savePgyEvaluation('https://example.test/api', { studentEmail: fixture.students[0].email, itemId: 'preview_opd_03', status: 'pass', assessDate: '2026-11-03', teacherName: '測試藥師' }, fixture.fetch);
  const read = async email => (await fixture.fetch(`https://example.test?studentEmail=${email}`)).json();
  const first = await read(fixture.students[0].email);
  const second = await read(fixture.students[1].email);
  assert.equal(first.records.preview_opd_03.status, 'pass');
  assert.equal(second.records.preview_opd_03, undefined);
  first.records.preview_opd_03.status = 'improve';
  assert.equal((await read(fixture.students[0].email)).records.preview_opd_03.status, 'pass');
});
