import React, { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ReferenceLine
} from 'recharts';
import {
  Activity, AlertTriangle, ArrowRight, CheckCircle2, CheckSquare,
  ClipboardList, Clock3, Target, TrendingUp, UserRound, XCircle
} from 'lucide-react';
import { DOPS_FORMS } from '../data/dopsForms';
import { EPA_CONFIG } from '../data/EPA_Config';
import { FINAL_ASSESSMENT_CATEGORIES } from '../data/FinalAssessment_Config';

const CHART_COLORS = ['#4F46E5', '#10B981'];
const EPA_LEVEL_LABELS = ['', '2a', '2b', '3a', '3b', '3c', '4', '5'];

const STATUS_STYLES = {
  passed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  improvement: 'bg-red-50 text-red-700 border-red-200',
  unassessed: 'bg-gray-100 text-gray-600 border-gray-200'
};

const STATUS_LABELS = {
  passed: '已達標',
  pending: '待學員回饋',
  improvement: '待加強／重評',
  unassessed: '尚未評核'
};

const normalizeEmail = value => String(value || '').trim().toLowerCase();
const normalizeEPAId = value => String(value || '').trim().toUpperCase().replaceAll('-', '_');
const toTimestamp = value => {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
};
const sortByDate = records => [...records].sort((a, b) => toTimestamp(a.date) - toTimestamp(b.date));
const latestRecord = records => sortByDate(records).at(-1) || null;

const extractEpaLevelIndex = level => {
  const value = String(level || '').toLowerCase();
  if (value.includes('2a')) return 1;
  if (value.includes('2b')) return 2;
  if (value.includes('3a')) return 3;
  if (value.includes('3b')) return 4;
  if (value.includes('3c')) return 5;
  if (/(^|\D)4(\D|$)/.test(value)) return 6;
  if (/(^|\D)5(\D|$)/.test(value)) return 7;
  return 0;
};

const extractDopsScore = formData => {
  const rawScore = formData?.global_rating ?? formData?.overall_score;
  const score = Number(rawScore);
  return Number.isFinite(score) && score >= 1 && score <= 10 ? score : null;
};

const extractAverageScore = scores => {
  const values = Object.values(scores || {})
    .filter(value => value !== 'NA' && value !== 'N/A')
    .map(Number)
    .filter(value => Number.isFinite(value) && value > 0 && value <= 9);
  if (!values.length) return null;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1));
};

const getTrend = (records, getValue) => {
  const values = sortByDate(records).map(getValue).filter(value => value !== null && value !== undefined && value > 0);
  if (values.length < 2) return '—';
  const difference = values.at(-1) - values.at(-2);
  if (difference > 0) return '↑ 上升';
  if (difference < 0) return '↓ 下降';
  return '→ 持平';
};

const buildAssessmentLink = (studentEmail, assessment, recordId = '', formId = '') => {
  const params = new URLSearchParams({ section: 'passport', assessment, studentEmail });
  if (recordId) params.set('recordId', recordId);
  if (formId) params.set('formId', formId);
  return `${window.location.pathname}?${params.toString()}`;
};

