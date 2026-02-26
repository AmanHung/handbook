import React, { useMemo, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ReferenceLine
} from 'recharts';
import { Target, TrendingUp, Award, Activity, ClipboardList, CheckSquare } from 'lucide-react';

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#14B8A6', '#F97316', '#475569', '#84CC16', '#6366F1'];

const EPA_NAMES = {
  'EPA-01': '門診處方評估', 'EPA_01': '門診處方評估', 'epa_01': '門診處方評估',
  'EPA-02': '門診處方藥品交付', 'EPA_02': '門診處方藥品交付', 'epa_02': '門診處方藥品交付',
  'EPA-03': '門診病人藥品諮詢', 'EPA_03': '門診病人藥品諮詢', 'epa_03': '門診病人藥品諮詢',
  'EPA-04': '藥品不良反應', 'EPA_04': '藥品不良反應', 'epa_04': '藥品不良反應',
  'EPA-05': '住院病人用藥評估', 'EPA_05': '住院病人用藥評估', 'epa_05': '住院病人用藥評估',
  'EPA-06': '藥物治療監測(TDM)評估', 'EPA_06': '藥物治療監測(TDM)評估', 'epa_06': '藥物治療監測(TDM)評估',
  'EPA-07': '醫療人員藥品諮詢', 'EPA_07': '醫療人員藥品諮詢', 'epa_07': '醫療人員藥品諮詢',
  'EPA-08': '管制藥品調劑與管理', 'EPA_08': '管制藥品調劑與管理', 'epa_08': '管制藥品調劑與管理'
};

const DOPS_NAMES = {
  'DOPS-01': '門診處方調劑作業', 'dops_op_dispensing': '門診處方調劑作業',
  'DOPS-02': '單一劑量藥車調配', 'dops_ud_cart': '單一劑量藥車調配',
  'DOPS-03': '門診藥品交付作業', 'dops_op_delivery': '門診藥品交付作業',
  'DOPS-04': '門診處方核對作業', 'dops_op_check': '門診處方核對作業',
  'DOPS-05': '門診病人藥物諮詢', 'dops_op_counseling': '門診病人藥物諮詢',
  'DOPS-06': '醫療人員藥物諮詢', 'dops_hc_counseling': '醫療人員藥物諮詢', 'dops_prof_counseling': '醫療人員藥物諮詢', 'dops_med_counseling': '醫療人員藥物諮詢',
  'DOPS-07': '抗腫瘤藥物環境安全維護', 'dops_chemo_env': '抗腫瘤藥物環境安全維護',
  'DOPS-08': '抗腫瘤藥物安全防護裝備', 'dops_chemo_ppe': '抗腫瘤藥物安全防護裝備',
  'DOPS-09': '中藥調劑作業', 'dops_tcm_dispensing': '中藥調劑作業', 'dops_tcm': '中藥調劑作業'
};

const EPA_LEVEL_LABELS = ['', '2a', '2b', '3a', '3b', '3c', '4', '5'];

