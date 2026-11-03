import test from 'node:test';
import assert from 'node:assert/strict';
import { getSiteNavigation } from '../src/data/siteNavigation.js';
test('原網站選單共用身分判定，只有授權的學員及教師看得到護照，後台限教師及管理者', () => {
  for (const role of ['guest', 'member', 'unknown', undefined]) assert.deepEqual(getSiteNavigation(role).map(item => item.id), ['lookup', 'video', 'shift']);
  for (const role of ['student', 'intern']) assert.deepEqual(getSiteNavigation(role).map(item => item.id), ['lookup', 'video', 'shift', 'passport']);
  for (const role of ['teacher', 'admin']) assert.deepEqual(getSiteNavigation(role).map(item => item.id), ['lookup', 'video', 'shift', 'passport', 'admin']);
});