const StatusBadge = ({ status }) => (
  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${STATUS_STYLES[status]}`}>
    {STATUS_LABELS[status]}
  </span>
);

const MetricCard = ({ icon: Icon, label, value, suffix, detail, color }) => (
  <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm min-w-0">
    <div className="flex items-center gap-2 text-sm font-bold text-gray-600">
      <span className={`p-2 rounded-lg ${color}`}>{React.createElement(Icon, { className: 'w-4 h-4' })}</span>
      <span className="truncate">{label}</span>
    </div>
    <p className="mt-3 text-3xl font-black text-gray-900">
      {value}<span className="ml-1 text-base font-bold text-gray-400">{suffix}</span>
    </p>
    <p className="mt-1 text-xs font-medium text-gray-500">{detail}</p>
  </div>
);

const ProgressMatrix = ({ title, icon: Icon, iconColor, rows }) => (
  <section className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
    <div className="px-4 md:px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
      <h3 className="font-bold text-gray-800 flex items-center gap-2">
        {React.createElement(Icon, { className: `w-5 h-5 ${iconColor}` })} {title}
      </h3>
      <span className="text-xs text-gray-400">以最新一次評核判定</span>
    </div>

    <div className="hidden md:block overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-500">
          <tr>
            <th className="px-5 py-3 text-left font-bold">評核項目</th>
            <th className="px-4 py-3 text-left font-bold">最新結果</th>
            <th className="px-4 py-3 text-center font-bold">歷次</th>
            <th className="px-4 py-3 text-left font-bold">趨勢</th>
            <th className="px-4 py-3 text-left font-bold">狀態</th>
            <th className="px-5 py-3 text-right font-bold">紀錄</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(row => (
            <tr key={row.id} className="hover:bg-gray-50">
              <td className="px-5 py-3.5 font-bold text-gray-800">{row.title}</td>
              <td className="px-4 py-3.5 text-gray-700">{row.result}<div className="text-[11px] text-gray-400">{row.date || '尚無日期'}</div></td>
              <td className="px-4 py-3.5 text-center font-bold text-gray-600">{row.attempts}</td>
              <td className={`px-4 py-3.5 font-bold ${row.trend.startsWith('↓') ? 'text-red-600' : row.trend.startsWith('↑') ? 'text-emerald-600' : 'text-gray-500'}`}>{row.trend}</td>
              <td className="px-4 py-3.5"><StatusBadge status={row.status} /></td>
              <td className="px-5 py-3.5 text-right">
                <a href={row.link} className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-bold text-xs">查看 <ArrowRight className="w-3.5 h-3.5" /></a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <div className="md:hidden divide-y divide-gray-100">
      {rows.map(row => (
        <a key={row.id} href={row.link} className="block p-4 active:bg-gray-50">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-bold text-gray-800 leading-snug">{row.title}</p>
              <p className="text-sm text-gray-600 mt-1">{row.result}・共 {row.attempts} 次</p>
              <p className="text-xs text-gray-400 mt-1">{row.date || '尚無評核日期'}・{row.trend}</p>
            </div>
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <StatusBadge status={row.status} />
              <ArrowRight className="w-4 h-4 text-indigo-500" />
            </div>
          </div>
        </a>
      ))}
    </div>
  </section>
);

const DashboardCharts = ({ studentEmail, studentProfile, dashboardData, updatedAt }) => {
  const processedData = useMemo(() => {
    if (!dashboardData || !studentEmail || dashboardData.status === 'error') return null;
    const targetEmail = normalizeEmail(studentEmail);
    const matchesStudent = record => normalizeEmail(record.email) === targetEmail;

    const studentDOPS = (dashboardData.dops || []).filter(matchesStudent);
    const studentMiniCEX = (dashboardData.minicex || []).filter(matchesStudent);
    const studentOSCE = (dashboardData.osce || []).filter(matchesStudent);
    const studentKSA = (dashboardData.ksa || []).filter(matchesStudent);
    const studentEPA = (dashboardData.epa || []).filter(matchesStudent);
    const studentFinal = dashboardData.final?.[studentEmail]
      || Object.entries(dashboardData.final || {}).find(([email]) => normalizeEmail(email) === targetEmail)?.[1]
      || null;

    const epaRows = EPA_CONFIG.map(epa => {
      const records = studentEPA.filter(record => normalizeEPAId(record.epaId) === normalizeEPAId(epa.id));
      const latest = latestRecord(records);
      const levelIndex = extractEpaLevelIndex(latest?.level);
      const feedbackCompleted = Boolean(latest?.feedbackReflection) || Number(latest?.feedbackSatisfaction) > 0;
      const status = !latest ? 'unassessed' : !feedbackCompleted ? 'pending' : levelIndex >= 6 ? 'passed' : 'improvement';

      return {
        id: epa.id,
        title: String(epa.title).replace(/^EPA\s*\d+[.、]?\s*/iu, ''),
        result: latest ? `Level ${EPA_LEVEL_LABELS[levelIndex] || latest.level}` : '尚未評核',
        attempts: records.length,
        trend: getTrend(records, record => extractEpaLevelIndex(record.level)),
        date: latest?.date || '',
        status,
        passed: levelIndex >= 6,
        latest,
        link: buildAssessmentLink(studentEmail, 'epa', latest?.recordId || '')
      };
    });

    const dopsRows = DOPS_FORMS.map(form => {
      const records = studentDOPS.filter(record => record.dopsId === form.id);
      const latest = latestRecord(records);
      const score = extractDopsScore(latest?.formData);
      const pendingFeedback = latest?.status === 'teacher_graded';
      const assessmentCompleted = ['completed', 'needs_improvement'].includes(latest?.status);
      const status = !latest || (!assessmentCompleted && !pendingFeedback)
        ? 'unassessed'
        : pendingFeedback
          ? 'pending'
          : score !== null && score >= 8 && latest?.status === 'completed'
            ? 'passed'
            : 'improvement';

      return {
        id: form.id,
        title: form.title.replace(/\s*DOPS\s*$/iu, '').trim(),
        result: score !== null ? `${score} / 10 分` : latest ? '尚無整體評分' : '尚未評核',
        attempts: records.length,
        trend: getTrend(records, record => extractDopsScore(record.formData)),
        date: latest?.date || '',
        status,
        passed: score !== null && score >= 8 && ['teacher_graded', 'completed'].includes(latest?.status),
        latest,
        link: buildAssessmentLink(studentEmail, 'dops', latest?.recordId || '', form.id)
      };
    });

    const latestMiniCEX = latestRecord(studentMiniCEX);
    const miniCEXScore = extractAverageScore(latestMiniCEX?.scores);
    const miniCEXStatus = !latestMiniCEX ? 'unassessed' : latestMiniCEX.status === 'teacher_graded' ? 'pending' : miniCEXScore >= 4 ? 'passed' : 'improvement';
    const latestOSCE = latestRecord(studentOSCE);
    const osceScore = latestOSCE ? Number(latestOSCE.total_score) : null;
    const osceStatus = !latestOSCE ? 'unassessed' : latestOSCE.status === 'teacher_graded' ? 'pending' : osceScore >= 46 ? 'passed' : 'improvement';

    const clinicalRows = [
      ...epaRows,
      ...dopsRows,
      {
        id: 'minicex', title: 'Mini-CEX 臨床評估', result: miniCEXScore !== null ? `平均 ${miniCEXScore} 分` : '尚未評核',
        attempts: studentMiniCEX.length, date: latestMiniCEX?.date || '', status: miniCEXStatus,
        passed: miniCEXScore !== null && miniCEXScore >= 4, latest: latestMiniCEX,
        link: buildAssessmentLink(studentEmail, 'minicex', latestMiniCEX?.recordId || ''), type: 'Mini-CEX'
      },
      {
        id: 'osce', title: 'OSCE 評估', result: osceScore !== null ? `${osceScore} / 75 分` : '尚未評核',
        attempts: studentOSCE.length, date: latestOSCE?.date || '', status: osceStatus,
        passed: osceScore !== null && osceScore >= 46, latest: latestOSCE,
        link: buildAssessmentLink(studentEmail, 'osce', latestOSCE?.recordId || ''), type: 'OSCE'
      }
    ];

    const finalTotalCount = FINAL_ASSESSMENT_CATEGORIES.reduce((total, category) => total + category.items.length, 0);
    const finalPassedCount = Object.values(studentFinal?.items || {}).filter(item => item?.passed === true || item === true).length;
    const finalProgress = finalTotalCount ? Math.min(Math.round((finalPassedCount / finalTotalCount) * 100), 100) : 0;
    const achievedCount = clinicalRows.filter(row => row.passed).length;
    const unassessedCount = clinicalRows.filter(row => row.status === 'unassessed').length;
    const improvementCount = clinicalRows.filter(row => row.status === 'improvement').length;
    const pendingCount = clinicalRows.filter(row => row.status === 'pending').length;

    const priorityOrder = { pending: 1, improvement: 2, unassessed: 3 };
    const priorityItems = clinicalRows
      .filter(row => row.status !== 'passed')
      .map(row => ({ ...row, type: row.type || (epaRows.some(item => item.id === row.id) ? 'EPA' : 'DOPS') }))
      .sort((a, b) => priorityOrder[a.status] - priorityOrder[b.status] || a.title.localeCompare(b.title, 'zh-Hant'));

    const sortedKSA = sortByDate(studentKSA);
    const selectedKSA = sortedKSA.slice(-2);
    const radarData = [
      { subject: '專業知識', fullMark: 9 },
      { subject: '專業技能', fullMark: 9 },
      { subject: '專業態度', fullMark: 9 }
    ];
    const ksaSeries = selectedKSA.map((record, index) => {
      const key = index === selectedKSA.length - 1 ? 'latest' : 'previous';
      const label = `階段 ${record.phaseId}`;
      const groups = ['k', 's', 'a'].map(prefix => Object.entries(record.scores || {})
        .filter(([field]) => field.toLowerCase().startsWith(prefix))
        .map(([, value]) => Number(value))
        .filter(Number.isFinite));
      groups.forEach((values, groupIndex) => {
        radarData[groupIndex][key] = values.length ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1)) : 0;
      });
      return { key, label };
    });

    const minicexTimeline = sortByDate(studentMiniCEX).map(record => ({ date: record.date, score: extractAverageScore(record.scores) })).filter(record => record.score !== null);
    const osceTimeline = sortByDate(studentOSCE).map(record => ({ date: record.date, score: Number(record.total_score) })).filter(record => Number.isFinite(record.score));
    const allDates = [...studentDOPS, ...studentMiniCEX, ...studentOSCE, ...studentKSA, ...studentEPA].map(record => record.date).filter(Boolean).sort((a, b) => toTimestamp(b) - toTimestamp(a));

    return {
      epaRows, dopsRows, priorityItems, radarData, ksaSeries, minicexTimeline, osceTimeline,
      metrics: {
        finalProgress, finalPassedCount, finalTotalCount, achievedCount,
        clinicalTotal: clinicalRows.length, unassessedCount, improvementCount, pendingCount
      },
      latestAssessmentDate: allDates[0] || '',
      hasData: clinicalRows.some(row => row.attempts > 0) || finalPassedCount > 0 || studentKSA.length > 0
    };
  }, [dashboardData, studentEmail]);

  if (!processedData) return <div className="text-gray-400 text-center py-8">資料解析中...</div>;

  const arrivalTimestamp = toTimestamp(studentProfile?.arrivalDate);
  const trainingDays = arrivalTimestamp ? Math.max(1, Math.floor((Date.now() - arrivalTimestamp) / 86400000) + 1) : null;
  const refreshedAt = updatedAt || (dashboardData?.generatedAt ? new Date(dashboardData.generatedAt) : null);

  return (
    <div className="space-y-6 animate-in fade-in mt-4">
      <div className="bg-white border border-gray-100 rounded-xl px-4 md:px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-indigo-50 rounded-xl"><UserRound className="w-5 h-5 text-indigo-600" /></div>
          <div>
            <h3 className="font-black text-gray-900">{studentProfile?.displayName || studentEmail}</h3>
            <p className="text-xs text-gray-500 mt-1">
              {studentProfile?.arrivalDate ? `到職日 ${studentProfile.arrivalDate}` : '尚未設定到職日'}
              {trainingDays ? `・訓練第 ${trainingDays} 天` : ''}
              {processedData.latestAssessmentDate ? `・最近評核 ${processedData.latestAssessmentDate}` : ''}
            </p>
          </div>
        </div>
        <p className="text-xs text-gray-400">資料更新：{refreshedAt && !Number.isNaN(refreshedAt.getTime()) ? refreshedAt.toLocaleString('zh-TW', { hour12: false }) : '尚未更新'}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        <MetricCard icon={TrendingUp} label="完訓進度" value={processedData.metrics.finalProgress} suffix="%" detail={`${processedData.metrics.finalPassedCount} / ${processedData.metrics.finalTotalCount} 項完成`} color="bg-purple-100 text-purple-700" />
        <MetricCard icon={CheckCircle2} label="臨床評核達標" value={processedData.metrics.achievedCount} suffix="項" detail={`共 ${processedData.metrics.clinicalTotal} 項評核`} color="bg-emerald-100 text-emerald-700" />
        <MetricCard icon={Clock3} label="尚未評核" value={processedData.metrics.unassessedCount} suffix="項" detail="尚無任何評核紀錄" color="bg-gray-100 text-gray-700" />
        <MetricCard icon={XCircle} label="待加強／重評" value={processedData.metrics.improvementCount} suffix="項" detail="最新結果尚未達標" color="bg-red-100 text-red-700" />
        <MetricCard icon={AlertTriangle} label="待學員回饋" value={processedData.metrics.pendingCount} suffix="項" detail="教師已完成評核" color="bg-amber-100 text-amber-700" />
      </div>

      <section className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 md:px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-gray-900 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-500" />優先處理事項</h3>
            <p className="text-xs text-gray-500 mt-1">依待回饋、待加強、尚未評核排序</p>
          </div>
          <span className="text-xs font-bold text-gray-500">共 {processedData.priorityItems.length} 項</span>
        </div>
        {processedData.priorityItems.length ? (
          <div className="divide-y divide-gray-100">
            {processedData.priorityItems.slice(0, 8).map(item => (
              <a key={`${item.type}-${item.id}`} href={item.link} className="flex items-center justify-between gap-3 px-4 md:px-5 py-3.5 hover:bg-gray-50">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-800 truncate"><span className="text-indigo-600 mr-2">{item.type}</span>{item.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{item.result}{item.date ? `・${item.date}` : ''}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0"><StatusBadge status={item.status} /><ArrowRight className="w-4 h-4 text-indigo-500" /></div>
              </a>
            ))}
            {processedData.priorityItems.length > 8 && <p className="px-5 py-3 text-xs text-center text-gray-500">另有 {processedData.priorityItems.length - 8} 項，請於下方進度矩陣查看。</p>}
          </div>
        ) : (
          <div className="p-6 text-center text-emerald-700 bg-emerald-50"><CheckCircle2 className="w-6 h-6 mx-auto mb-2" />目前沒有待處理評核事項。</div>
        )}
      </section>

      <ProgressMatrix title="EPA 評核進度" icon={Activity} iconColor="text-indigo-600" rows={processedData.epaRows} />
      <ProgressMatrix title="DOPS 評核進度" icon={CheckSquare} iconColor="text-blue-600" rows={processedData.dopsRows} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4">KSA 核心能力：最近兩階段</h3>
          <div className="h-72 w-full">
            {processedData.ksaSeries.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={processedData.radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#4B5563', fontSize: 13, fontWeight: 'bold' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 9]} tick={{ fontSize: 10 }} />
                  {processedData.ksaSeries.map((series, index) => <Radar key={series.key} name={series.label} dataKey={series.key} stroke={CHART_COLORS[index]} strokeWidth={2} fill={CHART_COLORS[index]} fillOpacity={0.14} />)}
                  <Tooltip /><Legend />
                </RadarChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-gray-400">尚無 KSA 評估資料</div>}
          </div>
        </section>

        <section className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Target className="w-5 h-5 text-teal-500" />Mini-CEX 表現軌跡</h3>
          <div className="h-72 w-full">
            {processedData.minicexTimeline.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={processedData.minicexTimeline} margin={{ right: 15, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis domain={[0, 9]} />
                  <Tooltip /><ReferenceLine y={4} stroke="#EF4444" strokeDasharray="4 4" label={{ value: '達標 4 分', fill: '#EF4444', fontSize: 11 }} />
                  <Line type="monotone" dataKey="score" name="平均分數" stroke="#14B8A6" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-gray-400">尚無 Mini-CEX 資料</div>}
          </div>
        </section>

        <section className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 lg:col-span-2">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><ClipboardList className="w-5 h-5 text-yellow-500" />OSCE 表現軌跡</h3>
          <div className="h-64 w-full">
            {processedData.osceTimeline.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={processedData.osceTimeline} margin={{ right: 15, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis domain={[0, 75]} />
                  <Tooltip /><ReferenceLine y={46} stroke="#EF4444" strokeDasharray="4 4" label={{ value: '達標 46 分', fill: '#EF4444', fontSize: 11 }} />
                  <Line type="monotone" dataKey="score" name="總分" stroke="#F59E0B" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-gray-400">尚無 OSCE 資料</div>}
          </div>
        </section>
      </div>

      {!processedData.hasData && <div className="text-orange-700 bg-orange-50 p-5 rounded-xl text-center font-bold border border-orange-200">此學員目前沒有評核或完訓紀錄，尚未評核項目已列於上方。</div>}
    </div>
  );
};

export default DashboardCharts;
