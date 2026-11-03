import { BarChart3, ClipboardCheck, Clock3, MessageSquareText, Target, ArrowRight } from 'lucide-react';
import { AssessmentBIChart, MetricCard } from './DashboardCharts';
import { buildInternAssessmentRows } from '../utils/internDashboard';
import { summarizeIntern } from '../utils/internAdmin';

const labels = { passed: '已達標', pending: '待學員回饋', improvement: '待加強／重評', unassessed: '尚未評核' };
export default function InternDashboardCharts({ students, entriesByStudent, overall, onOpen }) {
  const summaries = students.map(student => ({ student, summary: summarizeIntern(student, entriesByStudent[student.id] || []), rows: buildInternAssessmentRows(entriesByStudent[student.id] || []) }));
  const assessmentRows = summaries.flatMap(item => [...item.rows.osce, ...item.rows.dops]);
  const pending = assessmentRows.filter(row => row.status === 'pending').length;
  const improvement = assessmentRows.filter(row => row.status === 'improvement').length;
  const completed = assessmentRows.filter(row => row.passed).length;
  const unassessed = assessmentRows.filter(row => row.status === 'unassessed').length;
  const first = summaries[0];
  return <div className="space-y-5" aria-label="實習生學習儀表板">
    <section className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-900 text-white p-5"><div className="flex items-center gap-3"><BarChart3 /><div><h2 className="text-xl font-bold">{overall ? '實習生整體學習儀表板' : `${first?.student.displayName || '實習生'}・學習儀表板`}</h2><p className="mt-1 text-sm text-slate-300">依最新評核與對應回饋統計；保留歷次評估與重測紀錄。</p></div></div></section>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[
      [Target, '已達標', completed, '教師評核通過且完成學員回饋', 'bg-emerald-50 text-emerald-600'],
      [MessageSquareText, '待學員回饋', pending, '教師已送出，等待對應評核回饋', 'bg-amber-50 text-amber-600'],
      [Clock3, '待加強／重評', improvement, '依 OSCE 教師判定或 DOPS 重測規則', 'bg-red-50 text-red-600'],
      [ClipboardCheck, '尚未評核', unassessed, '含教師草稿；DOPS 依附件 5 評核', 'bg-indigo-50 text-indigo-600'],
    ].map(([Icon, label, value, detail, color]) => <MetricCard key={label} icon={Icon} label={label} value={value} suffix="項" detail={detail} color={color} />)}</div>
    {overall ? <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden"><h3 className="p-4 font-bold border-b">學員評核完成矩陣</h3><div className="overflow-x-auto"><table className="w-full text-sm whitespace-nowrap"><thead className="bg-slate-50"><tr>{['實習生', '核心訓練', 'OSCE 達標', 'DOPS 達標', '待回饋', '待加強／重評', '操作'].map(label => <th key={label} className="p-3 text-left">{label}</th>)}</tr></thead><tbody>{summaries.map(({ student, summary, rows }) => { const all = [...rows.osce, ...rows.dops]; return <tr key={student.id} className="border-t"><th className="p-3 text-left">{student.displayName}</th><td className="p-3">{summary.progress.complete}／50</td><td className="p-3">{rows.osce.filter(row => row.passed).length}／4</td><td className="p-3">{rows.dops.filter(row => row.passed).length}／{rows.dops.length}</td><td className="p-3">{all.filter(row => row.status === 'pending').length}</td><td className="p-3">{all.filter(row => row.status === 'improvement').length}</td><td className="p-3"><button className="text-indigo-700 font-bold" onClick={() => onOpen(student.id, 'osce')}>查看個別評估</button></td></tr>; })}</tbody></table></div></section> : first && <>
      <div className="grid lg:grid-cols-2 gap-5"><AssessmentBIChart title="OSCE 四站表現" subtitle="整體評估 0–10 分；達標依教師判定及學員回饋" icon={ClipboardCheck} rows={first.rows.osce} type="osce" threshold={null} /><AssessmentBIChart title="DOPS 技能表現" subtitle="依附件 5 評估 PPE；逐項符合、8 分以上並完成回饋為達標" icon={Target} rows={first.rows.dops} type="dops" /></div>
      <section className="bg-white rounded-2xl border border-slate-200 p-5"><h3 className="font-bold mb-4">六大領域訓練進度</h3><div className="grid gap-4 sm:grid-cols-2">{first.rows.domains.map(domain => <div key={domain.id}><div className="flex justify-between text-sm mb-2"><span>{domain.title}</span><strong>{domain.complete}／{domain.total}</strong></div><div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="bg-indigo-500 h-full" style={{ width: `${domain.complete / domain.total * 100}%` }} /></div></div>)}</div></section>
      <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden"><h3 className="p-4 font-bold border-b">評核追蹤與待辦</h3><div className="divide-y">{[...first.rows.osce, ...first.rows.dops].map(row => <div key={row.id} className="p-4 flex items-center justify-between gap-3"><div><p className="font-bold text-slate-800">{row.title}</p><p className="text-xs text-slate-500 mt-1">{row.draft ? '教師草稿' : labels[row.status]}・共 {row.attempts} 次評估{row.date ? `・最近 ${row.date}` : ''}</p></div><button type="button" className="text-indigo-700 font-bold text-sm flex items-center gap-1 shrink-0" onClick={() => onOpen(first.student.id, row.assessment, row.id, row.recordId)}>開啟評估<ArrowRight size={14} /></button></div>)}</div></section>
    </>}
    <p className="text-xs text-slate-500">OSCE 保留實習計畫四站與教師判定。PPE 須逐項符合；DOPS 6 分以下於 1 個月後重測，7 分於 1 週後重測。圖表不將未評核項目當作實際零分。</p>
  </div>;
}
