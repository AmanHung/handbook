import test from 'node:test';
import assert from 'node:assert/strict';
import { createInternAssessmentAdapter, INTERN_OSCE_CONFIG } from '../src/services/internAssessmentAdapter.js';
import { validateInternEntry } from '../src/utils/internPassportValidation.js';
import { projectDopsRecords, dopsFields, dopsOutcome } from '../src/utils/dopsWorkflow.js';
import { getLatestEntries, getCompletionChecks, getSafetyRecord } from '../src/data/internPassport.js';
import { buildInternAssessmentRows } from '../src/utils/internDashboard.js';
import { buildInternRecordsCsv } from '../src/utils/internAdmin.js';
import { DOPS_FORMS } from '../src/data/dopsForms.js';

const date = '2026-11-03';
const formId = 'dops_chemo_ppe';
const ppe = score => Object.fromEntries(dopsFields(formId).filter(field => !field.id.startsWith('feedback_student')).map(field => [field.id, field.type === 'yes_no' ? '符合' : field.type === 'score_10' ? score : '教師回饋']));
const runtime = () => {
  const entries = [];
  const store = isTeacher => createInternAssessmentAdapter({ readEntries: () => entries, isTeacher, persist: async entry => {
    const payload = validateInternEntry(entry.kind, entry.targetId, entry.payload, isTeacher);
    const saved = { ...entry, payload, id: `record_${entries.length}`, actorName: isTeacher ? '測試教師' : '測試實習生', createdAt: { seconds: entries.length + 1 } };
    entries.push(saved); return saved;
  } });
  return { entries, teacher: store(true), student: store(false) };
};
const grade = (teacher, score, instanceId = 'NEW_test', data = {}) => teacher.saveDops({ dopsId: formId, instanceId, status: 'teacher_graded', formData: { ...ppe(score), evaluation_date: date, ...data } });
const feedback = (student, status = 'completed', instanceId = 'NEW_test') => student.saveDops({ dopsId: formId, instanceId, status, formData: { feedback_student_thoughts: '操作心得', feedback_student_improve: '加強部分', global_rating: 10, sign_teacher_name: '偽造教師' } });

test('共用 PGY DOPS 契約保留教師稽核、暫存回饋與結案，學生不能覆寫教師分數或簽名', async () => {
  const { entries, teacher, student } = runtime();
  await grade(teacher, 8);
  assert.equal((await student.listDops(formId)).records[0].status, 'teacher_graded');
  await feedback(student, 'teacher_graded');
  assert.equal(projectDopsRecords(entries, formId)[0].status, 'teacher_graded');
  await feedback(student);
  const record = projectDopsRecords(entries, formId)[0];
  assert.equal(record.status, 'completed');
  assert.equal(record.formData.global_rating, 8);
  assert.equal(record.formData.sign_teacher_name, '測試教師');
  assert.equal(record.formData.sign_student_name, '測試實習生');
  assert.deepEqual(Object.keys(entries.at(-1).payload).sort(), ['assessmentId', 'date', 'improve', 'note', 'phase']);
  assert.equal(getSafetyRecord(getLatestEntries(entries), 'ppe').payload.status, 'pass');
  assert.equal(getCompletionChecks(getLatestEntries(entries)).find(item => item.id === 'dops').done, true);
});

test('DOPS 6、7、8 分門檻與 PPE 逐項符合；重測用新次數並保留舊失敗', async () => {
  assert.match(dopsOutcome(formId, ppe(6)).hint, /1 個月/);
  assert.match(dopsOutcome(formId, ppe(7)).hint, /1 週/);
  assert.equal(dopsOutcome(formId, { ...ppe(10), item_1_1: '不符合' }).status, 'needs_improvement');
  const { entries, teacher, student } = runtime();
  await grade(teacher, 7); await feedback(student);
  assert.equal(projectDopsRecords(entries, formId)[0].status, 'needs_improvement');
  await grade(teacher, 9, 'NEW_retest');
  assert.equal(getSafetyRecord(getLatestEntries(entries), 'ppe').payload.status, 'teacher_graded');
  await feedback(student, 'completed', 'NEW_retest');
  assert.equal(projectDopsRecords(entries, formId).length, 2);
  assert.equal(projectDopsRecords(entries, formId)[1].status, 'needs_improvement');
  assert.equal(getCompletionChecks(getLatestEntries(entries)).find(item => item.id === 'dops').done, true);
  const rows = buildInternAssessmentRows(entries);
  assert.equal(rows.dops[0].attempts, 2);
  assert.equal(rows.dops[0].status, 'passed');
});

