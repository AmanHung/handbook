import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, GraduationCap, ArrowRight, CheckCircle2, Circle, Clock, ShieldCheck, ClipboardCheck, MessageSquare, ChevronDown, X, Save, Loader2, ExternalLink, AlertCircle, History, CalendarDays } from 'lucide-react';
import {
  INTERN_PLAN_TITLE, INTERN_DOMAINS, INTERN_ALL_ITEMS,
  INTERN_OSCE_STATIONS, SAFETY_ITEMS, PPE_ITEMS, DELIVERABLES, FEEDBACK_FORMS,
  SCORE_DEPARTMENTS, SCORE_DIMENSIONS, SPOT_TEST_ITEMS,
  getLatestEntries, getSafetyRecord, getTrainingProgress, getCompletionChecks, calculateFinalScore, getRetestHint,
} from '../data/internPassport';
import { validateInternEntry } from '../utils/internPassportValidation';
import InternTrainingRecords, { InternTrainingEvaluation } from './InternTrainingRecords';
import { InternResourcesProvider } from './InternTrainingResources';
import './InternPassport.css';
import InternAssessments from './InternAssessments';
import { DOPS_FORMS } from '../data/dopsForms';
import { INTERN_DOPS_FORMS } from '../data/internDopsForms';
import { projectDopsRecords } from '../utils/dopsWorkflow';
const EMPTY_PREVIEW_MATERIALS = { sops: [], videos: [], links: {}, internReadsByStudent: {} };

const TABS = [
  ['overview', '實習總覽', GraduationCap], ['training', '學習紀錄', BookOpen],
  ['assessment', '學習評估', ClipboardCheck], ['safety', '安全訓練', ShieldCheck],
  ['outcome', '成果與結訓', CheckCircle2], ['feedback', '回饋與關懷', MessageSquare],
];
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const statusLabel = record => !record ? '尚未評核' : record.kind === 'materialRead' ? '已閱讀' : record.payload.status === 'teacher_graded' ? '待學員回饋' : record.payload.status === 'draft' ? '教師草稿' : record.payload.status === 'pass' ? '已通過' : record.payload.status === 'reinforce' ? '再加強' : '已記錄';
const Badge = ({ record }) => <span className={`ip-badge ${record?.payload.status === 'pass' ? 'ip-pass' : record?.payload.status === 'reinforce' ? 'ip-reinforce' : ''}`}>{statusLabel(record)}</span>;
const StatusIcon = ({ done }) => done ? <CheckCircle2 size={17} className="ip-green" /> : <Circle size={17} className="ip-muted" />;
const getTitle = entry => INTERN_ALL_ITEMS.find(item => item.id === entry.targetId)?.title
  || INTERN_DOMAINS.find(item => item.id === entry.targetId)?.title
  || INTERN_OSCE_STATIONS.find(item => item.id === entry.targetId)?.title
  || DOPS_FORMS.find(item => item.id === entry.targetId)?.title
  || SAFETY_ITEMS.find(item => item.id === entry.targetId)?.title
  || DELIVERABLES.find(item => item.id === entry.targetId)?.title
  || FEEDBACK_FORMS.find(item => item.id === entry.targetId)?.title
  || entry.payload.title || ({ care: '關懷輔導紀錄', final: '實習生學習評估', signoff: '教學負責人結訓確認' })[entry.kind] || '實習紀錄';

