import {
  INTERN_ALL_ITEMS, INTERN_DOMAINS, INTERN_OSCE_STATIONS, SAFETY_ITEMS, PPE_ITEMS,
  FEEDBACK_FORMS, DELIVERABLES, SCORE_DEPARTMENTS, SCORE_DIMENSIONS, numericScore,
} from '../data/internPassport.js';
import { dopsFields } from './dopsWorkflow.js';

export const STUDENT_ENTRY_KINDS = ['deliverable', 'feedback', 'osceFeedback', 'dopsFeedback'];
export const TEACHER_ENTRY_KINDS = ['training', 'rotation', 'exam', 'osce', 'dops', 'safety', 'review', 'care', 'final', 'signoff'];
const validDate = value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};
const hasRating = (scores, count, allowed) => Array.from({ length: count }, (_, index) => String(index)).every(key => scores?.[key] !== '' && allowed.includes(Number(scores?.[key])));
const hasTarget = (list, targetId) => list.some(item => item.id === targetId);

// 共用於正式表單、設計預覽與測試。分數與通過結果在這裡重新計算。
export function validateInternEntry(kind, targetId, input, isTeacher) {
  if (!(isTeacher ? TEACHER_ENTRY_KINDS : STUDENT_ENTRY_KINDS).includes(kind)) throw new Error('此身分不能填寫這類紀錄。');
  const payload = { ...input };
  if (!validDate(payload.date)) throw new Error('請填寫有效的紀錄日期。');
  if (['training', 'learning'].includes(kind) && !hasTarget(INTERN_ALL_ITEMS, targetId)) throw new Error('找不到訓練項目。');
  if (kind === 'rotation') {
    if (!hasTarget(INTERN_DOMAINS, targetId) || !validDate(payload.startDate) || !validDate(payload.endDate) || payload.endDate < payload.startDate) throw new Error('請確認輪訓起訖日期。');
    if (!payload.teacher?.trim()) throw new Error('請填寫指導藥師。');
  }
  if (['training', 'review', 'osce'].includes(kind) && !['pass', 'reinforce'].includes(payload.status)) throw new Error('請選擇評核結果。');
  if (['learning', 'osceFeedback'].includes(kind) && !payload.note?.trim()) throw new Error('請填寫心得或學習紀錄。');
  if (kind === 'exam') {
    if (!payload.title?.trim() || !['regular', 'spot'].includes(payload.mode)) throw new Error('請填寫測驗類型與內容。');
    if (payload.mode === 'regular') {
      if (!numericScore(payload.score)) throw new Error('測驗成績須為 0–100 分。');
      payload.status = Number(payload.score) >= 80 ? 'pass' : 'reinforce';
    } else {
      if (!['correct', 'incorrect'].includes(payload.result)) throw new Error('請選擇抽測結果。');
      payload.status = payload.result === 'correct' ? 'pass' : 'reinforce';
    }
  }
  if (kind === 'osce') {
    const station = INTERN_OSCE_STATIONS.find(item => item.id === targetId);
    if (!station || !hasRating(payload.ratings, station.items.length, [1, 2, 3, 4, 5]) || !numericScore(payload.overall, 10)) throw new Error('請完成所有 OSCE 項目及整體評分。');
    if (payload.workflowVersion) {
      if (payload.workflowVersion !== 2 || !payload.teacherFeedback || !Array.isArray(payload.teacherFeedback.attitude) || !Array.isArray(payload.teacherFeedback.skills) || typeof payload.teacherFeedback.other !== 'string') throw new Error('教師回饋格式不正確。');
    }
  }
  if (kind === 'dops') {
    const fields = dopsFields(targetId).filter(field => !field.id.startsWith('feedback_student'));
    if (!fields.length || !['draft', 'teacher_graded'].includes(payload.phase) || !/^[a-zA-Z0-9_-]{1,100}$/.test(payload.instanceId || '') || !payload.formData || typeof payload.formData !== 'object') throw new Error('DOPS 評核格式不正確。');
    if (Object.keys(payload.formData).some(id => !fields.some(field => field.id === id))) throw new Error('教師評核不能代填學員回饋或簽名。');
    fields.forEach(field => {
      const value = payload.formData[field.id];
      if ((value === undefined || value === '') && (payload.phase === 'draft' || field.type === 'textarea')) return;
      const valid = field.type === 'textarea' ? typeof value === 'string' && value.length <= 12000
        : field.type === 'yes_no' ? ['符合', '不符合'].includes(value)
        : field.type === 'score_5' ? ['1', '2', '3', '4', '5', 'N/A'].includes(String(value))
        : numericScore(value, 10) && Number(value) >= 1 && Number.isInteger(Number(value));
      if (!valid) throw new Error(`請完成有效的 DOPS 評分：${field.label}`);
    });
  }
  if (kind === 'dopsFeedback' || kind === 'osceFeedback' && payload.assessmentId) {
    if (!/^[a-zA-Z0-9_-]{1,150}$/.test(payload.assessmentId || '') || typeof payload.improve !== 'string' || payload.improve.length > 12000) throw new Error('請確認回饋對應的評核紀錄。');
    if (kind === 'dopsFeedback' && (!dopsFields(targetId).length || !['draft', 'completed'].includes(payload.phase) || payload.phase === 'completed' && !payload.note?.trim())) throw new Error('請完成 DOPS 學員心得。');
  }
  if (kind === 'safety') {
    const item = SAFETY_ITEMS.find(candidate => candidate.id === targetId);
    if (!item) throw new Error('找不到安全訓練項目。');
    if (item.mode === 'score') {
      if (!numericScore(payload.score)) throw new Error('安全訓練成績須為 0–100 分。');
      payload.status = Number(payload.score) >= 80 ? 'pass' : 'reinforce';
    } else {
      if (!['pass', 'reinforce'].includes(payload.status)) throw new Error('請選擇確認結果。');
      if (item.mode === 'ppe' && (!hasRating(payload.ratings, PPE_ITEMS.length, [0, 1]) || (payload.status === 'pass' && Object.values(payload.ratings).some(value => Number(value) !== 1)))) throw new Error('請逐項填寫 PPE 評核；仍有不符合項目時，請選擇再加強。');
    }
  }
  if (kind === 'deliverable') {
    if (!hasTarget(DELIVERABLES, targetId) || (!payload.note?.trim() && !payload.url?.trim())) throw new Error('請填寫報告內容或檔案連結。');
    if (payload.url) {
      let parsed;
      try { parsed = new URL(payload.url); } catch { throw new Error('請提供完整的 HTTPS 連結。'); }
      if (parsed.protocol !== 'https:') throw new Error('檔案連結須使用 HTTPS。');
    }
  }
  if (kind === 'review' && (!hasTarget(DELIVERABLES, targetId) || !payload.submissionId)) throw new Error('請先由實習生繳交成果再審閱。');
  if (kind === 'feedback') {
    const form = FEEDBACK_FORMS.find(item => item.id === targetId);
    if (!form || !hasRating(payload.ratings, form.items.length, form.values)) throw new Error('請完成每一項回饋評分。');
    if (targetId === 'teacher' && !payload.teacher?.trim()) throw new Error('請填寫受評教師姓名。');
  }
  if (kind === 'osceFeedback' && !hasTarget(INTERN_OSCE_STATIONS, targetId)) throw new Error('找不到 OSCE 站別。');
  if (kind === 'care' && (!['優於同儕', '符合', '較落後'].includes(payload.progress) || !['優', '普通', '待改進'].includes(payload.attitude) || !payload.note?.trim())) throw new Error('請完成關懷紀錄的學習進度、態度及回饋。');
  if (kind === 'final') {
    const complete = SCORE_DEPARTMENTS.every((_, index) => SCORE_DIMENSIONS.every(dim => numericScore(payload.scores?.[`${index}_${dim.id}`], dim.max)));
    if (targetId !== 'overall' || !complete || !numericScore(payload.literature) || !numericScore(payload.topic)) throw new Error('請完成七個部門的評分及兩項報告成績。');
  }
  if (kind === 'signoff' && targetId !== 'overall') throw new Error('結訓項目無效。');
  if (kind === 'exam' && payload.mode === 'regular' || kind === 'safety' && SAFETY_ITEMS.find(item => item.id === targetId)?.mode === 'score') payload.score = Number(payload.score);
  if (kind === 'osce') payload.overall = Number(payload.overall);
  if (['osce', 'feedback'].includes(kind) || kind === 'safety' && targetId === 'ppe') payload.ratings = Object.fromEntries(Object.entries(payload.ratings).map(([key, value]) => [key, Number(value)]));
  if (kind === 'final') {
    payload.scores = Object.fromEntries(Object.entries(payload.scores).map(([key, value]) => [key, Number(value)]));
    payload.literature = Number(payload.literature);
    payload.topic = Number(payload.topic);
  }
  const fields = {
    learning: [], training: ['status'], rotation: ['startDate', 'endDate', 'teacher'],
    exam: ['title', 'mode', 'score', 'result', 'status'], osce: ['ratings', 'overall', 'status', 'workflowVersion', 'teacherFeedback'],
    dops: ['instanceId', 'phase', 'formData'], dopsFeedback: ['assessmentId', 'phase', 'improve'],
    safety: ['score', 'ratings', 'status'], deliverable: ['url'], review: ['status', 'submissionId'],
    feedback: ['teacher', 'ratings'], osceFeedback: ['assessmentId', 'improve'], care: ['progress', 'attitude'],
    final: ['scores', 'literature', 'topic'], signoff: [],
  };
  return Object.fromEntries(['date', 'note', ...fields[kind]].filter(key => payload[key] !== undefined).map(key => [key, payload[key]]));
}