test('教師 DOPS 草稿不算評核完成，完整評分檢查、身分限制與資料欄位過濾', async () => {
  assert.throws(() => validateInternEntry('dops', formId, { date, note: '', instanceId: 'x', phase: 'teacher_graded', formData: { global_rating: 8 } }, true), /評分/);
  assert.throws(() => validateInternEntry('dops', formId, { date, note: '', instanceId: 'x', phase: 'draft', formData: { sign_teacher_name: '偽造' } }, true), /簽名/);
  assert.throws(() => validateInternEntry('dops', formId, {}, false), /身分/);
  assert.throws(() => validateInternEntry('dopsFeedback', formId, {}, true), /身分/);
  const { teacher, student, entries } = runtime();
  await teacher.saveDops({ dopsId: formId, instanceId: 'NEW_test', status: 'draft', formData: { evaluation_date: date } });
  await assert.rejects(feedback(student), /不能填寫回饋/);
  assert.equal(buildInternAssessmentRows(entries).dops[0].evaluated, false);
});

test('實習 OSCE 四站各自保留歷史，重測須填對應的新回饋，舊版心得仍可讀', async () => {
  const { teacher, student, entries } = runtime();
  const input = id => ({ topic_id: id, date, scores: Object.fromEntries(INTERN_OSCE_CONFIG.topics.find(topic => topic.id === id).items.map((_, index) => [`item_${index}`, 4])), overall: 8, result: 'pass', teacher_feedback: { attitude: ['親切'], skills: [], other: '教師評語' } });
  await teacher.saveOsce(input('phone'));
  await student.saveOsceFeedback({ record_id: entries[0].id, student_feedback: { reflection: '電話站心得', improve: '語氣' } });
  await teacher.saveOsce(input('dispensing'));
  let records = (await teacher.listOsce()).records;
  assert.equal(records.find(record => record.topic_id === 'phone').status, 'completed');
  assert.equal(records.find(record => record.topic_id === 'dispensing').status, 'teacher_graded');
  await teacher.saveOsce(input('phone'));
  assert.equal(getCompletionChecks(getLatestEntries(entries)).find(item => item.id === 'feedback_phone').done, false);
  assert.equal(buildInternAssessmentRows(entries).osce[0].status, 'pending');
  await student.saveOsceFeedback({ record_id: entries.at(-1).id, student_feedback: { reflection: '重新操作心得', improve: '' } });
  assert.equal(getCompletionChecks(getLatestEntries(entries)).find(item => item.id === 'feedback_phone').done, true);
  const csv = buildInternRecordsCsv([{ id: 'student', displayName: '測試' }], { student: entries });
  assert.ok(csv.includes('OSCE 教師回饋') && csv.includes('重新操作心得') && csv.includes('教師評語'));
  const legacy = [{ id: 'old', kind: 'osce', targetId: 'phone', payload: { date, ratings: { 0: 4 }, overall: 8, status: 'pass' } }, { id: 'oldfeedback', kind: 'osceFeedback', targetId: 'phone', payload: { date, note: '舊心得' } }];
  assert.equal(getCompletionChecks(getLatestEntries(legacy)).find(item => item.id === 'feedback_phone').done, true);
});

test('全部九份 PGY DOPS 表單可經相同資料契約完成實習生評核，未安排者不列必修', async () => {
  const { entries, teacher, student } = runtime();
  assert.equal(buildInternAssessmentRows(entries).dops.length, 1);
  for (const form of DOPS_FORMS) {
    const formData = Object.fromEntries(dopsFields(form.id).filter(field => !field.id.startsWith('feedback_student')).map(field => [field.id, field.type === 'score_5' ? 'N/A' : field.type === 'score_10' ? 8 : field.type === 'yes_no' ? '符合' : '教師回饋']));
    await teacher.saveDops({ dopsId: form.id, instanceId: `NEW_${form.id}`, status: 'teacher_graded', formData: { ...formData, evaluation_date: date } });
    await student.saveDops({ dopsId: form.id, instanceId: `NEW_${form.id}`, status: 'completed', formData: { feedback_student_thoughts: '實習生心得' } });
    assert.equal(projectDopsRecords(entries, form.id)[0].status, 'completed');
  }
  assert.equal(buildInternAssessmentRows(entries).dops.filter(row => row.passed).length, 9);
  const csv = buildInternRecordsCsv([{ id: 'student' }], { student: entries });
  assert.ok(csv.includes('DOPS 評分與教師回饋') && csv.includes('實習生心得') && csv.includes('NEW_dops_chemo_ppe'));
});