export function InternRecordHistory({ entries, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!entries.length) return null;
  return <div className="ip-history"><button className="ip-text-button" onClick={() => setOpen(!open)} aria-expanded={open}><History size={14} />歷次紀錄（{entries.length}）<ChevronDown size={14} /></button>
    {open && <div className="ip-history-list">{[...entries].reverse().map(entry => <div key={entry.id} className="ip-history-entry">
      <div className="ip-row"><strong>{entry.payload.date}</strong><span>{entry.actorName}</span><Badge record={entry} /></div>
      {entry.kind === 'learning' && <small>實習生學習紀錄</small>}
      {entry.kind === 'materialRead' && <p>{entry.payload.title}・教材版本：{entry.payload.sopVersion}</p>}
      {entry.payload.score !== undefined && entry.payload.score !== '' && <p>分數：{entry.payload.score}</p>}
      {entry.kind === 'dops' && <><p>流程：{entry.payload.phase === 'draft' ? '教師草稿' : '待學員回饋'}；評估編號：{entry.payload.instanceId}</p><details><summary>查看 DOPS 評分與教師回饋</summary>{DOPS_FORMS.find(form => form.id === entry.targetId)?.sections.flatMap(section => section.fields).filter(field => entry.payload.formData?.[field.id] !== undefined).map(field => <p key={field.id}>{field.label}：{entry.payload.formData[field.id]}</p>)}</details></>}
      {entry.payload.assessmentId && <p className="ip-small ip-muted">對應評核：{entry.payload.assessmentId}{entry.payload.phase ? `・${entry.payload.phase === 'draft' ? '回饋草稿' : '已送出回饋'}` : ''}</p>}
      {entry.payload.improve && <p className="ip-prewrap">自覺可再加強：{entry.payload.improve}</p>}
      {entry.payload.teacherFeedback && <p className="ip-prewrap">教師回饋：{[...entry.payload.teacherFeedback.attitude, ...entry.payload.teacherFeedback.skills].join('、')}</p>}
      {entry.payload.overall !== undefined && <p>整體評估：{entry.payload.overall}／10</p>}
      {entry.payload.result && <p>抽測結果：{entry.payload.result === 'correct' ? '正確' : '錯誤'}</p>}
      {entry.payload.startDate && <p>輪訓：{entry.payload.startDate} ～ {entry.payload.endDate}；指導藥師：{entry.payload.teacher}</p>}
      {entry.payload.ratings && <details className="ip-rating-history"><summary>查看逐項評分</summary>{Object.entries(entry.payload.ratings).map(([index, value]) => {
        const titles = entry.kind === 'osce' ? INTERN_OSCE_STATIONS.find(item => item.id === entry.targetId)?.items : entry.kind === 'feedback' ? FEEDBACK_FORMS.find(item => item.id === entry.targetId)?.items : PPE_ITEMS;
        return <p key={index}>{Number(index) + 1}．{titles?.[index] || '評核項目'}：{entry.kind === 'safety' ? Number(value) === 1 ? '符合' : '不符合' : value}</p>;
      })}</details>}
      {entry.payload.scores && <><p className="ip-small">本次總分：{calculateFinalScore(entry.payload)}／100</p><details><summary>查看各部門評分</summary><div className="ip-score-scroll"><table className="ip-score-table"><thead><tr><th>部門</th>{SCORE_DIMENSIONS.map(dim => <th key={dim.id}>{dim.title}</th>)}</tr></thead><tbody>{SCORE_DEPARTMENTS.map((department, index) => <tr key={department}><th>{department}</th>{SCORE_DIMENSIONS.map(dim => <td key={dim.id}>{entry.payload.scores[`${index}_${dim.id}`]}</td>)}</tr>)}</tbody></table></div><p>文獻心得：{entry.payload.literature}；專題報告：{entry.payload.topic}</p></details></>}
      {entry.payload.teacher && !entry.payload.startDate && <p>受評教師：{entry.payload.teacher}</p>}
      {entry.payload.progress && <p>學習進度：{entry.payload.progress}；學習態度：{entry.payload.attitude}</p>}
      {entry.payload.note && <p className="ip-prewrap">{entry.payload.note}</p>}
      {entry.payload.url && <a href={entry.payload.url} target="_blank" rel="noopener noreferrer" className="ip-text-button">開啟繳交內容<ExternalLink size={13} /></a>}
      {getRetestHint(entry) && <p className="ip-amber">{getRetestHint(entry)}</p>}
    </div>)}</div>}
  </div>;
}

const RecordHistory = InternRecordHistory;

