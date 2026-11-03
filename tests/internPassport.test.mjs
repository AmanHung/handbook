import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INTERN_BASE_ITEMS, INTERN_ALL_ITEMS, INTERN_DOMAINS, INTERN_OSCE_STATIONS,
  FEEDBACK_FORMS, PPE_ITEMS, SCORE_DEPARTMENTS, SCORE_DIMENSIONS,
  getLatestEntries, getTrainingProgress, getCompletionChecks, calculateFinalScore, numericScore, getInternTrainingGroups,
} from '../src/data/internPassport.js';
import { validateInternEntry } from '../src/utils/internPassportValidation.js';

const base = { date: '2026-11-03', note: '' };
const record = (id, kind, targetId, status, seconds = 1) => ({ id, kind, targetId, payload: { ...base, status }, createdAt: { seconds } });

test('附件 1 對應 6 個領域共 50 項，正文課程另列，固定 ID 不重複', () => {
  assert.equal(INTERN_DOMAINS.length, 6);
  assert.deepEqual(INTERN_DOMAINS.map(domain => domain.items.length), [12, 11, 11, 3, 4, 9]);
  assert.equal(INTERN_BASE_ITEMS.length, 50);
  assert.equal(new Set(INTERN_ALL_ITEMS.map(item => item.id)).size, INTERN_ALL_ITEMS.length);
  assert.equal(INTERN_ALL_ITEMS.length, 66);
});

test('再次評核取儲存時間最新結果，學生心得及正文課程不會增加核心進度', () => {
  const id = INTERN_BASE_ITEMS[0].id;
  const entries = [record('new', 'training', id, 'reinforce', 2), record('old', 'training', id, 'pass', 1), record('learning', 'learning', INTERN_BASE_ITEMS[1].id, 'pass', 3), record('extra', 'training', INTERN_DOMAINS[0].supplements[0].id, 'pass', 4)];
  const latest = getLatestEntries(entries);
  assert.equal(latest[`training:${id}`].id, 'new');
  assert.deepEqual(getTrainingProgress(latest), { complete: 0, total: 50, percent: 0 });
  assert.equal(entries.length, 4);
});

test('80 分邊界、0 分及未填寫不混淆，通過結果由分數重新計算', () => {
  for (const [score, status] of [[0, 'reinforce'], [79.9, 'reinforce'], [80, 'pass'], [100, 'pass']]) {
    assert.equal(validateInternEntry('exam', 'exam1', { ...base, title: '處方評估', mode: 'regular', score, status: status === 'pass' ? 'reinforce' : 'pass' }, true).status, status);
  }
  for (const score of ['', ' ', null, undefined, NaN, -1, 101, true]) {
    assert.equal(numericScore(score), false);
    assert.throws(() => validateInternEntry('safety', 'handwashing', { ...base, score }, true));
  }
});

test('比照 PGY，學生不能新增逐項學習紀錄或教師評核，教師不能代填學生回饋', () => {
  for (const kind of ['training', 'rotation', 'exam', 'osce', 'safety', 'review', 'care', 'final', 'signoff']) assert.throws(() => validateInternEntry(kind, 'anything', base, false));
  assert.throws(() => validateInternEntry('feedback', 'self', base, true));
  assert.throws(() => validateInternEntry('learning', INTERN_BASE_ITEMS[0].id, { ...base, note: '今日心得', status: 'pass' }, false));
});

test('抽測結果用正確／錯誤，不沿用分數判定', () => {
  const payload = { ...base, mode: 'spot', title: 'UD 調劑', score: 100, result: 'incorrect' };
  assert.equal(validateInternEntry('exam', 'spot1', payload, true).status, 'reinforce');
  assert.equal(validateInternEntry('exam', 'spot1', { ...payload, result: 'correct', score: 0 }, true).status, 'pass');
});

test('OSCE 完成逐項評分及整體 0 分也可保存，通過判定保留教師選擇', () => {
  const station = INTERN_OSCE_STATIONS[0];
  const ratings = Object.fromEntries(station.items.map((_, index) => [index, 1]));
  const input = { ...base, ratings, overall: 0, status: 'reinforce' };
  assert.equal(validateInternEntry('osce', station.id, input, true).status, 'reinforce');
  assert.equal(validateInternEntry('osce', station.id, { ...input, status: 'pass' }, true).status, 'pass');
  assert.throws(() => validateInternEntry('osce', station.id, { ...input, ratings: {} }, true));
});

