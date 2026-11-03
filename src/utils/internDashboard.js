import { INTERN_OSCE_STATIONS, getLatestEntries, INTERN_DOMAINS } from '../data/internPassport.js';
import { DOPS_FORMS } from '../data/dopsForms.js';
import { projectDopsRecords, matchingAssessmentFeedback, dopsOutcome } from './dopsWorkflow.js';

export function buildInternAssessmentRows(entries) {
  const latest = getLatestEntries(entries);
  const osce = INTERN_OSCE_STATIONS.map(station => {
    const record = latest[`osce:${station.id}`];
    const feedback = matchingAssessmentFeedback(record, entries, 'osceFeedback');
    const status = !record ? 'unassessed' : record.payload.status === 'reinforce' ? 'improvement' : !feedback ? 'pending' : 'passed';
    return { id: station.id, title: station.title, value: record ? Number(record.payload.overall) : null,
      evaluated: Boolean(record), passed: status === 'passed', status, date: record?.payload.date || '',
      attempts: entries.filter(entry => entry.kind === 'osce' && entry.targetId === station.id).length,
      recordId: record?.id, assessment: 'osce',
    };
  });
  // PPE 為必修，其餘 DOPS 依教師實際安排納入，避免將全部表單誤列為必修。
  const dops = DOPS_FORMS.filter(form => form.id === 'dops_chemo_ppe' || entries.some(entry => entry.kind === 'dops' && entry.targetId === form.id)).map(form => {
    const records = projectDopsRecords(entries, form.id);
    const record = records[0];
    const graded = record && record.status !== 'draft';
    const status = !graded ? 'unassessed' : dopsOutcome(form.id, record.formData).status === 'needs_improvement' ? 'improvement' : record.status === 'teacher_graded' ? 'pending' : 'passed';
    return { id: form.id, title: form.title, value: graded ? Number(record.formData.global_rating) : null,
      evaluated: Boolean(graded), passed: status === 'passed', status,
      date: record?.formData.evaluation_date || '', attempts: records.length,
      recordId: record?.instanceId, assessment: 'dops', draft: record?.status === 'draft',
    };
  });
  return { osce, dops, domains: INTERN_DOMAINS.map(domain => ({ id: domain.id, title: domain.title, complete: domain.items.filter(item => latest[`training:${item.id}`]?.payload.status === 'pass').length, total: domain.items.length })) };
}