function RatingFields({ items, options, ratings = {}, onChange }) {
  return <div className="ip-rating-list">{items.map((title, index) => <label key={index} className="ip-rating-row"><span>{index + 1}．{title}</span>
    <select required value={ratings[index] ?? ''} onChange={event => onChange({ ...ratings, [index]: event.target.value })}><option value="">請選擇</option>{options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
  </label>)}</div>;
}

function EntryEditor({ editor, isTeacher, latest, busy, onSave, onClose }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const previousFocus = document.activeElement;
    dialogRef.current?.querySelector('input, select, textarea')?.focus();
    return () => previousFocus?.focus?.();
  }, []);
  const handleKeys = event => {
    if (event.key === 'Escape' && !busy) onClose();
    if (event.key !== 'Tab') return;
    const focusable = [...dialogRef.current.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)')];
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };
  const { kind, targetId, title } = editor;
  const previous = latest[`${kind}:${targetId}`]?.payload;
  const [form, setForm] = useState({ status: 'pass', mode: 'regular', score: '', result: '', note: '', url: '', teacher: '', ratings: {}, scores: {}, overall: '', literature: '', topic: '', ...previous, ...(editor.initial || {}), date: today() });
  const [error, setError] = useState('');
  const update = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const station = INTERN_OSCE_STATIONS.find(item => item.id === targetId);
  const safety = SAFETY_ITEMS.find(item => item.id === targetId);
  const feedback = FEEDBACK_FORMS.find(item => item.id === targetId);
  const resultSelector = ['training', 'review', 'osce'].includes(kind) || (kind === 'safety' && safety.mode !== 'score');
  const handleSubmit = async event => {
    event.preventDefault();
    setError('');
    try {
      const payload = validateInternEntry(kind, targetId, form, isTeacher);
      await onSave({ kind, targetId, payload });
      onClose();
    } catch (failure) { setError(failure.message || '儲存失敗，請稍後重試。'); }
  };
  return <div className="ip-modal-backdrop"><section ref={dialogRef} onKeyDown={handleKeys} role="dialog" aria-modal="true" aria-labelledby="ip-editor-title" className="ip-modal">
    <header><div><p className="ip-eyebrow">{isTeacher ? '教師評核紀錄' : '實習學習紀錄'}</p><h2 id="ip-editor-title">{title}</h2></div><button type="button" className="ip-icon-button" onClick={onClose} disabled={busy} aria-label="關閉表單"><X /></button></header>
    <form onSubmit={handleSubmit} className="ip-editor-form">
      <label>紀錄日期<input type="date" required value={form.date} onChange={event => update('date', event.target.value)} /></label>
      {kind === 'rotation' && <><div className="ip-form-grid"><label>輪訓開始<input type="date" required value={form.startDate || ''} onChange={event => update('startDate', event.target.value)} /></label><label>輪訓結束<input type="date" required min={form.startDate || undefined} value={form.endDate || ''} onChange={event => update('endDate', event.target.value)} /></label></div><label>指導藥師<input required value={form.teacher} onChange={event => update('teacher', event.target.value)} /></label></>}
      {kind === 'exam' && <><label>測驗類型<select value={form.mode} onChange={event => update('mode', event.target.value)} disabled={Boolean(editor.initial?.mode)}><option value="regular">平常測驗</option><option value="spot">隨機抽測</option></select></label>
        <label>測驗項目及內容<input required list="ip-spot-items" value={form.title || ''} onChange={event => update('title', event.target.value)} placeholder="例如：處方用藥評估" /><datalist id="ip-spot-items">{SPOT_TEST_ITEMS.map(item => <option key={item} value={item} />)}</datalist></label>
        {form.mode === 'spot' ? <label>抽測結果<select required value={form.result} onChange={event => update('result', event.target.value)}><option value="">請選擇</option><option value="correct">正確</option><option value="incorrect">錯誤</option></select></label> : <label>成績（0–100 分；80 分及格）<input type="number" min="0" max="100" step="0.1" required value={form.score} onChange={event => update('score', event.target.value)} /></label>}
        <p className="ip-hint">{form.mode === 'spot' ? '錯誤項目經教師糾正後，得於隔天重新測驗。' : '未達 80 分者，得於一週內重新測驗，直到達合格標準。'}每次重測均保留紀錄。</p></>}
      {kind === 'osce' && <><p className="ip-hint">{station.source}。逐項評分與整體評分分開保存；原計畫未訂數值通過門檻，由教師判定。</p><RatingFields items={station.items} ratings={form.ratings} options={[[5, '5 優異'], [4, '4 良好'], [3, '3 一般水準'], [2, '2 有待加強'], [1, '1 不應通過']]} onChange={value => update('ratings', value)} /><label>整體評估（0–10 分）<input type="number" min="0" max="10" step="1" required value={form.overall} onChange={event => update('overall', event.target.value)} /></label></>}
      {kind === 'safety' && safety.mode === 'score' && <label>測驗成績（0–100 分；80 分及格）<input type="number" min="0" max="100" step="0.1" required value={form.score} onChange={event => update('score', event.target.value)} /></label>}
      {kind === 'safety' && safety.mode === 'ppe' && <><p className="ip-hint">下列名稱對應 11409 版附件 5；實際操作依院內現行 SOP 與指導藥師指導。未符合項目須再加強。</p><RatingFields items={PPE_ITEMS} ratings={form.ratings} options={[[1, '符合'], [0, '不符合']]} onChange={value => update('ratings', value)} /></>}
      {kind === 'feedback' && <><p className="ip-hint">{feedback.source}。本護照採記名填寫，指導藥師與管理者可檢視。</p>{targetId === 'teacher' && <label>受評教師<input required value={form.teacher} onChange={event => update('teacher', event.target.value)} /></label>}<RatingFields items={feedback.items} ratings={form.ratings} options={feedback.values.map((value, index) => [value, `${value} ${feedback.labels[index]}`])} onChange={value => update('ratings', value)} /></>}
      {kind === 'care' && <div className="ip-form-grid"><label>學習進度<select required value={form.progress || ''} onChange={event => update('progress', event.target.value)}><option value="">請選擇</option>{['優於同儕', '符合', '較落後'].map(value => <option key={value}>{value}</option>)}</select></label><label>學習態度<select required value={form.attitude || ''} onChange={event => update('attitude', event.target.value)}><option value="">請選擇</option>{['優', '普通', '待改進'].map(value => <option key={value}>{value}</option>)}</select></label></div>}
      {kind === 'deliverable' && <label>報告或檔案連結<input type="url" value={form.url} onChange={event => update('url', event.target.value)} placeholder="https://…" /><small>可貼上已設定適當分享權限的報告連結，或在下方填寫內容。</small></label>}
      {kind === 'final' && <><p className="ip-hint">依附件 6，以各欄權重上限直接給分；七個部門分數平均占 75 分，兩項報告占 25 分。原計畫未訂結訓總分門檻。</p><div className="ip-score-scroll"><table className="ip-score-table"><thead><tr><th>學習項目</th>{SCORE_DIMENSIONS.map(dim => <th key={dim.id}>{dim.title}<small>滿分 {dim.max}</small></th>)}</tr></thead><tbody>{SCORE_DEPARTMENTS.map((department, index) => <tr key={department}><th>{department}</th>{SCORE_DIMENSIONS.map(dim => { const key = `${index}_${dim.id}`; return <td key={key}><input aria-label={`${department} ${dim.title}`} type="number" min="0" max={dim.max} step="0.1" required value={form.scores[key] ?? ''} onChange={event => update('scores', { ...form.scores, [key]: event.target.value })} /></td>; })}</tr>)}</tbody></table></div><div className="ip-form-grid">{[['literature', '文獻閱讀心得（占 10%）'], ['topic', '專題報告（占 15%）']].map(([key, label]) => <label key={key}>{label}<input type="number" min="0" max="100" step="0.1" required value={form[key]} onChange={event => update(key, event.target.value)} placeholder="原始成績 0–100" /></label>)}</div><div className="ip-notice">試算總分：{calculateFinalScore(form) ?? '請先完成全部評分'}／100</div></>}
      {resultSelector && <label>教師判定<select value={form.status} onChange={event => update('status', event.target.value)}><option value="pass">{kind === 'review' ? '審閱通過' : '及格／完成'}</option><option value="reinforce">再加強</option></select></label>}
      <label>{kind === 'osceFeedback' ? '操作心得、感受與建議' : kind === 'learning' ? '學習內容、心得與待釐清問題' : kind === 'care' ? '意見反應與回饋' : kind === 'deliverable' ? '報告內容或摘要' : '評語與補充說明'}<textarea rows="4" maxLength="12000" required={['learning', 'osceFeedback', 'care'].includes(kind)} value={form.note} onChange={event => update('note', event.target.value)} placeholder="請填寫與學習相關的紀錄。" /></label>
      <p className="ip-small ip-muted">儲存時會留下填寫者姓名與時間；新增紀錄會保留先前版本。請使用去識別化的學習內容。</p>
      {error && <p role="alert" className="ip-error">{error}</p>}
      <footer><button type="button" className="ip-button" onClick={onClose} disabled={busy}>取消</button><button type="submit" className="ip-button ip-primary" disabled={busy}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}儲存紀錄</button></footer>
    </form>
  </section></div>;
}

