import test from 'node:test';
import assert from 'node:assert/strict';
import { createSessionBoundary } from '../src/utils/sessionBoundary.js';

test('切換帳號、登出與同帳號重新登入後，延遲完成的舊請求不能覆蓋新身分', async () => {
  const session = createSessionBoundary();
  let releaseOld;
  const slowProfile = new Promise(resolve => { releaseOld = resolve; });
  const mayApplyOld = session.begin();
  let visibleRole = 'member';
  const oldRequest = slowProfile.then(role => { if (mayApplyOld()) visibleRole = role; });
  const mayApplyNew = session.begin();
  if (mayApplyNew()) visibleRole = 'student';
  releaseOld('admin');
  await oldRequest;
  assert.equal(visibleRole, 'student');
  session.cancel();
  assert.equal(mayApplyNew(), false);
  const sameAccountAgain = session.begin();
  assert.equal(mayApplyNew(), false);
  assert.equal(sameAccountAgain(), true);
});
