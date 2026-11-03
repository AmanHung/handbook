import InternDashboardCharts from './InternDashboardCharts';
import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Download, Eye, FileText, Loader2, X } from 'lucide-react';
import { auth, db } from '../firebase';
import InternPassport, { InternRecordHistory } from './InternPassport';
import { saveInternEntry } from '../services/internPassportStore';
import { subscribeInternWorkspace } from '../services/internWorkspace';
import { isTeachingRole } from '../utils/learnerIdentity';
import { INTERN_RECORD_KINDS, buildInternExport, buildInternRecordsCsv, downloadInternExport, getInternRecordStatus, getInternRecordTitle, summarizeIntern } from '../utils/internAdmin';

const tabFor = kind => ({ materialRead: 'training', training: 'training', rotation: 'training', exam: 'assessment', osce: 'assessment', osceFeedback: 'assessment', dops: 'assessment', dopsFeedback: 'assessment', safety: 'safety', deliverable: 'outcome', review: 'outcome', final: 'outcome', signoff: 'outcome' })[kind] || 'feedback';

export default function InternAdminDashboard({ students, user, userRole, previewFixture }) {
  const preview = import.meta.env.DEV ? previewFixture : null;
  const [cohort, setCohort] = useState('ALL');
  const [view, setView] = useState('individual');
  const [selectedUid, setSelectedUid] = useState('');
  const [kind, setKind] = useState('all');
  const [search, setSearch] = useState('');
  const [workspaces, setWorkspaces] = useState({});
  const [retryKey, setRetryKey] = useState(0);
  const [drawer, setDrawer] = useState(null);
  const [message, setMessage] = useState('');
  const cohorts = [...new Set(students.map(student => student.internshipCohort || ''))].sort();
  const filtered = useMemo(() => students.filter(student => cohort === 'ALL' || JSON.stringify(student.internshipCohort || '') === cohort), [students, cohort]);
  const uidKey = JSON.stringify(filtered.map(student => student.id).sort());
  useEffect(() => {
    const ids = JSON.parse(uidKey);
    setSelectedUid(current => ids.includes(current) ? current : ids[0] || '');
    setDrawer(null);
  }, [uidKey]);
  useEffect(() => {
    if (preview || !isTeachingRole(userRole)) return undefined;
    setWorkspaces({});
    const stops = JSON.parse(uidKey).map(uid => subscribeInternWorkspace(db, uid, state => setWorkspaces(current => ({ ...current, [uid]: state }))));
    return () => stops.forEach(stop => stop());
  }, [uidKey, userRole, Boolean(preview), retryKey]);
  const entriesByStudent = preview?.internEntriesByStudent || Object.fromEntries(Object.entries(workspaces).map(([uid, state]) => [uid, state.entries]));
  const errors = preview ? {} : Object.fromEntries(Object.entries(workspaces).map(([uid, state]) => [uid, state.error]));
  const loaded = uid => preview ? Object.prototype.hasOwnProperty.call(entriesByStudent, uid) : workspaces[uid]?.status === 'ready';
  const scope = view === 'overall' ? filtered : filtered.filter(student => student.id === selectedUid);
  const ready = scope.length > 0 && scope.every(student => loaded(student.id));
  const summaries = scope.filter(student => loaded(student.id)).map(student => summarizeIntern(student, entriesByStudent[student.id]));
  const totals = summaries.reduce((sum, item) => ({ completed: sum.completed + item.progress.complete, osce: sum.osce + item.osce, safety: sum.safety + item.safety, reinforce: sum.reinforce + item.reinforce, records: sum.records + item.records }), { completed: 0, osce: 0, safety: 0, reinforce: 0, records: 0 });
  const rows = ready ? scope.flatMap(student => entriesByStudent[student.id].map(entry => ({ student, entry }))).filter(({ entry }) => (kind === 'all' || entry.kind === kind) && `${getInternRecordTitle(entry)} ${entry.actorName || ''} ${entry.payload?.note || ''}`.toLowerCase().includes(search.trim().toLowerCase())).sort((a, b) => (b.entry.createdAt?.toMillis?.() || b.entry.createdAt?.seconds * 1000 || 0) - (a.entry.createdAt?.toMillis?.() || a.entry.createdAt?.seconds * 1000 || 0)) : [];
  const drawerStudent = drawer && filtered.find(student => student.id === drawer.uid);
  const exportRecords = format => {
    if (!isTeachingRole(userRole) || !ready) return;
    const scopeName = view === 'overall' ? cohort === 'ALL' ? '全部梯次' : JSON.parse(cohort) || '未設定梯次' : scope[0].displayName || '個別實習生';
    const content = format === 'csv' ? buildInternRecordsCsv(scope, entriesByStudent) : JSON.stringify(buildInternExport(scope, entriesByStudent), null, 2);
    downloadInternExport(content, format, scopeName);
    setMessage(`已匯出${scopeName}的完整紀錄，包含歷次評核；不受下方搜尋條件影響。`);
  };
  const save = async (uid, entry) => {
    if (!isTeachingRole(userRole)) throw new Error('目前身分不能評核。');
    if (!loaded(uid)) throw new Error('目前尚未確認最新紀錄，請等候連線恢復後再儲存。');
    if (preview) return preview.onSaveInternEntry(uid, entry);
    if (!auth.currentUser || auth.currentUser.uid !== user.uid) throw new Error('登入身分已變更，請重新登入。');
    return saveInternEntry(db, auth.currentUser, uid, entry);
  };
  if (!isTeachingRole(userRole)) return <p role="alert">只有指導藥師與管理者可查看後台紀錄。</p>;
  return <section aria-label="實習生後台管理" className="space-y-5">
    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 space-y-4"><div className="flex flex-wrap justify-between gap-3 items-start"><div><h2 className="text-lg font-bold text-indigo-900">實習生學習成效與紀錄</h2><p className="text-sm text-indigo-700 mt-1">依梯次查看進度、完整評核歷程與成果，並由後台統一匯出。</p></div><div className="flex flex-wrap gap-2"><button type="button" disabled={!ready} onClick={() => exportRecords('csv')} className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-indigo-200 rounded-lg text-indigo-700 text-sm font-bold disabled:opacity-40"><Download size={16} />匯出 CSV</button><button type="button" disabled={!ready} onClick={() => exportRecords('json')} className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-indigo-200 rounded-lg text-indigo-700 text-sm font-bold disabled:opacity-40"><FileText size={16} />匯出完整 JSON</button></div></div>
      <div className="flex flex-wrap gap-3 items-center"><label className="text-sm text-indigo-900">實習梯次<select aria-label="實習梯次" value={cohort} onChange={event => setCohort(event.target.value)} className="ml-2 border rounded-lg p-2 bg-white"><option value="ALL">全部梯次</option>{cohorts.map(value => <option key={value} value={JSON.stringify(value)}>{value || '未設定梯次'}</option>)}</select></label><div className="flex rounded-lg border border-indigo-200 bg-white p-1">{[['individual', '個別實習生'], ['overall', '全部實習生']].map(([value, label]) => <button type="button" key={value} aria-pressed={view === value} onClick={() => setView(value)} className={`px-3 py-1.5 text-sm rounded-md ${view === value ? 'bg-indigo-600 text-white' : 'text-indigo-700'}`}>{label}</button>)}</div>{view === 'individual' && <label className="text-sm text-indigo-900">實習生<select aria-label="後台實習生" value={selectedUid} onChange={event => { setSelectedUid(event.target.value); setDrawer(null); }} className="ml-2 border rounded-lg p-2 bg-white">{!filtered.length && <option value="">尚無實習生</option>}{filtered.map(student => <option key={student.id} value={student.id}>{student.displayName || student.email}</option>)}</select></label>}</div>
      <p className="text-xs text-indigo-700">匯出範圍以目前梯次及個別／全部選擇為準。評核與表單保留歷次版本；教材列最新閱讀確認。</p>
    </div>
    {message && <p role="status" className="p-3 bg-green-50 border border-green-100 rounded-lg text-sm text-green-800">{message}</p>}
    {!preview && scope.some(student => workspaces[student.id]?.status === 'reconnecting') && <p role="status" className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-amber-800 text-sm">正在重新確認最新資料，統計、評核及匯出暫停；連線恢復後會自動更新。</p>}
    {scope.some(student => errors[student.id]) && <div role="alert" className="p-3 bg-red-50 rounded-lg text-red-700 flex flex-wrap gap-2 items-center text-sm"><AlertCircle size={18} /><p>部分實習生資料無法讀取，統計及匯出暫停。</p><button type="button" onClick={() => setRetryKey(value => value + 1)} className="border border-red-300 rounded-md px-3 py-1">重新讀取</button></div>}
    {!students.length ? <p className="bg-white border rounded-xl p-8 text-gray-500 text-center">尚無實習生。請在「參數與權限」將學員類型設為實習生。</p> : <>
      {ready && <InternDashboardCharts students={scope} entriesByStudent={entriesByStudent} overall={view === 'overall'} onOpen={(uid, assessment, formId, recordId) => setDrawer({ uid, tab: 'assessment', assessment, formId, recordId })} />}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[['核心訓練通過', ready ? `${totals.completed}／${scope.length * 50}` : '—'], ['OSCE 通過', ready ? `${totals.osce}／${scope.length * 4}` : '—'], ['安全訓練完成', ready ? `${totals.safety}／${scope.length * 5}` : '—'], ['待再加強', ready ? `${totals.reinforce} 項` : '—']].map(([label, value]) => <div key={label} className="bg-white border border-gray-100 rounded-xl p-4"><p className="text-xs text-gray-500">{label}</p><p className="font-bold text-xl text-indigo-900 mt-2">{value}</p></div>)}</div>
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden"><div className="px-4 py-3 border-b font-bold text-gray-800">實習進度總覽</div><div className="overflow-x-auto"><table className="w-full text-sm whitespace-nowrap"><thead className="bg-gray-50 text-gray-600"><tr>{['實習生／梯次', '核心訓練', 'OSCE', '安全訓練', '成果繳交', '總成績', '操作'].map(title => <th key={title} className="px-4 py-3 text-left">{title}</th>)}</tr></thead><tbody>{scope.map(student => { const summary = loaded(student.id) ? summarizeIntern(student, entriesByStudent[student.id]) : null; return <tr key={student.id} className="border-t border-gray-100"><td className="p-4 font-bold text-gray-800">{student.displayName}<p className="text-xs font-normal text-gray-500">{student.internshipCohort || '未設定梯次'}</p></td><td className="p-4">{summary ? `${summary.progress.complete}／50（${summary.progress.percent}%）` : errors[student.id] ? '讀取失敗' : '讀取中…'}</td><td className="p-4">{summary ? `${summary.osce}／4` : '—'}</td><td className="p-4">{summary ? `${summary.safety}／5` : '—'}</td><td className="p-4">{summary ? `${summary.submissions}／4` : '—'}</td><td className="p-4">{summary?.score ?? '尚未評分'}</td><td className="p-4"><button type="button" disabled={!summary} onClick={() => setDrawer({ uid: student.id, tab: 'training' })} className="text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-md disabled:opacity-40">開啟護照</button></td></tr>; })}</tbody></table></div></div>
      <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-bold text-gray-800">完整紀錄與歷次評核</h3><div className="flex flex-wrap gap-2"><select aria-label="紀錄類別" className="border rounded-lg p-2 text-sm" value={kind} onChange={event => setKind(event.target.value)}><option value="all">全部類別</option>{Object.entries(INTERN_RECORD_KINDS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><input aria-label="搜尋實習紀錄" placeholder="搜尋項目、填寫者或評語" value={search} onChange={event => setSearch(event.target.value)} className="border rounded-lg p-2 text-sm w-full sm:w-60" /></div></div>
        {!ready && scope.length > 0 && !scope.some(student => errors[student.id]) ? <p className="flex items-center gap-2 text-gray-500 py-5"><Loader2 size={18} className="animate-spin" />正在讀取完整紀錄…</p> : <><p className="text-xs text-gray-500">符合篩選 {rows.length} 筆，保留重評、重測及學生提交的歷次版本。</p><div className="overflow-x-auto max-h-[32rem]"><table className="w-full text-sm min-w-[700px]"><thead className="bg-gray-50 sticky top-0"><tr>{['日期', '實習生', '類別／項目', '結果', '填寫者', '操作'].map(title => <th key={title} className="p-3 text-left text-gray-600">{title}</th>)}</tr></thead><tbody>{rows.map(({ student, entry }) => <tr key={`${student.id}:${entry.id}`} className="border-b border-gray-100"><td className="p-3 whitespace-nowrap">{entry.payload.date}</td><td className="p-3 whitespace-nowrap">{student.displayName}</td><td className="p-3"><p className="text-xs text-gray-500">{INTERN_RECORD_KINDS[entry.kind] || entry.kind}</p><p className="font-medium">{getInternRecordTitle(entry)}</p></td><td className="p-3 whitespace-nowrap">{getInternRecordStatus(entry)}</td><td className="p-3">{entry.actorName}</td><td className="p-3"><button type="button" className="text-indigo-700 inline-flex items-center gap-1 whitespace-nowrap" onClick={() => setDrawer({ uid: student.id, entry })}><Eye size={14} />檢視紀錄</button></td></tr>)}</tbody></table></div>{ready && rows.length === 0 && <p className="py-6 text-center text-gray-500">目前沒有符合條件的紀錄。</p>}</>}
      </div>
    </>}
    {drawerStudent && <div className="fixed inset-0 z-[65] bg-black/50 p-2 sm:p-5 flex items-center justify-center"><section role="dialog" aria-modal="true" aria-label="後台實習生護照紀錄" className="bg-gray-50 rounded-xl shadow-xl w-full max-w-6xl max-h-[94vh] overflow-auto"><header className="sticky top-0 z-10 bg-white border-b px-4 py-3 flex items-center justify-between gap-4"><strong>{drawerStudent.displayName}・{drawer.entry ? getInternRecordTitle(drawer.entry) : '實習生學習護照'}</strong><button type="button" aria-label="關閉後台護照紀錄" onClick={() => setDrawer(null)}><X size={22} /></button></header>{drawer.entry ? <div className="intern-passport"><InternRecordHistory key={drawer.entry.id} entries={[drawer.entry]} defaultOpen /><button type="button" className="ip-button ip-primary" onClick={() => setDrawer({ uid: drawer.uid, tab: tabFor(drawer.entry.kind), assessment: drawer.entry.kind.startsWith('dops') ? 'dops' : drawer.entry.kind === 'exam' ? 'exam' : 'osce', formId: drawer.entry.kind.startsWith('dops') ? drawer.entry.targetId : undefined, recordId: drawer.entry.kind === 'dops' ? drawer.entry.payload.instanceId : drawer.entry.payload.assessmentId || drawer.entry.id })}>開啟對應護照功能</button></div> : <InternPassport key={`${drawer.uid}:${drawer.tab}`} student={{ ...drawerStudent, viewerRole: userRole }} initialTab={drawer.tab} initialAssessment={drawer.assessment} initialDopsForm={drawer.formId} initialAssessmentRecord={drawer.recordId} loading={!loaded(drawer.uid)} error={errors[drawer.uid] || ""} entries={(entriesByStudent[drawer.uid] || []).filter(entry => entry.kind !== 'materialRead')} isTeacher onSave={entry => save(drawer.uid, entry)} currentUserName={user.displayName || user.email} preview={Boolean(preview)} materialPreview={preview} hidePreviewNotice />}</section></div>}
  </section>;
}
