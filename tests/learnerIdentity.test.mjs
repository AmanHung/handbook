import test from 'node:test';
import assert from 'node:assert/strict';
import { getLearnerTrack, getLearnerLabel, getLearnerProfileFields } from '../src/utils/learnerIdentity.js';

test('既有 PGY 與舊實習生角色相容；權限與學員類型各自判定', () => {
  assert.equal(getLearnerTrack({ role: 'student' }), 'pgy');
  assert.equal(getLearnerTrack({ role: 'intern' }), 'intern');
  assert.equal(getLearnerTrack({ role: 'student', trainingType: 'intern' }), 'intern');
  for (const role of ['teacher', 'admin', 'member', 'guest']) assert.equal(getLearnerTrack({ role, trainingType: 'intern' }), null);
  assert.equal(getLearnerLabel({ role: 'student', trainingType: 'intern' }), '實習生');
  assert.deepEqual(getLearnerProfileFields({ role: 'intern', displayName: '測試學生' }), { displayName: '測試學生', role: 'student', trainingType: 'intern', arrivalDate: '', internshipEndDate: '', school: '', internshipCohort: '' });
});
