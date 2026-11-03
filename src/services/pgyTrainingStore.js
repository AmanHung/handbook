const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(new Date(`${value}T12:00:00Z`).getTime()) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
async function post(apiUrl, body, fetchImpl) {
  const response = await fetchImpl(apiUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error('無法連線儲存，請稍後重試。');
  const result = await response.json();
  if (result.status !== 'success') throw new Error(result.message || '伺服器未確認儲存，請稍後重試。');
  return result;
}
// 保留既有 GAS 欄位名稱與 improve 狀態，不與實習生資料互換。
export function savePgyEvaluation(apiUrl, entry, fetchImpl = fetch) {
  if (!entry.studentEmail || !entry.itemId || !entry.teacherName || !validDate(entry.assessDate) || !['pass', 'improve'].includes(entry.status)) throw new Error('請確認學員、日期與評核結果。');
  return post(apiUrl, { type: 'saveEval', studentEmail: entry.studentEmail, itemId: entry.itemId, status: entry.status, assessDate: entry.assessDate, teacherName: entry.teacherName, note: entry.note || '' }, fetchImpl);
}
export function savePgyPeriod(apiUrl, entry, fetchImpl = fetch) {
  const { startDate = '', endDate = '' } = entry;
  if (!entry.studentEmail || !entry.categoryId || !entry.updatedBy || startDate && !validDate(startDate) || endDate && !validDate(endDate) || startDate && endDate && endDate < startDate) throw new Error('請確認訓練起訖日期。');
  return post(apiUrl, { type: 'savePeriod', studentEmail: entry.studentEmail, categoryId: entry.categoryId, startDate, endDate, updatedBy: entry.updatedBy }, fetchImpl);
}
