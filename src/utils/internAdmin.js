import { DOPS_FORMS } from '../data/dopsForms.js';
import { buildInternAssessmentRows } from './internDashboard.js';
import { INTERN_ALL_ITEMS, INTERN_DOMAINS, INTERN_OSCE_STATIONS, SAFETY_ITEMS, DELIVERABLES, FEEDBACK_FORMS, INTERN_PLAN_VERSION, getLatestEntries, getSafetyRecord, getTrainingProgress, getCompletionChecks, calculateFinalScore } from '../data/internPassport.js';

export const INTERN_RECORD_KINDS = { materialRead: '教材閱讀確認', training: '學習評核', rotation: '訓練期間', exam: '平常測驗／抽測', osce: 'OSCE 評估', dops: 'DOPS 評估', dopsFeedback: 'DOPS 學員回饋', safety: '安全訓練', deliverable: '學習成果', review: '成果審閱', feedback: '學習回饋', osceFeedback: 'OSCE 心得', care: '關懷輔導', final: '總成績', signoff: '結訓確認', learning: '舊版學習紀錄' };
export const getInternRecordTitle = entry => (entry.kind === 'materialRead' ? entry.payload?.title : null) || [...INTERN_ALL_ITEMS, ...INTERN_DOMAINS, ...INTERN_OSCE_STATIONS, ...DOPS_FORMS, ...SAFETY_ITEMS, ...DELIVERABLES, ...FEEDBACK_FORMS].find(item => item.id === entry.targetId)?.title || entry.payload?.title || INTERN_RECORD_KINDS[entry.kind] || entry.targetId;
export const getInternRecordStatus = entry => entry.kind === 'materialRead' ? '已閱讀' : entry.kind === 'dops' ? entry.payload.phase === 'draft' ? '教師草稿' : '待學員回饋' : entry.kind === 'dopsFeedback' ? entry.payload.phase === 'draft' ? '回饋草稿' : '已送出回饋' : entry.payload?.status === 'pass' ? '通過' : ['reinforce', 'improve'].includes(entry.payload?.status) ? '需再加強' : '已記錄';
export const buildInternTrainingItems = () => INTERN_DOMAINS.flatMap(domain => [...domain.items, ...domain.supplements].map(item => ({ id: item.id, title: item.title, category_id: `intern_${domain.id}`, category_name: domain.title, source: item.source })));
export const summarizeIntern = (student, entries) => {
  const latest = getLatestEntries(entries);
  const checks = getCompletionChecks(latest);
  const assessments = buildInternAssessmentRows(entries);
  return {
    student, latest, progress: getTrainingProgress(latest), records: entries.length,
    osce: INTERN_OSCE_STATIONS.filter(item => latest[`osce:${item.id}`]?.payload.status === 'pass').length,
    safety: SAFETY_ITEMS.filter(item => getSafetyRecord(latest, item.id)?.payload.status === 'pass').length,
    dops: assessments.dops.filter(row => row.passed).length,
    pendingFeedback: [...assessments.osce, ...assessments.dops].filter(row => row.status === 'pending').length,
    reinforce: Object.values(latest).filter(entry => ['reinforce', 'improve'].includes(entry.payload.status)).length + assessments.dops.filter(row => row.status === 'improvement').length,
    submissions: DELIVERABLES.filter(item => latest[`deliverable:${item.id}`]).length,
    score: calculateFinalScore(latest['final:overall']?.payload),
    checksComplete: checks.filter(check => check.done).length, checksTotal: checks.length,
  };
};
export function buildInternExport(students, entriesByStudent, exportedAt = new Date().toISOString()) {
  return {
    planVersion: INTERN_PLAN_VERSION, exportedAt,
    students: students.map(student => ({ student: { id: student.id, displayName: student.displayName || '', school: student.school || '', cohort: student.internshipCohort || '', startDate: student.arrivalDate || '', endDate: student.internshipEndDate || '' }, entries: entriesByStudent[student.id] || [] })),
  };
}
const csvCell = value => {
  let text = String(value ?? '');
  if (/^\s*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
};
export function buildInternRecordsCsv(students, entriesByStudent) {
  const rows = [['計畫版本', '實習生', '學校', '梯次', '紀錄類別', '訓練項目', '紀錄日期', '評核結果', '測驗分數', '整體評分', '評核或填寫者', '訓練起日', '訓練迄日', '內容或評語', '逐項評分', '檔案連結', '學員 UID', '紀錄 ID', '填寫者 UID', '伺服器保存時間', '教材版本', '部門評分', '評核流程', 'DOPS 評估編號', '對應評核 ID', 'DOPS 評分與教師回饋', 'OSCE 教師回饋', '學員自覺加強內容']];
  students.forEach(student => (entriesByStudent[student.id] || []).forEach(entry => {
    const payload = entry.payload || {};
    const savedAt = entry.createdAt?.toDate?.() || (entry.createdAt?.seconds ? new Date(entry.createdAt.seconds * 1000) : null);
    rows.push([entry.planVersion || INTERN_PLAN_VERSION, student.displayName, student.school, student.internshipCohort, INTERN_RECORD_KINDS[entry.kind] || entry.kind, getInternRecordTitle(entry), payload.date, getInternRecordStatus(entry), payload.score ?? (entry.kind === 'final' ? calculateFinalScore(payload) : ''), payload.overall, entry.actorName, payload.startDate, payload.endDate, payload.note, payload.ratings ? Object.entries(payload.ratings).map(([key, value]) => `${Number(key) + 1}：${value}`).join('；') : '', payload.url, student.id, entry.id, entry.actorUid, savedAt?.toISOString() || '', payload.sopVersion, payload.scores ? JSON.stringify(payload.scores) : '', payload.phase, payload.instanceId, payload.assessmentId, payload.formData ? JSON.stringify(payload.formData) : '', payload.teacherFeedback ? JSON.stringify(payload.teacherFeedback) : '', payload.improve]);
  }));
  return `\uFEFF${rows.map(row => row.map(csvCell).join(',')).join('\r\n')}`;
}
export const downloadInternExport = (content, format, scope) => {
  const mime = format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8';
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = `實習生學習紀錄_${scope.replace(/[\\/:*?"<>|]/g, '_')}.${format}`; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
