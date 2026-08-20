import React, { useMemo } from 'react';
import {
  BarChart, Bar, Cell, LabelList, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Radar, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, ReferenceLine
} from 'recharts';
import {
  Activity, AlertTriangle, ArrowRight, CheckCircle2, CheckSquare,
  BarChart3, ClipboardList, Clock3, Heart, MessageSquareText, Target,
  TrendingUp, UserRound, XCircle
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

const STATUS_CHART_COLORS = {
  passed: '#10B981',
  pending: '#F59E0B',
  improvement: '#EF4444',
  unassessed: '#CBD5E1'
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

const AssessmentLabelKey = ({ rows }) => (
  <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-3">
    <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">評估項目</p>
    <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
      {rows.map(row => (
        <div key={row.id} className="flex items-start gap-2 text-[11px] leading-4">
          <span className="min-w-12 rounded-md bg-white px-1.5 py-0.5 text-center font-black text-indigo-600 ring-1 ring-slate-200">{row.label}</span>
          <span className="font-medium text-slate-600">{row.title}</span>
        </div>
      ))}
    </div>
  </div>
);

const AssessmentChartTooltip = ({ active, payload, type }) => {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  const displayValue = type === 'epa'
    ? item.value > 0 ? `Level ${EPA_LEVEL_LABELS[item.value]}` : '尚未評核'
    : item.value > 0 ? `${item.value} / 10 分` : '尚未評核';

  return (
    <div className="max-w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
      <p className="text-xs font-black text-slate-900">{item.title}</p>
      <p className="mt-1 text-sm font-bold text-indigo-600">{displayValue}</p>
      <div className="mt-2 flex items-center justify-between gap-4 text-[11px] text-slate-500">
        <span>{STATUS_LABELS[item.status]}</span>
        <span>共 {item.attempts} 次</span>
      </div>
      {item.date && <p className="mt-1 text-[11px] text-slate-400">最近評核：{item.date}</p>}
    </div>
  );
};

const AssessmentBIChart = ({ title, subtitle, icon: Icon, rows, type }) => {
  const isEPA = type === 'epa';
  const chartData = rows.map((row, index) => ({
    ...row,
    label: `${isEPA ? 'EPA' : 'DOPS'} ${index + 1}`,
    axisLabel: `${isEPA ? 'EPA' : 'DOPS'}${index + 1}`,
    value: row.value || 0
  }));
  const achievedCount = rows.filter(row => row.passed).length;
  const evaluatedCount = rows.filter(row => row.evaluated).length;
  const attentionCount = rows.filter(row => ['pending', 'improvement'].includes(row.status)).length;
  const completionRate = rows.length ? Math.round((evaluatedCount / rows.length) * 100) : 0;
  const achievementRate = evaluatedCount ? Math.round((achievedCount / evaluatedCount) * 100) : 0;
  const valueFormatter = value => isEPA ? EPA_LEVEL_LABELS[value] || '' : value;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-900 px-4 py-4 text-white md:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <span className="rounded-xl bg-white/10 p-2.5 ring-1 ring-white/15">
              {React.createElement(Icon, { className: 'w-5 h-5 text-indigo-200' })}
            </span>
            <div className="min-w-0">
              <h3 className="font-black tracking-wide">{title}</h3>
              <p className="mt-1 text-xs text-slate-300">{subtitle}</p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-200">完成率</p>
              <p className="text-3xl font-black leading-none mt-1">{completionRate}<span className="ml-1 text-sm text-indigo-200">%</span></p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100 bg-slate-50/70">
        <div className="px-3 py-3 text-center"><p className="text-xl font-black text-slate-900">{evaluatedCount}<span className="text-xs text-slate-400">／{rows.length}</span></p><p className="text-[11px] font-bold text-slate-500">已評核</p></div>
        <div className="px-3 py-3 text-center"><p className="text-xl font-black text-emerald-600">{achievedCount}</p><p className="text-[11px] font-bold text-slate-500">已達標</p></div>
        <div className="px-3 py-3 text-center"><p className="text-xl font-black text-indigo-600">{achievementRate}<span className="text-xs">%</span></p><p className="text-[11px] font-bold text-slate-500">達標率（{achievedCount}／{evaluatedCount}）</p></div>
      </div>

      {attentionCount > 0 && <div className="border-b border-amber-100 bg-amber-50 px-4 py-2 text-center text-[11px] font-bold text-amber-700">其中 {attentionCount} 項仍待回饋或需加強</div>}

      <div className="px-2 pt-5 md:px-4">
        <div className="h-72 w-full md:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 22, right: 8, left: isEPA ? -8 : -12, bottom: 4 }} barCategoryGap="18%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="axisLabel" interval={0} tick={{ fontSize: 9, fill: '#64748B', fontWeight: 800 }} height={34} />
              <YAxis
                domain={isEPA ? [0, 7] : [0, 10]}
                ticks={isEPA ? [1, 2, 3, 4, 5, 6, 7] : [0, 2, 4, 6, 8, 10]}
                tickFormatter={valueFormatter}
                tick={{ fontSize: 10, fill: '#64748B', fontWeight: 700 }}
              />
              <Tooltip content={<AssessmentChartTooltip type={type} />} cursor={{ fill: '#F8FAFC' }} />
              <ReferenceLine
                y={isEPA ? 6 : 8}
                stroke="#DC2626"
                strokeDasharray="5 4"
                label={{ value: isEPA ? 'Level 4 達標' : '8 分達標', fill: '#DC2626', fontSize: 10, fontWeight: 700, position: 'insideTopRight' }}
              />
              <Bar dataKey="value" radius={[5, 5, 0, 0]} maxBarSize={42}>
                {chartData.map(item => <Cell key={item.id} fill={STATUS_CHART_COLORS[item.status]} />)}
                <LabelList dataKey="value" position="top" formatter={value => value > 0 ? isEPA ? EPA_LEVEL_LABELS[value] : value : ''} style={{ fill: '#334155', fontSize: 10, fontWeight: 800 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <AssessmentLabelKey rows={chartData} />
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 border-t border-slate-100 py-3 text-[11px] font-bold text-slate-500">
          {Object.entries(STATUS_LABELS).map(([status, label]) => (
            <span key={status} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: STATUS_CHART_COLORS[status] }} />{label}</span>
          ))}
        </div>
      </div>
    </section>
  );
};

const SatisfactionTrendTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="max-w-64 rounded-xl border border-violet-100 bg-white p-3 shadow-xl">
      <p className="text-xs font-black text-slate-900">{item.title}</p>
      <p className="mt-1 text-lg font-black text-violet-600">{item.score}／9</p>
      <p className="mt-1 text-[11px] text-slate-400">
        {item.date}{item.count ? `・有效回饋 ${item.count} 筆` : `・第 ${item.attempt} 次回饋`}
      </p>
    </div>
  );
};

const SatisfactionAverageTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="max-w-64 rounded-xl border border-violet-100 bg-white p-3 shadow-xl">
      <p className="text-xs font-black text-slate-900">{item.title}</p>
      <p className="mt-1 text-lg font-black text-violet-600">平均 {item.average}／9</p>
      <p className="mt-1 text-[11px] text-slate-500">有效回饋 {item.count} 筆{item.count < 3 ? '・樣本數較少' : ''}</p>
    </div>
  );
};

const SatisfactionMetric = ({ label, value, detail, accent = 'text-slate-900' }) => (
  <div className="rounded-xl border border-violet-100 bg-white/90 px-3 py-3 shadow-sm">
    <p className="text-[11px] font-bold text-slate-500">{label}</p>
    <p className={`mt-1 text-2xl font-black ${accent}`}>{value}</p>
    <p className="mt-1 text-[10px] font-medium text-slate-400">{detail}</p>
  </div>
);

const SatisfactionDashboard = ({ satisfaction, overall = false }) => (
  <section className="overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 shadow-sm">
    <div className="border-b border-violet-100 px-4 py-4 md:px-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-black text-slate-900"><Heart className="h-5 w-5 fill-violet-100 text-violet-600" />學員回饋體驗</h2>
          <p className="mt-1 text-xs text-slate-500">{overall ? '彙整全部學員的教學體驗；滿意度不列入達標率或完訓成績。' : '滿意度反映教學體驗，不列入學員達標率或完訓成績。'}</p>
        </div>
        <p className="text-[11px] font-bold text-violet-500">量尺：1～9 分・未填資料不計為 0 分</p>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4 md:p-5">
      <SatisfactionMetric label="平均滿意度" value={satisfaction.count ? `${satisfaction.average}／9` : '—'} detail={`有效回饋 ${satisfaction.count} 筆`} accent="text-violet-700" />
      <SatisfactionMetric label="回饋完成率" value={`${satisfaction.responseRate}%`} detail={`${satisfaction.count}／${satisfaction.totalAssessments} 筆已填`} accent="text-indigo-700" />
      {overall
        ? <SatisfactionMetric label="回饋學員" value={`${satisfaction.feedbackLearners}／${satisfaction.totalLearners}`} detail="至少完成 1 筆滿意度回饋" accent="text-fuchsia-700" />
        : <SatisfactionMetric label="最近一次" value={satisfaction.latest ? `${satisfaction.latest.score}／9` : '—'} detail={satisfaction.latest?.date || '尚無回饋'} accent="text-fuchsia-700" />}
      <SatisfactionMetric label="需關注回饋" value={satisfaction.attentionItems.length} detail="低分或較前次明顯下降" accent={satisfaction.attentionItems.length ? 'text-red-600' : 'text-emerald-600'} />
    </div>

    <div className="grid grid-cols-1 gap-5 px-4 pb-5 md:px-5 xl:grid-cols-5">
      <div className="rounded-xl border border-violet-100 bg-white p-4 xl:col-span-3">
        <div className="flex items-center justify-between gap-3">
          <div><h3 className="text-sm font-black text-slate-800">{overall ? '每月平均滿意度趨勢' : '歷次滿意度趨勢'}</h3><p className="mt-1 text-[11px] text-slate-400">{overall ? '依月份彙整全部學員的有效滿意度回饋' : '依評核日期排列，呈現每筆學員滿意度'}</p></div>
          {satisfaction.change !== null && <span className={`rounded-full px-2.5 py-1 text-xs font-black ${satisfaction.change >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{satisfaction.change > 0 ? '+' : ''}{satisfaction.change}</span>}
        </div>
        <div className="mt-3 h-72 w-full">
          {satisfaction.timeline.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={satisfaction.timeline} margin={{ top: 18, right: 12, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EDE9FE" />
                <XAxis dataKey="displayDate" tick={{ fontSize: 10, fill: '#64748B' }} />
                <YAxis domain={[1, 9]} ticks={[1, 3, 5, 7, 9]} tick={{ fontSize: 10, fill: '#64748B' }} />
                <Tooltip content={<SatisfactionTrendTooltip />} />
                <ReferenceLine y={4} stroke="#EF4444" strokeDasharray="4 4" label={{ value: '需關注 ≤4', fill: '#DC2626', fontSize: 10, position: 'insideBottomRight' }} />
                <ReferenceLine y={7} stroke="#10B981" strokeDasharray="4 4" label={{ value: '良好區間', fill: '#059669', fontSize: 10, position: 'insideTopRight' }} />
                <Line type="monotone" dataKey="score" name="滿意度" stroke="#7C3AED" strokeWidth={3} dot={{ r: 4, fill: '#8B5CF6', strokeWidth: 2, stroke: '#FFFFFF' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="flex h-full items-center justify-center text-sm text-slate-400">尚無滿意度資料</div>}
        </div>
      </div>

      <div className="rounded-xl border border-violet-100 bg-white p-4 xl:col-span-2">
        <h3 className="text-sm font-black text-slate-800">各 EPA 項目平均滿意度</h3>
        <p className="mt-1 text-[11px] text-slate-400">滑鼠移入可查看回饋筆數與樣本提醒</p>
        <div className="mt-3 h-72 w-full">
          {satisfaction.byEPA.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={satisfaction.byEPA} margin={{ top: 18, right: 8, left: -18, bottom: 38 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EDE9FE" />
                <XAxis dataKey="label" interval={0} angle={-28} textAnchor="end" height={50} tick={{ fontSize: 10, fill: '#64748B', fontWeight: 700 }} />
                <YAxis domain={[0, 9]} ticks={[0, 3, 6, 9]} tick={{ fontSize: 10, fill: '#64748B' }} />
                <Tooltip content={<SatisfactionAverageTooltip />} cursor={{ fill: '#FAF5FF' }} />
                <ReferenceLine y={7} stroke="#10B981" strokeDasharray="4 4" />
                <Bar dataKey="average" fill="#8B5CF6" radius={[5, 5, 0, 0]} maxBarSize={38}>
                  <LabelList dataKey="average" position="top" style={{ fill: '#5B21B6', fontSize: 10, fontWeight: 800 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="flex h-full items-center justify-center text-sm text-slate-400">尚無可比較項目</div>}
        </div>
      </div>
    </div>

    <div className="border-t border-violet-100 bg-white/70 px-4 py-4 md:px-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-black text-slate-800"><MessageSquareText className="h-4 w-4 text-violet-600" />需關注回饋</h3>
        <span className="text-[11px] font-bold text-slate-400">滿意度 ≤4，或同項較前次下降 2 分以上</span>
      </div>
      {satisfaction.attentionItems.length ? (
        <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-2">
          {satisfaction.attentionItems.map(item => (
            <a key={item.recordId || `${item.epaId}-${item.date}`} href={item.link} className="flex items-start justify-between gap-3 rounded-xl border border-red-100 bg-red-50/70 p-3 hover:bg-red-50">
              <div className="min-w-0">
                <p className="truncate text-xs font-black text-slate-800">{item.learnerName ? `${item.learnerName}・` : ''}{item.title}</p>
                <p className="mt-1 text-[11px] font-bold text-red-600">{item.reason}・{item.date}</p>
                {item.reflection && <p className="mt-1 line-clamp-2 text-[11px] text-slate-500">{item.reflection}</p>}
              </div>
              <ArrowRight className="mt-1 h-4 w-4 flex-shrink-0 text-red-500" />
            </a>
          ))}
        </div>
      ) : <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-center text-xs font-bold text-emerald-700">目前沒有低分或明顯下降的回饋。</div>}
    </div>
  </section>
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

const isValidSatisfaction = value => {
  const score = Number(value);
  return Number.isFinite(score) && score >= 1 && score <= 9;
};

const getFinalRecord = (dashboardData, email) => {
  const targetEmail = normalizeEmail(email);
  return dashboardData.final?.[email]
    || Object.entries(dashboardData.final || {}).find(([recordEmail]) => normalizeEmail(recordEmail) === targetEmail)?.[1]
    || null;
};

const buildCohortStudent = (student, dashboardData) => {
  const email = student.email;
  const targetEmail = normalizeEmail(email);
  const matchesStudent = record => normalizeEmail(record.email) === targetEmail;
  const studentEPA = (dashboardData.epa || []).filter(matchesStudent);
  const studentDOPS = (dashboardData.dops || []).filter(matchesStudent);
  const studentMiniCEX = (dashboardData.minicex || []).filter(matchesStudent);
  const studentOSCE = (dashboardData.osce || []).filter(matchesStudent);

  const epaItems = EPA_CONFIG.map((epa, index) => {
    const latest = latestRecord(studentEPA.filter(record => normalizeEPAId(record.epaId) === normalizeEPAId(epa.id)));
    const levelIndex = extractEpaLevelIndex(latest?.level);
    const pending = Boolean(latest) && !String(latest.feedbackReflection || '').trim() && !isValidSatisfaction(latest.feedbackSatisfaction);
    return {
      id: epa.id,
      label: `EPA ${index + 1}`,
      title: String(epa.title).replace(/^EPA\s*\d+[.、]?\s*/iu, ''),
      evaluated: Boolean(latest),
      achieved: levelIndex >= 6,
      pending
    };
  });

  const dopsItems = DOPS_FORMS.map((form, index) => {
    const latest = latestRecord(studentDOPS.filter(record => record.dopsId === form.id));
    const score = extractDopsScore(latest?.formData);
    const evaluated = Boolean(latest) && ['teacher_graded', 'completed', 'needs_improvement'].includes(latest.status);
    return {
      id: form.id,
      label: `DOPS ${index + 1}`,
      title: form.title.replace(/\s*DOPS\s*$/iu, '').trim(),
      evaluated,
      achieved: evaluated && score !== null && score >= 8,
      pending: latest?.status === 'teacher_graded'
    };
  });

  const latestMiniCEX = latestRecord(studentMiniCEX);
  const miniCEXScore = extractAverageScore(latestMiniCEX?.scores);
  const latestOSCE = latestRecord(studentOSCE);
  const osceScore = latestOSCE ? Number(latestOSCE.total_score) : null;
  const clinicalItems = [
    ...epaItems,
    ...dopsItems,
    { id: 'minicex', evaluated: Boolean(latestMiniCEX), achieved: miniCEXScore !== null && miniCEXScore >= 4, pending: latestMiniCEX?.status === 'teacher_graded' },
    { id: 'osce', evaluated: Boolean(latestOSCE), achieved: Number.isFinite(osceScore) && osceScore >= 46, pending: latestOSCE?.status === 'teacher_graded' }
  ];
  const evaluatedCount = clinicalItems.filter(item => item.evaluated).length;
  const achievedCount = clinicalItems.filter(item => item.achieved).length;
  const pendingCount = clinicalItems.filter(item => item.pending).length;
  const finalRecord = getFinalRecord(dashboardData, email);
  const finalTotalCount = FINAL_ASSESSMENT_CATEGORIES.reduce((total, category) => total + category.items.length, 0);
  const finalPassedCount = Object.values(finalRecord?.items || {}).filter(item => item?.passed === true || item === true).length;

  return {
    email,
    name: student.displayName || email,
    arrivalDate: student.arrivalDate || '',
    epaItems,
    dopsItems,
    evaluatedCount,
    achievedCount,
    pendingCount,
    clinicalTotal: clinicalItems.length,
    completionRate: clinicalItems.length ? Math.round((evaluatedCount / clinicalItems.length) * 100) : 0,
    achievementRate: evaluatedCount ? Math.round((achievedCount / evaluatedCount) * 100) : 0,
    finalProgress: finalTotalCount ? Math.round((finalPassedCount / finalTotalCount) * 100) : 0
  };
};

const CohortRateTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="max-w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
      <p className="text-xs font-black text-slate-900">{item.title}</p>
      <p className="mt-2 text-xs font-bold text-blue-700">完成率 {item.completionRate}%（{item.evaluated}／{item.totalLearners} 位）</p>
      <p className="mt-1 text-xs font-bold text-emerald-700">達標率 {item.achievementRate}%（{item.achieved}／{item.evaluated} 位已評核）</p>
    </div>
  );
};

const CohortAssessmentChart = ({ title, subtitle, icon: Icon, rows }) => (
  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-900 px-4 py-4 text-white md:px-5">
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-white/10 p-2.5 ring-1 ring-white/15">{React.createElement(Icon, { className: 'h-5 w-5 text-indigo-200' })}</span>
        <div><h3 className="font-black tracking-wide">{title}</h3><p className="mt-1 text-xs text-slate-300">{subtitle}</p></div>
      </div>
    </div>
    <div className="h-80 w-full px-2 pt-5 md:h-96 md:px-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 16, right: 8, left: -12, bottom: 4 }} barCategoryGap="12%">
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis dataKey="axisLabel" interval={0} height={34} tick={{ fontSize: 9, fill: '#64748B', fontWeight: 800 }} />
          <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={value => `${value}%`} tick={{ fontSize: 10, fill: '#64748B' }} />
          <Tooltip content={<CohortRateTooltip />} cursor={{ fill: '#F8FAFC' }} />
          <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
          <Bar dataKey="completionRate" name="完成率（已評核／全部學員）" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Bar dataKey="achievementRate" name="達標率（已達標／已評核）" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
    <AssessmentLabelKey rows={rows} />
  </section>
);

const OverallDashboard = ({ dashboardData, students, updatedAt, onSelectStudent }) => {
  const cohort = useMemo(() => {
    if (!dashboardData || dashboardData.status === 'error') return null;
    const learners = (students || []).map(student => buildCohortStudent(student, dashboardData));
    const totalOpportunities = learners.reduce((sum, learner) => sum + learner.clinicalTotal, 0);
    const evaluatedCount = learners.reduce((sum, learner) => sum + learner.evaluatedCount, 0);
    const achievedCount = learners.reduce((sum, learner) => sum + learner.achievedCount, 0);
    const pendingCount = learners.reduce((sum, learner) => sum + learner.pendingCount, 0);
    const aggregateItems = key => (key === 'epaItems' ? EPA_CONFIG : DOPS_FORMS).map((config, index) => {
      const items = learners.map(learner => learner[key][index]);
      const evaluated = items.filter(item => item.evaluated).length;
      const achieved = items.filter(item => item.achieved).length;
      const title = items[0]?.title || String(config.title || '').replace(/^EPA\s*\d+[.、]?\s*/iu, '').replace(/\s*DOPS\s*$/iu, '').trim();
      const label = `${key === 'epaItems' ? 'EPA' : 'DOPS'} ${index + 1}`;
      return {
        id: config.id,
        label,
        axisLabel: `${key === 'epaItems' ? 'EPA' : 'DOPS'}${index + 1}`,
        title,
        totalLearners: learners.length,
        evaluated,
        achieved,
        completionRate: learners.length ? Math.round((evaluated / learners.length) * 100) : 0,
        achievementRate: evaluated ? Math.round((achieved / evaluated) * 100) : 0
      };
    });

    const profileByEmail = new Map((students || []).map(student => [normalizeEmail(student.email), student]));
    const cohortEPA = (dashboardData.epa || []).filter(record => profileByEmail.has(normalizeEmail(record.email)));
    const validFeedback = sortByDate(cohortEPA.filter(record => isValidSatisfaction(record.feedbackSatisfaction))).map(record => {
      const normalizedId = normalizeEPAId(record.epaId);
      const epa = EPA_CONFIG.find(item => normalizeEPAId(item.id) === normalizedId);
      const profile = profileByEmail.get(normalizeEmail(record.email));
      return {
        ...record,
        normalizedId,
        score: Number(record.feedbackSatisfaction),
        title: epa ? String(epa.title).replace(/^EPA\s*\d+[.、]?\s*/iu, '') : record.epaId,
        learnerName: profile?.displayName || record.email,
        reflection: String(record.feedbackReflection || '').trim(),
        link: buildAssessmentLink(record.email, 'epa', record.recordId || '')
      };
    });
    const monthlyGroups = new Map();
    validFeedback.forEach(item => {
      const month = String(item.date || '').slice(0, 7) || '未註明';
      if (!monthlyGroups.has(month)) monthlyGroups.set(month, []);
      monthlyGroups.get(month).push(item);
    });
    const satisfactionTimeline = [...monthlyGroups.entries()].map(([month, records]) => ({
      title: '整體平均滿意度',
      date: month,
      displayDate: month.replace('-', '/'),
      count: records.length,
      score: Number((records.reduce((sum, item) => sum + item.score, 0) / records.length).toFixed(1))
    }));
    const satisfactionByEPA = EPA_CONFIG.map((epa, index) => {
      const records = validFeedback.filter(item => item.normalizedId === normalizeEPAId(epa.id));
      if (!records.length) return null;
      return {
        id: epa.id,
        label: `EPA ${index + 1}`,
        title: String(epa.title).replace(/^EPA\s*\d+[.、]?\s*/iu, ''),
        count: records.length,
        average: Number((records.reduce((sum, item) => sum + item.score, 0) / records.length).toFixed(1))
      };
    }).filter(Boolean);
    const previousByLearnerEPA = {};
    const attentionItems = [];
    validFeedback.forEach(item => {
      const key = `${normalizeEmail(item.email)}::${item.normalizedId}`;
      const previous = previousByLearnerEPA[key];
      let reason = '';
      if (item.score <= 4) reason = `滿意度 ${item.score}／9`;
      else if (previous && previous.score - item.score >= 2) reason = `較同項前次下降 ${previous.score - item.score} 分`;
      if (reason) attentionItems.push({ ...item, reason });
      previousByLearnerEPA[key] = item;
    });
    const feedbackLearners = new Set(validFeedback.map(item => normalizeEmail(item.email))).size;
    const average = validFeedback.length ? Number((validFeedback.reduce((sum, item) => sum + item.score, 0) / validFeedback.length).toFixed(1)) : 0;
    const change = satisfactionTimeline.length > 1 ? Number((satisfactionTimeline.at(-1).score - satisfactionTimeline.at(-2).score).toFixed(1)) : null;

    return {
      learners: [...learners].sort((a, b) => a.completionRate - b.completionRate || b.pendingCount - a.pendingCount),
      metrics: {
        totalLearners: learners.length,
        totalOpportunities,
        evaluatedCount,
        achievedCount,
        pendingCount,
        completionRate: totalOpportunities ? Math.round((evaluatedCount / totalOpportunities) * 100) : 0,
        achievementRate: evaluatedCount ? Math.round((achievedCount / evaluatedCount) * 100) : 0
      },
      epaItems: aggregateItems('epaItems'),
      dopsItems: aggregateItems('dopsItems'),
      satisfaction: {
        count: validFeedback.length,
        totalAssessments: cohortEPA.length,
        average,
        responseRate: cohortEPA.length ? Math.round((validFeedback.length / cohortEPA.length) * 100) : 0,
        latest: validFeedback.at(-1) || null,
        change,
        timeline: satisfactionTimeline,
        byEPA: satisfactionByEPA,
        attentionItems: attentionItems.reverse(),
        feedbackLearners,
        totalLearners: learners.length
      }
    };
  }, [dashboardData, students]);

  if (!cohort) return <div className="py-8 text-center text-gray-400">資料解析中...</div>;
  const refreshedAt = updatedAt || (dashboardData?.generatedAt ? new Date(dashboardData.generatedAt) : null);

  return (
    <div className="mt-4 space-y-6 animate-in fade-in">
      <div className="rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-blue-50 px-4 py-4 shadow-sm md:px-5">
        <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
          <div><h3 className="flex items-center gap-2 font-black text-gray-900"><BarChart3 className="h-5 w-5 text-indigo-600" />全部學員整體成效</h3><p className="mt-1 text-xs text-gray-500">完成率＝已評核項數 ÷ 應評核項數；達標率＝已達標項數 ÷ 已評核項數。</p></div>
          <p className="text-xs text-gray-400">資料更新：{refreshedAt && !Number.isNaN(refreshedAt.getTime()) ? refreshedAt.toLocaleString('zh-TW', { hour12: false }) : '尚未更新'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <MetricCard icon={UserRound} label="學員人數" value={cohort.metrics.totalLearners} suffix="人" detail="目前納入整體統計" color="bg-purple-100 text-purple-700" />
        <MetricCard icon={Clock3} label="整體完成率" value={cohort.metrics.completionRate} suffix="%" detail={`${cohort.metrics.evaluatedCount}／${cohort.metrics.totalOpportunities} 項已評核`} color="bg-blue-100 text-blue-700" />
        <MetricCard icon={CheckCircle2} label="整體達標率" value={cohort.metrics.achievementRate} suffix="%" detail={`${cohort.metrics.achievedCount}／${cohort.metrics.evaluatedCount} 項已達標`} color="bg-emerald-100 text-emerald-700" />
        <MetricCard icon={AlertTriangle} label="待學員回饋" value={cohort.metrics.pendingCount} suffix="項" detail="教師已完成評核" color="bg-amber-100 text-amber-700" />
      </div>

      <section className="space-y-3">
        <div><h2 className="text-lg font-black text-slate-900">全體 EPA／DOPS 成效分布</h2><p className="mt-1 text-xs text-slate-500">藍色呈現完成率，綠色呈現達標率；兩者分母不同，滑鼠移入可查看人數。</p></div>
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <CohortAssessmentChart title="EPA 整體完成與達標" subtitle="達標門檻：Level 4 以上" icon={Activity} rows={cohort.epaItems} />
          <CohortAssessmentChart title="DOPS 整體完成與達標" subtitle="達標門檻：8 分以上" icon={CheckSquare} rows={cohort.dopsItems} />
        </div>
      </section>

      <SatisfactionDashboard satisfaction={cohort.satisfaction} overall />

      <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-4 md:px-5"><h3 className="font-black text-gray-900">學員成效一覽</h3><p className="mt-1 text-xs text-gray-500">依完成率由低至高排列，便於優先掌握需要協助的學員。</p></div>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500"><tr><th className="px-5 py-3 text-left">學員</th><th className="px-4 py-3 text-center">完訓進度</th><th className="px-4 py-3 text-center">完成率</th><th className="px-4 py-3 text-center">達標率</th><th className="px-4 py-3 text-center">待回饋</th><th className="px-5 py-3 text-right">操作</th></tr></thead>
            <tbody className="divide-y divide-gray-100">{cohort.learners.map(learner => (
              <tr key={learner.email} className="hover:bg-gray-50"><td className="px-5 py-3 font-bold text-gray-800">{learner.name}</td><td className="px-4 py-3 text-center">{learner.finalProgress}%</td><td className="px-4 py-3 text-center font-bold text-blue-700">{learner.completionRate}%<span className="ml-1 text-[10px] font-normal text-gray-400">{learner.evaluatedCount}／{learner.clinicalTotal}</span></td><td className="px-4 py-3 text-center font-bold text-emerald-700">{learner.achievementRate}%<span className="ml-1 text-[10px] font-normal text-gray-400">{learner.achievedCount}／{learner.evaluatedCount}</span></td><td className="px-4 py-3 text-center font-bold text-amber-700">{learner.pendingCount}</td><td className="px-5 py-3 text-right"><button type="button" onClick={() => onSelectStudent?.(learner.email)} className="font-bold text-indigo-600 hover:text-indigo-800">查看個別</button></td></tr>
            ))}</tbody>
          </table>
        </div>
        <div className="divide-y divide-gray-100 md:hidden">{cohort.learners.map(learner => (
          <button key={learner.email} type="button" onClick={() => onSelectStudent?.(learner.email)} className="block w-full p-4 text-left hover:bg-gray-50">
            <div className="flex items-center justify-between"><span className="font-black text-gray-800">{learner.name}</span><ArrowRight className="h-4 w-4 text-indigo-500" /></div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded-lg bg-blue-50 p-2"><p className="font-black text-blue-700">{learner.completionRate}%</p><p className="mt-1 text-gray-500">完成率</p></div><div className="rounded-lg bg-emerald-50 p-2"><p className="font-black text-emerald-700">{learner.achievementRate}%</p><p className="mt-1 text-gray-500">達標率</p></div><div className="rounded-lg bg-amber-50 p-2"><p className="font-black text-amber-700">{learner.pendingCount}</p><p className="mt-1 text-gray-500">待回饋</p></div></div>
          </button>
        ))}</div>
      </section>
    </div>
  );
};

const DashboardCharts = ({ viewMode = 'individual', studentEmail, studentProfile, students = [], dashboardData, updatedAt, onSelectStudent }) => {
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
        value: levelIndex,
        evaluated: Boolean(latest),
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
        value: score || 0,
        evaluated: Boolean(latest) && (assessmentCompleted || pendingFeedback),
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
        evaluated: Boolean(latestMiniCEX),
        passed: miniCEXScore !== null && miniCEXScore >= 4, latest: latestMiniCEX,
        link: buildAssessmentLink(studentEmail, 'minicex', latestMiniCEX?.recordId || ''), type: 'Mini-CEX'
      },
      {
        id: 'osce', title: 'OSCE 評估', result: osceScore !== null ? `${osceScore} / 75 分` : '尚未評核',
        attempts: studentOSCE.length, date: latestOSCE?.date || '', status: osceStatus,
        evaluated: Boolean(latestOSCE),
        passed: osceScore !== null && osceScore >= 46, latest: latestOSCE,
        link: buildAssessmentLink(studentEmail, 'osce', latestOSCE?.recordId || ''), type: 'OSCE'
      }
    ];

    const finalTotalCount = FINAL_ASSESSMENT_CATEGORIES.reduce((total, category) => total + category.items.length, 0);
    const finalPassedCount = Object.values(studentFinal?.items || {}).filter(item => item?.passed === true || item === true).length;
    const finalProgress = finalTotalCount ? Math.min(Math.round((finalPassedCount / finalTotalCount) * 100), 100) : 0;
    const achievedCount = clinicalRows.filter(row => row.passed).length;
    const evaluatedCount = clinicalRows.filter(row => row.evaluated).length;
    const clinicalCompletionRate = clinicalRows.length ? Math.round((evaluatedCount / clinicalRows.length) * 100) : 0;
    const clinicalAchievementRate = evaluatedCount ? Math.round((achievedCount / evaluatedCount) * 100) : 0;
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
        finalProgress, finalPassedCount, finalTotalCount, achievedCount, evaluatedCount,
        clinicalCompletionRate, clinicalAchievementRate,
        clinicalTotal: clinicalRows.length, unassessedCount, improvementCount, pendingCount
      },
      latestAssessmentDate: allDates[0] || '',
      hasData: clinicalRows.some(row => row.attempts > 0) || finalPassedCount > 0 || studentKSA.length > 0
    };
  }, [dashboardData, studentEmail]);

  if (viewMode === 'overall') {
    return <OverallDashboard dashboardData={dashboardData} students={students} updatedAt={updatedAt} onSelectStudent={onSelectStudent} />;
  }

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
        <MetricCard icon={Clock3} label="臨床評核完成率" value={processedData.metrics.clinicalCompletionRate} suffix="%" detail={`${processedData.metrics.evaluatedCount} / ${processedData.metrics.clinicalTotal} 項已評核`} color="bg-blue-100 text-blue-700" />
        <MetricCard icon={CheckCircle2} label="臨床評核達標率" value={processedData.metrics.clinicalAchievementRate} suffix="%" detail={`${processedData.metrics.achievedCount} / ${processedData.metrics.evaluatedCount} 項已達標`} color="bg-emerald-100 text-emerald-700" />
        <MetricCard icon={XCircle} label="待加強／重評" value={processedData.metrics.improvementCount} suffix="項" detail="最新結果尚未達標" color="bg-red-100 text-red-700" />
        <MetricCard icon={AlertTriangle} label="待學員回饋" value={processedData.metrics.pendingCount} suffix="項" detail="教師已完成評核" color="bg-amber-100 text-amber-700" />
      </div>

      <section className="space-y-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-black text-slate-900"><BarChart3 className="h-5 w-5 text-indigo-600" />臨床評核 BI 分析</h2>
            <p className="mt-1 text-xs text-slate-500">以各項最新一次評核呈現，紅色虛線為達標門檻；可搭配下方進度矩陣查看歷次變化。</p>
          </div>
          <p className="text-[11px] font-bold text-slate-400">綠：達標・黃：待回饋・紅：待加強・灰：未評核</p>
        </div>
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <AssessmentBIChart title="EPA 最新信賴等級" subtitle="Level 4 以上視為達標" icon={Activity} rows={processedData.epaRows} type="epa" />
          <AssessmentBIChart title="DOPS 最新整體評分" subtitle="8 分以上視為達標" icon={CheckSquare} rows={processedData.dopsRows} type="dops" />
        </div>
      </section>

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
