import { DOPS_FORMS } from '../data/dopsForms.js';

export const dopsFields = id => DOPS_FORMS.find(form => form.id === id)?.sections.flatMap(section => section.fields) || [];
export const sortAssessments = entries => [...entries].sort((a, b) => (a.createdAt?.toMillis?.() ?? (a.createdAt?.seconds || 0) * 1000) - (b.createdAt?.toMillis?.() ?? (b.createdAt?.seconds || 0) * 1000) || String(a.id).localeCompare(String(b.id)));
export const dopsOutcome = (id, data) => {
  const score = Number(data.global_rating);
  if (id === 'dops_chemo_ppe' && dopsFields(id).filter(field => field.type === 'yes_no').some(field => data[field.id] !== '符合')) return { status: 'needs_improvement', hint: 'PPE 尚有不符合項目，須加強訓練並重新評核。' };
  if (score <= 6) return { status: 'needs_improvement', hint: '整體表現 6 分（含）以下，重新訓練，1 個月後重測。' };
  if (score === 7) return { status: 'needs_improvement', hint: '整體表現 7 分，加強不足項目，1 週後重測。' };
  return { status: 'completed', hint: '整體表現 8 分（含）以上，完成本項考核。' };
};
export const matchingAssessmentFeedback = (assessment, entries, kind) => {
  if (!assessment) return null;
  return sortAssessments(entries).reverse().find(entry => entry.kind === kind && entry.targetId === assessment.targetId && (entry.payload.assessmentId === assessment.id || !assessment.payload.workflowVersion && !entry.payload.assessmentId)) || null;
};
export function projectDopsRecords(entries, formId) {
  const versions = sortAssessments(entries).filter(entry => entry.kind === 'dops' && entry.targetId === formId);
  const instances = new Map();
  versions.forEach(entry => instances.set(entry.payload.instanceId, entry));
  return sortAssessments([...instances.values()]).reverse().map(entry => {
    const feedback = matchingAssessmentFeedback(entry, entries, 'dopsFeedback');
    const outcome = dopsOutcome(formId, entry.payload.formData);
    return {
      instanceId: entry.payload.instanceId, assessmentId: entry.id,
      timestamp: entry.createdAt?.toDate?.().toISOString() || `${entry.payload.date}T00:00:00Z`,
      status: entry.payload.phase === 'draft' ? 'draft' : feedback?.payload.phase === 'completed' ? outcome.status : 'teacher_graded',
      formData: { ...entry.payload.formData, evaluation_date: entry.payload.date,
        sign_teacher_name: entry.payload.phase === 'teacher_graded' ? entry.actorName : '', sign_teacher_date: entry.payload.date,
        ...(feedback ? { feedback_student_thoughts: feedback.payload.note, feedback_student_improve: feedback.payload.improve,
          sign_student_name: feedback.payload.phase === 'completed' ? feedback.actorName : '', sign_student_date: feedback.payload.date } : {}),
      },
    };
  });
}