test('PPE 不符合及未填項目不能標為通過；再加強可保留失敗紀錄', () => {
  const ratings = Object.fromEntries(PPE_ITEMS.map((_, index) => [index, 1]));
  assert.equal(validateInternEntry('safety', 'ppe', { ...base, ratings, status: 'pass' }, true).status, 'pass');
  ratings[0] = 0;
  assert.throws(() => validateInternEntry('safety', 'ppe', { ...base, ratings, status: 'pass' }, true));
  assert.equal(validateInternEntry('safety', 'ppe', { ...base, ratings, status: 'reinforce' }, true).status, 'reinforce');
  delete ratings[0];
  assert.throws(() => validateInternEntry('safety', 'ppe', { ...base, ratings, status: 'reinforce' }, true));
});

test('成績是七個部門 75 分平均加兩份報告權重，未填不能視為零分', () => {
  const scores = Object.fromEntries(SCORE_DEPARTMENTS.flatMap((_, index) => SCORE_DIMENSIONS.map(dim => [`${index}_${dim.id}`, dim.max])));
  assert.equal(calculateFinalScore({ scores, literature: 100, topic: 100 }), 100);
  assert.equal(calculateFinalScore({ scores, literature: 80, topic: 60 }), 92);
  assert.equal(calculateFinalScore({ scores, literature: '', topic: 100 }), null);
  scores['0_knowledge'] = '';
  assert.equal(calculateFinalScore({ scores, literature: 100, topic: 100 }), null);
});

test('成果新版本必須重新審閱；既有失敗測驗阻擋建議結訓檢核', () => {
  const latest = {
    'deliverable:literature': { id: 'v2', payload: base },
    'review:literature': { id: 'review', payload: { status: 'pass', submissionId: 'v1' } },
    'exam:e1': record('failed', 'exam', 'e1', 'reinforce'),
  };
  const checks = getCompletionChecks(latest);
  assert.equal(checks.find(item => item.id === 'literature').done, false);
  assert.equal(checks.find(item => item.id === 'retests').done, false);
  latest['review:literature'].payload.submissionId = 'v2';
  assert.equal(getCompletionChecks(latest).find(item => item.id === 'literature').done, true);
});

test('日期、回饋量表、教師姓名與檔案連結驗證', () => {
  for (const date of ['2026-02-30', '2026-99-99', '115/11/03']) assert.throws(() => validateInternEntry('osceFeedback', 'phone', { date, note: '心得' }, false));
  assert.throws(() => validateInternEntry('rotation', 'outpatient', { ...base, startDate: '2026-11-04', endDate: '2026-11-03', teacher: '藥師' }, true));
  for (const form of FEEDBACK_FORMS) {
    const ratings = Object.fromEntries(form.items.map((_, index) => [index, form.values[0]]));
    assert.doesNotThrow(() => validateInternEntry('feedback', form.id, { ...base, ratings, teacher: '藥師' }, false));
    ratings[0] = 9;
    assert.throws(() => validateInternEntry('feedback', form.id, { ...base, ratings, teacher: '藥師' }, false));
  }
  assert.throws(() => validateInternEntry('deliverable', 'literature', { ...base, url: 'javascript:alert(1)' }, false));
  assert.throws(() => validateInternEntry('deliverable', 'literature', base, false));
});

test('PGY 同款紀錄預設只顯示未通過項目，全部展開保留所有項目與原始核心進度', () => {
  const latest = Object.fromEntries(INTERN_DOMAINS[0].items.map(item => [`training:${item.id}`, record(item.id, 'training', item.id, 'pass')]));
  INTERN_DOMAINS[0].supplements.forEach(item => { latest[`training:${item.id}`] = record(item.id, 'training', item.id, 'pass'); });
  latest[`training:${INTERN_DOMAINS[1].items[0].id}`] = record('again', 'training', INTERN_DOMAINS[1].items[0].id, 'reinforce');
  assert.equal(getInternTrainingGroups(latest).some(group => group.id === 'outpatient'), false);
  assert.equal(getInternTrainingGroups(latest).flatMap(group => group.visibleItems).length, 51);
  const all = getInternTrainingGroups(latest, true);
  assert.equal(all.flatMap(group => group.visibleItems).length, 66);
  assert.equal(all[0].progress, 100);
  assert.equal(getInternTrainingGroups(latest).find(group => group.id === 'inpatient').visibleItems[0].id, INTERN_DOMAINS[1].items[0].id);
});
