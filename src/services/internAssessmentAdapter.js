import { INTERN_OSCE_STATIONS } from '../data/internPassport.js';
import { dopsFields, projectDopsRecords, matchingAssessmentFeedback } from '../utils/dopsWorkflow.js';
import { validateInternEntry } from '../utils/internPassportValidation.js';

export const INTERN_OSCE_CONFIG = {
  topics: INTERN_OSCE_STATIONS.map(station => ({ ...station, description: `${station.source}・逐項 1–5 分，整體 0–10 分；由教師判定結果。` })),
  items: topic => topic.items.map((label, index) => ({ id: `item_${index}`, label })),
  scale: [5, 4, 3, 2, 1], manualResult: true,
  feedbackOptions: {
    attitude: ['溫和有禮', '穩重', '態度自然', '緊張', '語調平穩清晰', '說話聲音小，不清晰'],
    skills: ['熟練順暢', '評估完整詳細', '解說清楚', '不熟練', '多處遺漏', '未能清楚向對方解說'],
  },
};

// 共用 PGY 畫面，實習紀錄仍經既有 Firestore 權限與稽核流程保存。
export function createInternAssessmentAdapter({ readEntries, persist, isTeacher }) {
  const saveEntry = entry => persist({ ...entry, payload: validateInternEntry(entry.kind, entry.targetId, entry.payload, isTeacher) });
  const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  return {
    async listDops(id) { return { records: projectDopsRecords(readEntries(), id) }; },
    async saveDops(input) {
      if (isTeacher) {
        const fields = dopsFields(input.dopsId).filter(field => !field.id.startsWith('feedback_student')).map(field => field.id);
        await saveEntry({ kind: 'dops', targetId: input.dopsId, payload: {
          date: input.formData.evaluation_date, note: '', instanceId: input.instanceId,
          phase: input.status === 'draft' ? 'draft' : 'teacher_graded',
          formData: Object.fromEntries(fields.filter(id => input.formData[id] !== undefined).map(id => [id, input.formData[id]])),
        } });
      } else {
        const record = projectDopsRecords(readEntries(), input.dopsId).find(item => item.instanceId === input.instanceId);
        if (!record || record.status !== 'teacher_graded') throw new Error('此評核目前不能填寫回饋，請重新載入。');
        await saveEntry({ kind: 'dopsFeedback', targetId: input.dopsId, payload: { date: today(),
          note: input.formData.feedback_student_thoughts || '', improve: input.formData.feedback_student_improve || '',
          phase: ['completed', 'needs_improvement'].includes(input.status) ? 'completed' : 'draft', assessmentId: record.assessmentId,
        } });
      }
      return { status: 'success' };
    },
    async listOsce() {
      const entries = readEntries();
      return { records: entries.filter(entry => entry.kind === 'osce').reverse().map(entry => {
        const feedback = matchingAssessmentFeedback(entry, entries, 'osceFeedback');
        return { record_id: entry.id, topic_id: entry.targetId, date: entry.payload.date, teacher_name: entry.actorName,
          scores: Object.fromEntries(Object.entries(entry.payload.ratings).map(([index, score]) => [`item_${index}`, score])),
          total_score: Object.values(entry.payload.ratings).reduce((sum, score) => sum + Number(score), 0),
          overall: entry.payload.overall, result: entry.payload.status,
          teacher_feedback: entry.payload.teacherFeedback || { attitude: [], skills: [], other: entry.payload.note || '' },
          status: feedback ? 'completed' : 'teacher_graded',
          student_feedback: feedback ? { reflection: feedback.payload.note, improve: feedback.payload.improve || '' } : null,
        };
      }) };
    },
    async saveOsce(input) {
      await saveEntry({ kind: 'osce', targetId: input.topic_id, payload: { date: input.date, note: input.teacher_feedback.other || '',
        ratings: Object.fromEntries(Object.entries(input.scores).map(([id, score]) => [id.replace('item_', ''), score])),
        overall: input.overall, status: input.result, workflowVersion: 2, teacherFeedback: input.teacher_feedback,
      } });
      return { status: 'success' };
    },
    async saveOsceFeedback(input) {
      const record = readEntries().find(entry => entry.id === input.record_id && entry.kind === 'osce');
      if (!record) throw new Error('找不到評核紀錄，請重新載入。');
      await saveEntry({ kind: 'osceFeedback', targetId: record.targetId, payload: { date: today(), note: input.student_feedback.reflection,
        improve: input.student_feedback.improve || '', assessmentId: record.id,
      } });
      return { status: 'success' };
    },
  };
}