export default function InternPassport({ student, entries = [], isTeacher = false, isSelf = false, onSave, loading = false, error = '', preview = false, currentUserName = '指導藥師', initialTab = 'overview', initialAssessment = 'osce', initialDopsForm, initialAssessmentRecord, hidePreviewNotice = false, materialPreview }) {
  const [tab, setTab] = useState(initialTab);
  const [assessment, setAssessment] = useState(initialAssessment);
  const [dopsTarget, setDopsTarget] = useState(initialDopsForm);
  const openDops = id => { setDopsTarget(id); setAssessment('dops'); setTab('assessment'); };
  const [focusedDomain, setFocusedDomain] = useState('');
  const [focusToken, setFocusToken] = useState(0);
  const openTrainingDomain = domainId => { setFocusedDomain(domainId); setFocusToken(token => token + 1); setTab('training'); };
  const [editor, setEditor] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const latest = useMemo(() => getLatestEntries(entries), [entries]);
  const progress = getTrainingProgress(latest);
  const checks = getCompletionChecks(latest);
  const completionCount = checks.filter(check => check.done).length;
  const osceCount = INTERN_OSCE_STATIONS.filter(station => latest[`osce:${station.id}`]?.payload.status === 'pass').length;
  const reinforce = Object.values(latest).filter(entry => entry.payload.status === 'reinforce');
  const signoff = latest['signoff:overall'];
  const signoffCurrent = signoff && JSON.stringify(signoff.payload.reviewedEntryIds) === JSON.stringify(entries.filter(entry => entry.kind !== 'signoff').map(entry => entry.id).sort());
  const history = (kind, targetId) => entries.filter(entry => entry.kind === kind && entry.targetId === targetId);
  const canWrite = Boolean(student?.id) && !loading && !error;
  const showEditor = (kind, targetId, title, initial) => { if (canWrite) { setNotice(''); setEditor({ kind, targetId, title, initial }); } };
  const action = (kind, targetId, title, label = '填寫紀錄', initial) => <button disabled={!canWrite} className="ip-button ip-compact" onClick={() => showEditor(kind, targetId, title, initial)}>{label}</button>;
  const save = async entry => {
    if (!canWrite || busy) throw new Error('資料尚未就緒，請重新載入後再試。');
    if (entry.kind === 'signoff' && completionCount !== checks.length) throw new Error('結訓檢核尚未全部完成。');
    setBusy(true);
    try { const saved = await onSave(entry); setNotice(preview ? '預覽紀錄已更新，重新整理後恢復示範資料。' : '紀錄已儲存，歷次版本已保留。'); return saved; }
    finally { setBusy(false); }
  };
  return <InternResourcesProvider student={student} canConfirm={isSelf} previewFixture={preview ? materialPreview || EMPTY_PREVIEW_MATERIALS : undefined}><div className="intern-passport">
    <header className="ip-heading"><div className="ip-heading-title"><div className="ip-brand-icon"><GraduationCap size={27} /></div><div><p className="ip-eyebrow">豐原醫院・藥劑科教學</p><h1>實習生學習護照</h1><p className="ip-subtitle">每一次練習，都留下成長的紀錄。</p></div></div><div className="ip-heading-right"><span className="ip-version">實習生訓練計畫</span></div></header>
    {preview && !hidePreviewNotice && <div className="ip-preview-note">設計預覽・使用虛構示範資料。可切換教師與實習生試填，紀錄僅保留在本次畫面。</div>}
    <section className="ip-student-strip"><div><span className="ip-avatar">{student?.displayName?.slice(-2) || '實習'}</span><div><strong>{student?.displayName || '請選擇實習生'}</strong><p>{student?.school || '學校尚未設定'}{student?.internshipCohort ? `・${student.internshipCohort}` : ''}</p></div></div><div className="ip-student-dates"><CalendarDays size={16} /><span>{student?.arrivalDate || '開始日期未設定'} ～ {student?.internshipEndDate || '結束日期未設定'}</span></div><span className="ip-role-label">{isTeacher ? '教師檢視' : '我的實習護照'}</span></section>
    <nav aria-label="實習生護照功能" className="ip-tabs">{TABS.map(tabInfo => { const [id, label, Icon] = tabInfo; return <button key={id} aria-current={tab === id ? 'page' : undefined} onClick={() => { setTab(id); setNotice(''); }} className={tab === id ? 'ip-tab-active' : ''}><Icon size={17} />{label}</button>; })}</nav>
    {notice && <p role="status" className="ip-success"><CheckCircle2 size={17} />{notice}</p>}
    {error && <p role="alert" className="ip-error"><AlertCircle size={17} />{error}</p>}
    {loading ? <div className="ip-empty"><Loader2 className="animate-spin" />正在讀取實習護照…</div> : !student ? <div className="ip-empty">目前尚無實習生。請由管理員在人員管理中指定「實習生」身分。</div> : error ? <div className="ip-empty">資料未成功載入，請重新整理。為避免誤判，暫停顯示進度及填寫。</div> : <>
      {tab === 'overview' && <>
        <div className="ip-overview-grid"><section className="ip-hero"><p className="ip-eyebrow">我的實習旅程</p><h2>{progress.percent === 100 ? '輪訓已完成，接著檢視結訓準備' : '從臨床現場，累積藥事專業'}</h2><p>依訓練計畫安排輪訓，由指導藥師確認每一項學習成果。</p><div className="ip-hero-progress"><strong>{progress.percent}<small>％</small></strong><span>附件 1 訓練進度<br />已通過 {progress.complete}／{progress.total} 項</span></div><div className="ip-progress-track"><span style={{ width: `${progress.percent}%` }} /></div><button className="ip-hero-link" onClick={() => setTab('training')}>查看我的學習紀錄<ArrowRight size={16} /></button></section>
          <div className="ip-stat-stack"><section className="ip-card ip-stat"><div className="ip-stat-icon"><ClipboardCheck size={21} /></div><div><p>OSCE 四站評估</p><strong>{osceCount}<small>／4 站通過</small></strong></div></section><section className="ip-card ip-stat"><div className="ip-stat-icon ip-mint"><ShieldCheck size={21} /></div><div><p>安全防護訓練</p><strong>{SAFETY_ITEMS.filter(item => getSafetyRecord(latest, item.id)?.payload.status === 'pass').length}<small>／5 項完成</small></strong></div></section><section className="ip-card ip-stat"><div className="ip-stat-icon ip-sand"><Clock size={21} /></div><div><p>待加強項目</p><strong>{reinforce.length}<small>項待重新確認</small></strong></div></section></div>
        </div>
        <div className="ip-section-heading"><div><p className="ip-eyebrow">ROTATIONS</p><h2>六大實習領域</h2></div><span className="ip-small ip-muted">輪訓期間可依實際實習安排調整</span></div>
        <div className="ip-domain-grid">{INTERN_DOMAINS.map((domain, index) => { const count = domain.items.filter(item => latest[`training:${item.id}`]?.payload.status === 'pass').length; const period = latest[`rotation:${domain.id}`]?.payload; return <button className="ip-domain-card" key={domain.id} onClick={() => { openTrainingDomain(domain.id); }}><div className="ip-row"><span className="ip-domain-number">0{index + 1}</span><span className="ip-small ip-muted">{period ? `${period.startDate} ～ ${period.endDate}` : `參考 ${domain.duration}`}</span></div><h3>{domain.title}</h3><p>{domain.description}</p><div className="ip-row"><span className="ip-small">{count}／{domain.items.length} 項通過</span><ArrowRight size={16} /></div><div className="ip-mini-progress"><span style={{ width: `${count / domain.items.length * 100}%` }} /></div></button>; })}</div>
        <section className="ip-card"><div className="ip-row"><div><h3>DOPS 技能評估</h3><p className="ip-small ip-muted">已完成 {INTERN_DOPS_FORMS.filter(form => projectDopsRecords(entries, form.id)[0]?.status === 'completed').length} ／1 項。依訓練計畫附件 5 評核，並納入安全訓練檢核。</p></div><button className="ip-button ip-compact" onClick={() => openDops(undefined)}>開啟 DOPS</button></div></section><div className="ip-bottom-grid"><section className="ip-card"><h3>接下來可以做</h3>{reinforce.length ? reinforce.slice(0, 4).map(entry => <button key={entry.id} className="ip-next-item" onClick={() => setTab(({ training: 'training', exam: 'assessment', osce: 'assessment', safety: 'safety', review: 'outcome' })[entry.kind] || 'outcome')}><span><strong>{getTitle(entry)}</strong><small>{getRetestHint(entry)}</small></span><ArrowRight size={16} /></button>) : <p className="ip-muted ip-small">目前沒有需再加強項目。可開啟學習紀錄，檢視尚未完成的訓練。</p>}</section><section className="ip-card"><h3>結訓準備</h3><p className="ip-muted ip-small">已完成 {completionCount}／{checks.length} 項檢核。實習結束前一週內完成回饋文件與實習心得。</p><button className="ip-text-button" onClick={() => setTab('outcome')}>查看結訓檢核<ArrowRight size={15} /></button></section></div>
      </>}
      <div hidden={tab !== 'training'}><InternTrainingRecords latest={latest} isTeacher={isTeacher} canWrite={canWrite} currentUserName={currentUserName} onSave={save} onEvaluate={item => showEditor('training', item.id, item.title)} focusedDomain={focusedDomain} focusToken={focusToken} /></div>
      {tab === 'assessment' && <><div className="ip-assessment-tabs" role="group" aria-label="評估類型">{[['osce', 'OSCE 評估'], ['dops', 'DOPS 評估'], ['exam', '平常測驗／抽測']].map(([id, title]) => <button key={id} type="button" aria-pressed={assessment === id} onClick={() => { setAssessment(id); setDopsTarget(undefined); }}>{title}</button>)}</div>{assessment !== 'exam' && <InternAssessments key={`${student.id}:${isTeacher}:${assessment}`} student={student} entries={entries} isTeacher={isTeacher} currentUserName={currentUserName} onSave={save} type={assessment} targetFormId={dopsTarget} targetRecordId={initialAssessmentRecord} />}{assessment === 'exam' && <><div className="ip-section-heading"><div><h2>平常測驗與隨機抽測</h2><p>依附件 2、3 留下每次測驗、重測與評核藥師紀錄。</p></div>{isTeacher && action('exam', crypto.randomUUID(), '新增測驗或抽測', '新增測驗')}</div><div className="ip-notice">平常測驗：80 分及格，未達標得於一週內重測。抽測：正確／錯誤，經糾正後得於隔天重測。</div>
        <section className="ip-card">{Object.values(latest).filter(entry => entry.kind === 'exam').length ? Object.values(latest).filter(entry => entry.kind === 'exam').map(entry => <div key={entry.targetId} className="ip-list-item"><div className="ip-row"><div><h3>{entry.payload.title}</h3><p className="ip-small ip-muted">{entry.payload.mode === 'spot' ? '隨機抽測' : '平常測驗'}・{entry.payload.date}・{entry.actorName}</p></div><Badge record={entry} /></div><p className="ip-small">{entry.payload.mode === 'spot' ? `結果：${entry.payload.result === 'correct' ? '正確' : '錯誤'}` : `成績：${entry.payload.score} 分`}</p>{getRetestHint(entry) && <p className="ip-small ip-amber">{getRetestHint(entry)}</p>}{isTeacher && action('exam', entry.targetId, `${entry.payload.title}・重測`, '新增重測紀錄', { mode: entry.payload.mode, title: entry.payload.title, score: '', result: '', note: '' })}<RecordHistory entries={history('exam', entry.targetId)} /></div>) : <p className="ip-empty">尚無測驗紀錄，由指導藥師新增。</p>}</section>
        </>}</>}
      {tab === 'safety' && <><div className="ip-section-heading"><div><h2>安全防護訓練</h2><p>完成感控、化療防護及儀器操作安全訓練。</p></div><ShieldCheck className="ip-green" size={28} /></div><div className="ip-safety-list">{SAFETY_ITEMS.map(item => <section key={item.id} className="ip-card"><div className="ip-row"><div><h3>{item.title}</h3><p className="ip-small ip-muted">{item.description}</p></div><Badge record={getSafetyRecord(latest, item.id)} /></div>{item.id === 'ppe' ? <button className="ip-button ip-compact" onClick={() => openDops('dops_chemo_ppe')}>開啟 DOPS 評估</button> : isTeacher && action('safety', item.id, item.title, item.mode === 'participation' ? '確認訓練完成' : '填寫評核')}<RecordHistory entries={history('safety', item.id)} /></section>)}</div></>}
      {tab === 'outcome' && <><div className="ip-section-heading"><div><h2>學習成果</h2><p>保存報告連結、口頭報告紀錄與實習心得，交由教師審閱。</p></div></div><div className="ip-two-columns">{DELIVERABLES.map(item => { const submission = latest[`deliverable:${item.id}`]; const review = latest[`review:${item.id}`]; const reviewed = submission && review?.payload.submissionId === submission.id; return <section key={item.id} className="ip-card"><div className="ip-row"><h3>{item.title}</h3><span className={`ip-badge ${reviewed && review.payload.status === 'pass' ? 'ip-pass' : ''}`}>{!submission ? '尚未繳交' : reviewed ? statusLabel(review) : '待教師審閱'}</span></div><p className="ip-small ip-muted">{item.weight ? `占總成績 ${item.weight}%` : item.description || '實習結束前一週內繳交'}</p>{isSelf && action('deliverable', item.id, item.title, submission ? '更新繳交內容' : '繳交成果')}{isTeacher && submission && action('review', item.id, `${item.title}・教師審閱`, '審閱成果', { submissionId: submission.id })}<RecordHistory entries={entries.filter(entry => entry.targetId === item.id)} /></section>; })}</div>
        <section className="ip-card ip-final-score"><div><p className="ip-eyebrow">FINAL ASSESSMENT</p><h3>實習生學習評估</h3><p className="ip-small ip-muted">七個部門表現平均 75%＋文獻心得 10%＋專題報告 15%。</p><p className="ip-small ip-muted">評分方式採附件 6 權重直接給分；不自設總分及格門檻。</p>{isTeacher && action('final', 'overall', '實習生學習評估', '填寫總成績')}</div><strong>{calculateFinalScore(latest['final:overall']?.payload) ?? '—'}<small>／100</small></strong></section><RecordHistory entries={history('final', 'overall')} />
        <section className="ip-card"><div className="ip-section-heading"><div><h2>結訓檢核</h2><p>已完成 {completionCount}／{checks.length} 項；最終由教學負責人確認。</p></div><span className="ip-count">{Math.round(completionCount / checks.length * 100)}％</span></div><p className="ip-hint">以下為護照建議檢核清單。正文增列課程及平常測驗次數由教師依實際安排確認。</p><div className="ip-checklist">{checks.map(check => <div key={check.id}><StatusIcon done={check.done} /><span>{check.title}</span></div>)}</div>{latest['signoff:overall'] && <p className={completionCount === checks.length && signoffCurrent ? 'ip-success' : 'ip-notice'}>曾於 {latest['signoff:overall'].payload.date} 由 {latest['signoff:overall'].actorName} 確認結訓。{!signoffCurrent ? '之後有新增紀錄，請重新確認。' : ''}</p>}{isTeacher && <button className="ip-button ip-primary" disabled={!canWrite || completionCount !== checks.length || student?.viewerRole !== 'admin'} onClick={() => showEditor('signoff', 'overall', '教學負責人結訓確認')}>教學負責人確認結訓</button>}{isTeacher && student?.viewerRole !== 'admin' && <p className="ip-small ip-muted">結訓確認由管理者／教學負責人執行。</p>}</section></>}
      {tab === 'feedback' && <><div className="ip-section-heading"><div><h2>教與學雙向回饋</h2><p>實習結束前一週內完成。回饋採記名填寫，教師與管理者可檢視。</p></div></div><div className="ip-two-columns">{FEEDBACK_FORMS.map(form => <section className="ip-card" key={form.id}><div className="ip-row"><h3>{form.title}</h3><span className={`ip-badge ${latest[`feedback:${form.id}`] ? 'ip-pass' : ''}`}>{latest[`feedback:${form.id}`] ? '已填寫' : '待填寫'}</span></div><p className="ip-small ip-muted">{form.source}・{form.items.length} 題</p>{isSelf && action('feedback', form.id, form.title, '填寫評估')}<RecordHistory entries={history('feedback', form.id)} /></section>)}<section className="ip-card"><h3>OSCE 雙向回饋</h3><p className="ip-small ip-muted">四站心得於「學習評估」的 OSCE 評估內填寫，與教師評語一併保存。</p><button className="ip-text-button" onClick={() => { setAssessment('osce'); setTab('assessment'); }}>前往四站心得<ArrowRight size={15} /></button></section></div><section className="ip-card ip-care"><div className="ip-section-heading"><div><h2>學員關懷輔導</h2><p>指導教師每月第四週擇期完成，記錄學習進度、態度與回饋。</p></div>{isTeacher && action('care', crypto.randomUUID(), '新增關懷輔導紀錄', '新增關懷紀錄')}</div><RecordHistory entries={entries.filter(entry => entry.kind === 'care')} />{!entries.some(entry => entry.kind === 'care') && <p className="ip-small ip-muted">尚無關懷輔導紀錄。</p>}</section></>}
    </>}
    <footer className="ip-page-footer"><BookOpen size={14} /><span>{INTERN_PLAN_TITLE}・附件編號依實際表單標題對應</span></footer>
    {editor && (editor.kind === 'training' ? <InternTrainingEvaluation key={`${student?.id}:${editor.targetId}`} item={editor} busy={busy} onSave={save} onClose={() => setEditor(null)} /> : <EntryEditor key={`${student?.id}:${editor.kind}:${editor.targetId}`} editor={editor} isTeacher={isTeacher} latest={latest} busy={busy} onSave={save} onClose={() => setEditor(null)} />)}
  </div></InternResourcesProvider>;
}
