import { useEffect, useRef } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, ChevronRight, Circle, Clock, FileText, List, Loader2, Save, UserCheck, X } from 'lucide-react';
import './InternTrainingRecords.css';

export function LearningRecordsToolbar({ showAll, pendingCount, totalCount, onToggle }) {
  return <div className="ip-pgy-record-toolbar"><div><h2>{showAll ? '完整訓練紀錄' : '待評核與未通過項目'}</h2><p>尚有 {pendingCount} 項待完成，共 {totalCount} 項訓練。</p></div><button type="button" className="ip-pgy-view-toggle" aria-pressed={showAll} onClick={onToggle}>{showAll ? <CheckCircle2 size={16} /> : <List size={16} />}{showAll ? '只看待評核' : '全部展開'}</button></div>;
}

export function LearningRecordRow({ id, title, teacher, date, note, status, isTeacher, disabled, onEvaluate, mainItem = true, highlighted = false, children }) {
  return <div id={id} className={`ip-pgy-item ${highlighted ? 'ip-pgy-highlighted' : ''}`}>
    <div className="ip-pgy-item-main"><h4>{mainItem ? <FileText size={16} /> : <Circle size={8} />}{title}</h4>
      {teacher && <p className="ip-pgy-evaluator"><UserCheck size={12} />{teacher}（{date || '日期未記錄'}）{note && <span>－{note}</span>}</p>}
      {children}
    </div>
    <div className="ip-pgy-item-actions">
      {status === 'pass' ? <span className="ip-pgy-status ip-pgy-pass"><CheckCircle2 size={12} />教師評核通過</span>
        : ['reinforce', 'improve'].includes(status) ? <span className="ip-pgy-status ip-pgy-improve"><AlertCircle size={12} />需再加強</span>
          : <span className="ip-pgy-status">訓練尚未評核</span>}
      {isTeacher && <button type="button" className="ip-pgy-eval" disabled={disabled} onClick={onEvaluate}>{status ? '重評' : '評核'}</button>}
    </div>
  </div>;
}

export function LearningRecordGroup({ title, progress, expanded, onToggle, period = {}, isTeacher, disabled, saving, changed, onPeriodChange, onSavePeriod, resources, children }) {
  return <section className="ip-pgy-group"><header className="ip-pgy-group-heading">
    <button type="button" className="ip-pgy-group-toggle" aria-expanded={expanded} onClick={onToggle}>{expanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}<strong>{title}</strong><span className={`ip-pgy-progress ${progress === 100 ? 'ip-pgy-pass' : ''}`}>{progress}%</span></button>
    <div className="ip-pgy-group-tools">{resources}<div className="ip-pgy-period"><Clock size={14} />{isTeacher ? <><input aria-label={`${title}開始日期`} type="date" disabled={disabled || saving} value={period.startDate || ''} onInput={event => onPeriodChange('startDate', event.currentTarget.value)} onChange={event => onPeriodChange('startDate', event.target.value)} /><span>➜</span><input aria-label={`${title}結束日期`} type="date" disabled={disabled || saving} min={period.startDate || undefined} value={period.endDate || ''} onInput={event => onPeriodChange('endDate', event.currentTarget.value)} onChange={event => onPeriodChange('endDate', event.target.value)} />{(changed || saving) && <button type="button" aria-label={`儲存${title}訓練日期`} disabled={disabled || saving} onClick={onSavePeriod}>{saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}</button>}</> : <span>{period.startDate || '--'} ➜ {period.endDate || '--'}</span>}</div></div>
  </header>{expanded && <div className="ip-pgy-group-content">{children}</div>}</section>;
}

export function LearningRecordsComplete() {
  return <div className="ip-pgy-complete"><CheckCircle2 size={32} /><strong>目前沒有待評核或未通過的項目</strong><p>可按「全部展開」查看完整訓練紀錄。</p></div>;
}

export function LearningEvaluationDialog({ itemName, date, status, onDateChange, onStatusChange, onSubmit, onClose, busy, error, improveStatus = 'improve' }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const previousFocus = document.activeElement;
    dialogRef.current?.querySelector('input')?.focus();
    return () => previousFocus?.focus?.();
  }, []);
  const handleKeys = event => {
    if (event.key === 'Escape' && !busy) onClose();
    if (event.key !== 'Tab') return;
    const fields = [...dialogRef.current.querySelectorAll('button:not(:disabled), input:not(:disabled)')];
    const first = fields[0], last = fields[fields.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };
  return <div className="ip-modal-backdrop learning-records"><section className="ip-pgy-eval-modal" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="learning-eval-title" onKeyDown={handleKeys}>
    <header><h2 id="learning-eval-title">考核評分</h2><button type="button" aria-label="關閉考核評分" disabled={busy} onClick={onClose}><X size={20} /></button></header>
    <form onSubmit={event => { event.preventDefault(); if (!busy) onSubmit(); }}><div><span className="ip-pgy-field-label">項目</span><p className="ip-pgy-assessed-title">{itemName}</p></div><label className="ip-pgy-field-label">日期<input type="date" required disabled={busy} value={date} onInput={event => onDateChange(event.currentTarget.value)} onChange={event => onDateChange(event.target.value)} /></label><div className="ip-pgy-result-buttons"><button type="button" disabled={busy} aria-pressed={status === 'pass'} onClick={() => onStatusChange('pass')} className={status === 'pass' ? 'ip-pgy-pass' : ''}>合格</button><button type="button" disabled={busy} aria-pressed={status === improveStatus} onClick={() => onStatusChange(improveStatus)} className={status === improveStatus ? 'ip-pgy-improve' : ''}>再加強</button></div>{error && <p role="alert" className="ip-error">{error}</p>}<button type="submit" disabled={busy} className="ip-pgy-submit">{busy ? '儲存中…' : '確認送出'}</button></form>
  </section></div>;
}
