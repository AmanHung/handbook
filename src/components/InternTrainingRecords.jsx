import { useEffect, useState } from 'react';
import InternTrainingResources from './InternTrainingResources';
import { INTERN_ALL_ITEMS, getInternTrainingGroups } from '../data/internPassport';
import { validateInternEntry } from '../utils/internPassportValidation';
import { LearningRecordGroup, LearningRecordRow, LearningRecordsToolbar, LearningRecordsComplete, LearningEvaluationDialog } from './LearningRecords';

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

export default function InternTrainingRecords({ latest, isTeacher, canWrite, currentUserName, onSave, onEvaluate, focusedDomain = '', focusToken = 0 }) {
  const [showAll, setShowAll] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [editPeriods, setEditPeriods] = useState({});
  const [savingPeriod, setSavingPeriod] = useState('');
  const [error, setError] = useState('');
  const groups = getInternTrainingGroups(latest, showAll);
  const pendingCount = INTERN_ALL_ITEMS.filter(item => latest[`training:${item.id}`]?.payload.status !== 'pass').length;
  useEffect(() => {
    if (!focusedDomain) return;
    setShowAll(false);
    setExpandedGroups(current => ({ ...current, [focusedDomain]: true }));
  }, [focusedDomain, focusToken]);
  const toggleView = () => {
    const next = !showAll;
    setShowAll(next);
    setExpandedGroups(Object.fromEntries(getInternTrainingGroups(latest, next).map(group => [group.id, true])));
  };
  const changePeriod = (id, key, value) => setEditPeriods(current => ({ ...current, [id]: { ...latest[`rotation:${id}`]?.payload, ...current[id], [key]: value } }));
  const savePeriod = async id => {
    if (!canWrite || savingPeriod) return;
    setError(''); setSavingPeriod(id);
    try {
      const payload = validateInternEntry('rotation', id, { ...editPeriods[id], date: today(), note: '', teacher: currentUserName }, isTeacher);
      await onSave({ kind: 'rotation', targetId: id, payload });
      setEditPeriods(current => { const next = { ...current }; delete next[id]; return next; });
    } catch (failure) { setError(failure.message || '日期儲存失敗，請稍後重試。'); }
    finally { setSavingPeriod(''); }
  };
  const renderItem = item => {
    const record = latest[`training:${item.id}`];
    return <LearningRecordRow key={item.id} title={item.title} teacher={record?.actorName} date={record?.payload.date} note={record?.payload.note} status={record?.payload.status} isTeacher={isTeacher} disabled={!canWrite} onEvaluate={() => onEvaluate(item)}><InternTrainingResources itemId={item.id} /></LearningRecordRow>;
  };
  return <section className="ip-pgy-records learning-records" aria-label="學習紀錄">
    <LearningRecordsToolbar showAll={showAll} pendingCount={pendingCount} totalCount={INTERN_ALL_ITEMS.length} onToggle={toggleView} />
    <p className="ip-pgy-source-note">含附件 1 的 50 項核心訓練與正文增列 16 項課程；完成率以核心訓練計算。</p>
    {error && <p role="alert" className="ip-error">{error}</p>}
    {groups.length ? groups.map(group => {
      const period = latest[`rotation:${group.id}`]?.payload || {};
      const edited = editPeriods[group.id] || period;
      const changed = (edited.startDate || '') !== (period.startDate || '') || (edited.endDate || '') !== (period.endDate || '');
      const expanded = expandedGroups[group.id] ?? !showAll;
      const core = group.visibleItems.filter(item => item.source === '附件 1');
      const extra = group.visibleItems.filter(item => item.source !== '附件 1');
      return <LearningRecordGroup key={group.id} title={group.title} progress={group.progress} expanded={expanded} onToggle={() => setExpandedGroups(current => ({ ...current, [group.id]: !expanded }))} period={edited} isTeacher={isTeacher} disabled={!canWrite || Boolean(savingPeriod)} saving={savingPeriod === group.id} changed={changed} onPeriodChange={(key, value) => changePeriod(group.id, key, value)} onSavePeriod={() => savePeriod(group.id)}>{core.map(renderItem)}{extra.length > 0 && <><h3 className="ip-pgy-supplement-title">正文增列課程</h3>{extra.map(renderItem)}</>}</LearningRecordGroup>;
    }) : <LearningRecordsComplete />}
  </section>;
}

export function InternTrainingEvaluation({ item, busy, onSave, onClose }) {
  const [date, setDate] = useState(today);
  const [status, setStatus] = useState('pass');
  const [error, setError] = useState('');
  const submit = async () => {
    setError('');
    try {
      const payload = validateInternEntry('training', item.targetId, { date, status, note: '' }, true);
      await onSave({ kind: 'training', targetId: item.targetId, payload });
      onClose();
    } catch (failure) { setError(failure.message || '評核儲存失敗，請稍後重試。'); }
  };
  return <LearningEvaluationDialog itemName={item.title} date={date} status={status} onDateChange={setDate} onStatusChange={setStatus} onSubmit={submit} onClose={onClose} busy={busy} error={error} improveStatus="reinforce" />;
}