const DashboardCharts = ({ studentEmail, dashboardData }) => {
  
  const processedData = useMemo(() => {
    if (!dashboardData || !studentEmail || dashboardData.status === 'error') return null;

    const isMatch = (e1, e2) => String(e1).toLowerCase().trim() === String(e2).toLowerCase().trim();

    // 過濾資料
    const studentDOPS = (dashboardData.dops || []).filter(d => isMatch(d.email, studentEmail));
    const studentMiniCEX = (dashboardData.minicex || []).filter(d => isMatch(d.email, studentEmail));
    const studentOSCE = (dashboardData.osce || []).filter(d => isMatch(d.email, studentEmail));
    const studentKSA = (dashboardData.ksa || []).filter(d => isMatch(d.email, studentEmail));
    const studentEPA = (dashboardData.epa || []).filter(d => isMatch(d.email, studentEmail));
    
    let studentFinal = null;
    if (dashboardData.final) {
      const matchedKey = Object.keys(dashboardData.final).find(k => isMatch(k, studentEmail));
      if (matchedKey) studentFinal = dashboardData.final[matchedKey];
    }

    // 智慧分數提取器
    const extractValidScores = (obj) => {
      let scores = [];
      const traverse = (o) => {
        if (typeof o === 'number' && o > 0 && o <= 9) scores.push(o);
        else if (typeof o === 'string' && !isNaN(Number(o)) && Number(o) > 0 && Number(o) <= 9) scores.push(Number(o));
        else if (typeof o === 'object' && o !== null) Object.values(o).forEach(traverse);
      };
      traverse(obj);
      return scores;
    };

    const calcAvg = (arr) => arr.length > 0 ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : 0;
    
    // 計算全域 KPI
    const allDopsScores = studentDOPS.flatMap(d => extractValidScores(d.formData));
    const avgDops = calcAvg(allDopsScores);

    const allCexScores = studentMiniCEX.flatMap(d => extractValidScores(d.scores));
    const avgCex = calcAvg(allCexScores);

    const latestOSCE = studentOSCE.length > 0 ? studentOSCE[0].total_score : '無';

    let finalProgress = 0;
    if (studentFinal && studentFinal.items) {
      const items = Object.values(studentFinal.items);
      const passedCount = items.filter(i => i.passed).length;
      finalProgress = items.length > 0 ? Math.min(Math.round((passedCount / 20) * 100), 100) : 0; 
    }

    // KSA 雷達圖
    const radarData = [
      { subject: '專業知識', fullMark: 9 },
      { subject: '專業技能', fullMark: 9 },
      { subject: '專業態度', fullMark: 9 }
    ];
    const ksaPhases = [];

    const sortedKSA = [...studentKSA].sort((a, b) => new Date(a.date) - new Date(b.date));
    sortedKSA.forEach(k => {
      const phaseName = `階段 ${k.phaseId}`;
      if (!ksaPhases.includes(phaseName)) ksaPhases.push(phaseName);
      
      const kScores = Object.entries(k.scores || {}).filter(([key]) => key.toLowerCase().includes('k')).map(e => Number(e[1])).filter(n => !isNaN(n));
      const sScores = Object.entries(k.scores || {}).filter(([key]) => key.toLowerCase().includes('s')).map(e => Number(e[1])).filter(n => !isNaN(n));
      const aScores = Object.entries(k.scores || {}).filter(([key]) => key.toLowerCase().includes('a')).map(e => Number(e[1])).filter(n => !isNaN(n));

      radarData[0][phaseName] = parseFloat(calcAvg(kScores)) || 0;
      radarData[1][phaseName] = parseFloat(calcAvg(sScores)) || 0;
      radarData[2][phaseName] = parseFloat(calcAvg(aScores)) || 0;
    });

    // 防覆蓋時間軸
    const buildTimelineData = (records, itemKeyField, scoreField) => {
      const timeline = [];
      const sorted = [...records].sort((a, b) => new Date(a.date) - new Date(b.date));
      
      sorted.forEach(r => {
        const d = r.date.substring(5); // 取 MM-DD
        const itemName = r[itemKeyField] || '綜合評估';
        const score = r[scoreField]; 
        
        if (score !== undefined && score !== null && !isNaN(score)) {
          let targetPoint = timeline.find(p => p.rawDate === r.date && p[itemName] === undefined);
          
          if (targetPoint) {
            targetPoint[itemName] = score; 
          } else {
            const count = timeline.filter(p => p.rawDate === r.date).length;
            const displayDate = count === 0 ? d : `${d} (${count + 1})`;
            timeline.push({
              date: displayDate,
              rawDate: r.date,
              [itemName]: score
            });
          }
        }
      });

      const lines = [...new Set(sorted.map(r => r[itemKeyField] || '綜合評估'))];
      return { chartData: timeline, lines };
    };

    // 1. EPA 折線圖
    const extractEpaLevelIndex = (levelStr) => {
      if (!levelStr) return null;
      const s = String(levelStr).toLowerCase();
      if (s.includes('2a')) return 1;
      if (s.includes('2b')) return 2;
      if (s.includes('3a')) return 3;
      if (s.includes('3b')) return 4;
      if (s.includes('3c')) return 5;
      if (s.includes('4')) return 6;
      if (s.includes('5')) return 7;
      return null;
    };

    const epaWithNumLevel = studentEPA.map(d => ({
      ...d,
      epaTitle: EPA_NAMES[d.epaId] || EPA_NAMES[String(d.epaId).toUpperCase().replace('_', '-')] || d.epaId,
      numericLevel: extractEpaLevelIndex(d.level)
    })).filter(d => d.numericLevel !== null);

    const epaData = buildTimelineData(epaWithNumLevel, 'epaTitle', 'numericLevel');

    // 2. DOPS 折線圖
    const dopsWithScore = studentDOPS.map(d => {
      const validScores = extractValidScores(d.formData);
      return { 
        ...d, 
        dopsTitle: DOPS_NAMES[d.dopsId] || DOPS_NAMES[String(d.dopsId).toLowerCase()] || d.dopsId, 
        score: validScores.length > 0 ? parseFloat(calcAvg(validScores)) : null 
      };
    }).filter(d => d.score !== null);
    
    const dopsData = buildTimelineData(dopsWithScore, 'dopsTitle', 'score');

    // 3. Mini-CEX 折線圖
    const cexWithScore = studentMiniCEX.map(d => {
      const validScores = extractValidScores(d.scores);
      return { 
        ...d, 
        topic: '門診病人藥品諮詢', 
        score: validScores.length > 0 ? parseFloat(calcAvg(validScores)) : null 
      };
    }).filter(d => d.score !== null);
    
    const minicexData = buildTimelineData(cexWithScore, 'topic', 'score');

    // 4. OSCE 折線圖
    const osceWithTopic = studentOSCE.map(d => ({ ...d, topic: '醫療人員藥品諮詢' }));
    const osceData = buildTimelineData(osceWithTopic, 'topic', 'total_score');

    return {
      kpi: { avgDops, avgCex, latestOSCE, finalProgress },
      radarData,
      ksaPhases,
      epaData,
      dopsData,
      minicexData,
      osceData,
      hasData: studentDOPS.length || studentMiniCEX.length || studentOSCE.length || studentKSA.length || studentEPA.length
    };
  }, [dashboardData, studentEmail]);

  if (!processedData) return <div className="text-gray-400 text-center py-8">資料解析中...</div>;
  if (!processedData.hasData) return <div className="text-orange-500 bg-orange-50 p-6 rounded-xl text-center font-bold border border-orange-200 mt-4">此學員目前沒有任何評估紀錄。</div>;

  return (
    <div className="space-y-6 animate-in fade-in mt-4">
      {/* 1. KPI 數據卡 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-blue-100 p-3 rounded-lg"><Activity className="w-6 h-6 text-blue-600"/></div>
          <div><p className="text-sm text-gray-500 font-bold">DOPS 平均</p><p className="text-2xl font-black text-gray-800">{processedData.kpi.avgDops}</p></div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-teal-100 p-3 rounded-lg"><Target className="w-6 h-6 text-teal-600"/></div>
          <div><p className="text-sm text-gray-500 font-bold">Mini-CEX 平均</p><p className="text-2xl font-black text-gray-800">{processedData.kpi.avgCex}</p></div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-yellow-100 p-3 rounded-lg"><Award className="w-6 h-6 text-yellow-600"/></div>
          <div><p className="text-sm text-gray-500 font-bold">最新 OSCE</p><p className="text-2xl font-black text-gray-800">{processedData.kpi.latestOSCE}</p></div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-purple-100 p-3 rounded-lg"><TrendingUp className="w-6 h-6 text-purple-600"/></div>
          <div><p className="text-sm text-gray-500 font-bold">完訓進度</p><p className="text-2xl font-black text-gray-800">{processedData.kpi.finalProgress}%</p></div>
        </div>
      </div>

      {/* 2. KSA 雷達圖 (顯示各階段) */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">KSA 核心能力演進雷達圖</h3>
        <div className="h-72 w-full">
          {processedData.ksaPhases.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={processedData.radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#4B5563', fontSize: 13, fontWeight: 'bold' }} />
                <PolarRadiusAxis angle={30} domain={[0, 9]} tick={{ fontSize: 10 }} />
                {processedData.ksaPhases.map((phase, idx) => (
                  <Radar 
                    key={phase} name={phase} dataKey={phase} 
                    stroke={CHART_COLORS[idx % CHART_COLORS.length]} 
                    strokeWidth={2}
                    fill={CHART_COLORS[idx % CHART_COLORS.length]} 
                    fillOpacity={0.15} 
                  />
                ))}
                <Tooltip />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          ) : <div className="h-full flex items-center justify-center text-gray-400">尚無 KSA 評估資料</div>}
        </div>
      </div>

      {/* 3. 各項評估折線圖區塊 (2x2 Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* EPA 歷程折線圖 */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-500"/> EPA 信任等級軌跡
          </h3>
          <div className="h-64 w-full">
            {processedData.epaData.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={processedData.epaData.chartData} margin={{ right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis 
                    domain={[1, 7]} 
                    ticks={[1, 2, 3, 4, 5, 6, 7]} 
                    tickFormatter={(val) => EPA_LEVEL_LABELS[val]} 
                    tick={{ fontSize: 11, fontWeight: 'bold' }} 
                  />
                  <Tooltip 
                    formatter={(value, name) => [EPA_LEVEL_LABELS[value] || value, name]}
                    contentStyle={{ borderRadius: '8px', fontSize: '12px' }} 
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: '10px' }} />
                  {/* 及格線 (Level 4) */}
                  <ReferenceLine y={6} stroke="#EF4444" strokeDasharray="4 4" label={{ position: 'top', value: '及格線(4)', fill: '#EF4444', fontSize: 11, fontWeight: 'bold' }} />
                  
                  {processedData.epaData.lines.map((line, idx) => (
                    <Line key={line} type="monotone" dataKey={line} stroke={CHART_COLORS[idx % CHART_COLORS.length]} strokeWidth={3} connectNulls dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-gray-400 text-sm">尚無 EPA 資料</div>}
          </div>
        </div>

        {/* DOPS 折線圖 */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-blue-500"/> DOPS 技能評量軌跡 (滿分 9分)
          </h3>
          <div className="h-64 w-full">
            {processedData.dopsData.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={processedData.dopsData.chartData} margin={{ right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 9]} tick={{ fontSize: 12 }} tickCount={10} />
                  <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: '10px' }} />
                  {/* ★ DOPS 及格線 (8分) */}
                  <ReferenceLine y={8} stroke="#EF4444" strokeDasharray="4 4" label={{ position: 'top', value: '及格線(8分)', fill: '#EF4444', fontSize: 11, fontWeight: 'bold' }} />

                  {processedData.dopsData.lines.map((line, idx) => (
                    <Line key={line} type="monotone" dataKey={line} stroke={CHART_COLORS[(idx+2) % CHART_COLORS.length]} strokeWidth={3} connectNulls dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-gray-400 text-sm">尚無 DOPS 資料</div>}
          </div>
        </div>

        {/* Mini-CEX 折線圖 */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-teal-500"/> Mini-CEX 平均表現 (滿分 9分)
          </h3>
          <div className="h-64 w-full">
            {processedData.minicexData.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={processedData.minicexData.chartData} margin={{ right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 9]} tick={{ fontSize: 12 }} tickCount={10} />
                  <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: '10px' }} />
                  {/* ★ Mini-CEX 及格線 (4分) */}
                  <ReferenceLine y={4} stroke="#EF4444" strokeDasharray="4 4" label={{ position: 'top', value: '及格線(4分)', fill: '#EF4444', fontSize: 11, fontWeight: 'bold' }} />

                  {processedData.minicexData.lines.map((line, idx) => (
                    <Line key={line} type="monotone" dataKey={line} stroke="#14B8A6" strokeWidth={3} connectNulls dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-gray-400 text-sm">尚無 Mini-CEX 資料</div>}
          </div>
        </div>

        {/* OSCE 折線圖 */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-yellow-500"/> OSCE 總分軌跡 (滿分 75分)
          </h3>
          <div className="h-64 w-full">
            {processedData.osceData.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={processedData.osceData.chartData} margin={{ right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 75]} tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: '10px' }} />
                  {/* ★ OSCE 及格線 (46分) */}
                  <ReferenceLine y={46} stroke="#EF4444" strokeDasharray="4 4" label={{ position: 'top', value: '及格線(46分)', fill: '#EF4444', fontSize: 11, fontWeight: 'bold' }} />

                  {processedData.osceData.lines.map((line, idx) => (
                    <Line key={line} type="monotone" dataKey={line} stroke="#F59E0B" strokeWidth={3} connectNulls dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-gray-400 text-sm">尚無 OSCE 資料</div>}
          </div>
        </div>

      </div>
    </div>
  );
};

export default DashboardCharts;
