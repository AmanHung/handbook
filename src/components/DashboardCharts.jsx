import React, { useMemo, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
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

    // 1. 過濾該學員的資料
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

    // --- 輔助函式區 ---
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

    const getDopsOverallScore = (formData) => {
      if (!formData) return null;
      for (const [key, val] of Object.entries(formData)) {
        if (/(overall|global|整體|總評|總分)/i.test(key) && !isNaN(Number(val))) return Number(val);
      }
      const values = [];
      const traverse = (o) => {
        if (typeof o === 'number' && o > 0 && o <= 10) values.push(o);
        else if (typeof o === 'string' && !isNaN(Number(o)) && Number(o) > 0 && Number(o) <= 10) values.push(Number(o));
        else if (typeof o === 'object' && o !== null) Object.values(o).forEach(traverse);
      };
      traverse(formData);
      return values.length > 0 ? values[values.length - 1] : null;
    };

    const extractEpaLevelIndex = (levelStr) => {
      if (!levelStr) return 0;
      const s = String(levelStr).toLowerCase();
      if (s.includes('2a')) return 1;
      if (s.includes('2b')) return 2;
      if (s.includes('3a')) return 3;
      if (s.includes('3b')) return 4;
      if (s.includes('3c')) return 5;
      if (s.includes('4')) return 6;
      if (s.includes('5')) return 7;
      return 0;
    };

    const calcAvg = (arr) => arr.length > 0 ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : 0;

    // ==========================================
    // ★★★ 【全新】KPI 達成率計算 (及格率) ★★★
    // ==========================================
    
    // 1. EPA (及格: Level 4 即 index 6) -> 統計及格的不重複項目數
    const epaPassedItems = new Set(studentEPA.filter(d => extractEpaLevelIndex(d.level) >= 6).map(d => d.epaId)).size;
    const epaTotal = 8; // EPA 總共 8 項
    const epaRate = Math.round((epaPassedItems / epaTotal) * 100);

    // 2. DOPS (及格: 整體評估 8 分) -> 統計及格的不重複項目數
    const dopsPassedItems = new Set(studentDOPS.filter(d => getDopsOverallScore(d.formData) >= 8).map(d => d.dopsId)).size;
    const dopsTotal = 9; // DOPS 總共 9 項
    const dopsRate = Math.round((dopsPassedItems / dopsTotal) * 100);

    // 3. Mini-CEX (及格: 平均 4 分) -> 目前僅1項，有及格紀錄就是 100%
    const cexTotal = 1;
    const cexPassedItems = studentMiniCEX.some(d => {
      const s = extractValidScores(d.scores);
      return s.length > 0 && parseFloat(calcAvg(s)) >= 4;
    }) ? 1 : 0;
    const cexRate = Math.round((cexPassedItems / cexTotal) * 100);

    // 4. OSCE (及格: 總分 46 分) -> 目前僅1項，有及格紀錄就是 100%
    const osceTotal = 1;
    const oscePassedItems = studentOSCE.some(d => Number(d.total_score) >= 46) ? 1 : 0;
    const osceRate = Math.round((oscePassedItems / osceTotal) * 100);

    // 5. 完訓進度 (抓取 FinalAssessment_Records 中打勾的必修項目比例)
    let finalProgress = 0;
    if (studentFinal && studentFinal.items) {
      const items = Object.values(studentFinal.items);
      const passedCount = items.filter(i => i.passed).length;
      // 若有實際 items 數量則依據該數量，若無則預設抓 24 項當分母
      const totalFinalItems = items.length > 0 ? items.length : 24; 
      finalProgress = items.length > 0 ? Math.min(Math.round((passedCount / totalFinalItems) * 100), 100) : 0; 
    }

    const kpi = {
      epa: { rate: epaRate, text: `${epaPassedItems} / ${epaTotal} 項及格` },
      dops: { rate: dopsRate, text: `${dopsPassedItems} / ${dopsTotal} 項及格` },
      cex: { rate: cexRate, text: `${cexPassedItems} / ${cexTotal} 項及格` },
      osce: { rate: osceRate, text: `${oscePassedItems} / ${osceTotal} 項及格` },
      final: { rate: finalProgress, text: '護照完訓進度' }
    };

    // ==========================================
    // 圖表資料準備區
    // ==========================================

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

    // EPA 長條圖資料
    const epaMap = {};
    let maxEpaAttempts = 0;
    studentEPA.map(d => ({
      ...d,
      epaTitle: EPA_NAMES[d.epaId] || EPA_NAMES[String(d.epaId).toUpperCase().replace('_', '-')] || d.epaId,
      numericLevel: extractEpaLevelIndex(d.level)
    })).filter(d => d.numericLevel !== null && d.numericLevel > 0)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .forEach(r => {
        const title = r.epaTitle;
        if (!epaMap[title]) epaMap[title] = { name: title, count: 0 };
        epaMap[title].count += 1;
        const attempt = `第${epaMap[title].count}次`;
        epaMap[title][attempt] = r.numericLevel;
        if (epaMap[title].count > maxEpaAttempts) maxEpaAttempts = epaMap[title].count;
      });
      
    const epaBarData = Object.values(epaMap);
    const epaAttempts = Array.from({length: maxEpaAttempts}, (_, i) => `第${i+1}次`);

    // DOPS 長條圖資料
    const dopsMap = {};
    let maxDopsAttempts = 0;
    studentDOPS.map(d => {
      return { 
        ...d, 
        dopsTitle: DOPS_NAMES[d.dopsId] || DOPS_NAMES[String(d.dopsId).toLowerCase()] || d.dopsId, 
        score: getDopsOverallScore(d.formData) 
      };
    }).filter(d => d.score !== null)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .forEach(r => {
        const title = r.dopsTitle;
        if (!dopsMap[title]) dopsMap[title] = { name: title, count: 0 };
        dopsMap[title].count += 1;
        const attempt = `第${dopsMap[title].count}次`;
        dopsMap[title][attempt] = r.score;
        if (dopsMap[title].count > maxDopsAttempts) maxDopsAttempts = dopsMap[title].count;
      });

    const dopsBarData = Object.values(dopsMap);
    const dopsAttempts = Array.from({length: maxDopsAttempts}, (_, i) => `第${i+1}次`);

    // Mini-CEX / OSCE 折線圖時間軸處理
    const buildTimelineData = (records, itemKeyField, scoreField) => {
      const timeline = [];
      const sorted = [...records].sort((a, b) => new Date(a.date) - new Date(b.date));
      
      sorted.forEach(r => {
        const d = r.date.substring(5); 
        const itemName = r[itemKeyField] || '綜合評估';
        const score = r[scoreField]; 
        
        if (score !== undefined && score !== null && !isNaN(score)) {
          let targetPoint = timeline.find(p => p.rawDate === r.date && p[itemName] === undefined);
          if (targetPoint) {
            targetPoint[itemName] = score; 
          } else {
            const count = timeline.filter(p => p.rawDate === r.date).length;
            const displayDate = count === 0 ? d : `${d} (${count + 1})`;
            timeline.push({ date: displayDate, rawDate: r.date, [itemName]: score });
          }
        }
      });
      const lines = [...new Set(sorted.map(r => r[itemKeyField] || '綜合評估'))];
      return { chartData: timeline, lines };
    };

    const cexWithScore = studentMiniCEX.map(d => {
      const validScores = extractValidScores(d.scores);
      return { ...d, topic: '門診病人藥品諮詢', score: validScores.length > 0 ? parseFloat(calcAvg(validScores)) : null };
    }).filter(d => d.score !== null);
    const minicexData = buildTimelineData(cexWithScore, 'topic', 'score');

    const osceWithTopic = studentOSCE.map(d => ({ ...d, topic: '醫療人員藥品諮詢' }));
    const osceData = buildTimelineData(osceWithTopic, 'topic', 'total_score');

    return {
      kpi, radarData, ksaPhases, epaBarData, epaAttempts, dopsBarData, dopsAttempts, minicexData, osceData,
      hasData: studentDOPS.length || studentMiniCEX.length || studentOSCE.length || studentKSA.length || studentEPA.length
    };
  }, [dashboardData, studentEmail]);

  if (!processedData) return <div className="text-gray-400 text-center py-8">資料解析中...</div>;
  if (!processedData.hasData) return <div className="text-orange-500 bg-orange-50 p-6 rounded-xl text-center font-bold border border-orange-200 mt-4">此學員目前沒有任何評估紀錄。</div>;

  return (
    <div className="space-y-6 animate-in fade-in mt-4">
      
      {/* ==========================================
          1. ★ 全新設計：5格 KPI 達成率數據卡 ★
          ========================================== */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* EPA */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-indigo-100 p-2 rounded-lg"><Activity className="w-4 h-4 text-indigo-600"/></div>
            <p className="text-sm text-gray-600 font-bold">EPA 完成率</p>
          </div>
          <div>
            <p className="text-3xl font-black text-gray-800">{processedData.kpi.epa.rate}<span className="text-lg text-gray-400 ml-1">%</span></p>
            <p className="text-xs font-medium text-indigo-600 mt-1">{processedData.kpi.epa.text}</p>
          </div>
        </div>
        
        {/* DOPS */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-blue-100 p-2 rounded-lg"><CheckSquare className="w-4 h-4 text-blue-600"/></div>
            <p className="text-sm text-gray-600 font-bold">DOPS 完成率</p>
          </div>
          <div>
            <p className="text-3xl font-black text-gray-800">{processedData.kpi.dops.rate}<span className="text-lg text-gray-400 ml-1">%</span></p>
            <p className="text-xs font-medium text-blue-600 mt-1">{processedData.kpi.dops.text}</p>
          </div>
        </div>

        {/* Mini-CEX */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-teal-100 p-2 rounded-lg"><Target className="w-4 h-4 text-teal-600"/></div>
            <p className="text-sm text-gray-600 font-bold">Mini-CEX 完成率</p>
          </div>
          <div>
            <p className="text-3xl font-black text-gray-800">{processedData.kpi.cex.rate}<span className="text-lg text-gray-400 ml-1">%</span></p>
            <p className="text-xs font-medium text-teal-600 mt-1">{processedData.kpi.cex.text}</p>
          </div>
        </div>

        {/* OSCE */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-yellow-100 p-2 rounded-lg"><ClipboardList className="w-4 h-4 text-yellow-600"/></div>
            <p className="text-sm text-gray-600 font-bold">OSCE 完成率</p>
          </div>
          <div>
            <p className="text-3xl font-black text-gray-800">{processedData.kpi.osce.rate}<span className="text-lg text-gray-400 ml-1">%</span></p>
            <p className="text-xs font-medium text-yellow-700 mt-1">{processedData.kpi.osce.text}</p>
          </div>
        </div>

        {/* 完訓進度 */}
        <div className="bg-gradient-to-br from-purple-50 to-white p-4 rounded-xl shadow-sm border border-purple-100 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-purple-100 p-2 rounded-lg"><TrendingUp className="w-4 h-4 text-purple-600"/></div>
            <p className="text-sm text-purple-800 font-bold">護照完訓進度</p>
          </div>
          <div>
            <p className="text-3xl font-black text-purple-700">{processedData.kpi.final.rate}<span className="text-lg text-purple-400 ml-1">%</span></p>
            <p className="text-xs font-medium text-purple-600 mt-1">{processedData.kpi.final.text}</p>
          </div>
        </div>
      </div>

      {/* 2. KSA 雷達圖 */}
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

      {/* 3. 各項評估圖表區塊 (2x2 Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* EPA 分組長條圖 */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-500"/> EPA 各項目歷次信任等級
          </h3>
          <div className="h-80 w-full">
            {processedData.epaBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={processedData.epaBarData} margin={{ top: 10, right: 10, left: -10, bottom: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, angle: -35, textAnchor: 'end' }} interval={0} />
                  <YAxis 
                    domain={[0, 7]} 
                    ticks={[1, 2, 3, 4, 5, 6, 7]} 
                    tickFormatter={(val) => EPA_LEVEL_LABELS[val]} 
                    tick={{ fontSize: 11, fontWeight: 'bold' }} 
                  />
                  <Tooltip 
                    formatter={(value, name) => [EPA_LEVEL_LABELS[value] || value, name]}
                    contentStyle={{ borderRadius: '8px', fontSize: '12px' }} 
                    cursor={{fill: '#F3F4F6'}}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, top: -10 }} />
                  <ReferenceLine y={6} stroke="#EF4444" strokeDasharray="4 4" label={{ position: 'top', value: '及格線(4)', fill: '#EF4444', fontSize: 11, fontWeight: 'bold' }} />
                  
                  {processedData.epaAttempts.map((att, idx) => (
                    <Bar key={att} dataKey={att} fill={CHART_COLORS[idx % CHART_COLORS.length]} radius={[2, 2, 0, 0]} maxBarSize={40} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-gray-400 text-sm">尚無 EPA 資料</div>}
          </div>
        </div>

        {/* DOPS 分組長條圖 */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-blue-500"/> DOPS 各項目歷次分數 (滿分 10分)
          </h3>
          <div className="h-80 w-full">
            {processedData.dopsBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={processedData.dopsBarData} margin={{ top: 10, right: 10, left: -20, bottom: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, angle: -35, textAnchor: 'end' }} interval={0} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} tickCount={11} />
                  <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} cursor={{fill: '#F3F4F6'}} />
                  <Legend wrapperStyle={{ fontSize: 11, top: -10 }} />
                  <ReferenceLine y={8} stroke="#EF4444" strokeDasharray="4 4" label={{ position: 'top', value: '及格線(8分)', fill: '#EF4444', fontSize: 11, fontWeight: 'bold' }} />

                  {processedData.dopsAttempts.map((att, idx) => (
                    <Bar key={att} dataKey={att} fill={CHART_COLORS[(idx + 2) % CHART_COLORS.length]} radius={[2, 2, 0, 0]} maxBarSize={40} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-gray-400 text-sm">尚無 DOPS 資料</div>}
          </div>
        </div>

        {/* Mini-CEX 折線圖 */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-teal-500"/> Mini-CEX 平均表現軌跡 (滿分 9分)
          </h3>
          <div className="h-64 w-full mt-8">
            {processedData.minicexData.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={processedData.minicexData.chartData} margin={{ right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 9]} tick={{ fontSize: 12 }} tickCount={10} />
                  <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: '10px' }} />
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
            <ClipboardList className="w-5 h-5 text-yellow-500"/> OSCE 總分表現軌跡 (滿分 75分)
          </h3>
          <div className="h-64 w-full mt-8">
            {processedData.osceData.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={processedData.osceData.chartData} margin={{ right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 75]} tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: '10px' }} />
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
