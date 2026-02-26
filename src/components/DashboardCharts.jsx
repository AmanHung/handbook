import React, { useMemo, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, ReferenceLine // [新] 引入長條圖相關元件
} from 'recharts';
import { Target, TrendingUp, Award, Activity, ClipboardList, CheckSquare } from 'lucide-react';

// 預設的折線圖顏色庫
const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#14B8A6', '#F97316'];

// EPA 等級對照表 (0代表未評估，1~7 對應實際等級)
const EPA_LEVEL_LABELS = ['未評估', '2a', '2b', '3a', '3b', '3c', '4', '5'];

const DashboardCharts = ({ studentEmail, dashboardData }) => {

  useEffect(() => {
    console.log("📊 [儀表板除錯] 目前選定的學員 Email:", studentEmail);
  }, [studentEmail, dashboardData]);
  
  const processedData = useMemo(() => {
    if (!dashboardData || !studentEmail || dashboardData.status === 'error') return null;

    const isMatch = (e1, e2) => String(e1).toLowerCase().trim() === String(e2).toLowerCase().trim();

    // 1. 過濾學員資料
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

    // --- 計算 KPI 數字 ---
    const calcAvg = (arr) => arr.length > 0 ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : 0;
    
    const allDopsScores = studentDOPS.flatMap(d => Object.values(d.formData || {}).map(Number).filter(n => !isNaN(n)));
    const avgDops = calcAvg(allDopsScores);

    const allCexScores = studentMiniCEX.flatMap(d => Object.values(d.scores || {}).filter(s => s !== 'NA').map(Number).filter(n => !isNaN(n)));
    const avgCex = calcAvg(allCexScores);

    const latestOSCE = studentOSCE.length > 0 ? studentOSCE[0].total_score : '無';

    let finalProgress = 0;
    if (studentFinal && studentFinal.items) {
      const items = Object.values(studentFinal.items);
      const passedCount = items.filter(i => i.passed).length;
      finalProgress = items.length > 0 ? Math.min(Math.round((passedCount / 20) * 100), 100) : 0; 
    }

    // --- 準備 KSA 雷達圖 ---
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

    // --- 輔助函式：將紀錄轉換成折線圖的序列資料 ---
    const buildTimelineData = (records, itemKeyField, scoreField) => {
      const dateMap = {};
      const sorted = [...records].sort((a, b) => new Date(a.date) - new Date(b.date));
      
      sorted.forEach(r => {
        const d = r.date.substring(5); 
        const itemName = r[itemKeyField] || '綜合評估';
        const score = Number(r[scoreField]) || 0;
        
        if (!dateMap[d]) dateMap[d] = { date: d };
        dateMap[d][itemName] = score;
      });

      const lines = [...new Set(sorted.map(r => r[itemKeyField] || '綜合評估'))];
      return { chartData: Object.values(dateMap), lines };
    };

    // 1. [改寫] EPA 最新進度長條圖
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
      return 0; // 若都沒對應到則為 0
    };

    const latestEpaMap = {};
    studentEPA.forEach(r => {
       const id = r.epaId;
       // 抓取每個 EPA 項目的「最新」一筆紀錄
       if (!latestEpaMap[id] || new Date(r.date) > new Date(latestEpaMap[id].date)) {
           latestEpaMap[id] = r;
       }
    });
    
    const epaBarData = Object.values(latestEpaMap).map(r => ({
       epaId: r.epaId,
       levelIndex: extractEpaLevelIndex(r.level),
       levelText: r.level
    }));

    // 2. DOPS 折線圖
    const dopsWithScore = studentDOPS.map(d => {
      const s = Object.values(d.formData || {}).map(Number).filter(n => !isNaN(n));
      return { ...d, score: parseFloat(calcAvg(s)) };
    });
    const dopsData = buildTimelineData(dopsWithScore, 'dopsId', 'score');

    // 3. Mini-CEX 折線圖
    const cexWithScore = studentMiniCEX.map(d => {
      const s = Object.values(d.scores || {}).filter(v => v !== 'NA').map(Number).filter(n => !isNaN(n));
      return { ...d, topic: '藥品諮詢演練', score: parseFloat(calcAvg(s)) };
    });
    const minicexData = buildTimelineData(cexWithScore, 'topic', 'score');

    // 4. OSCE 折線圖
    const osceWithTopic = studentOSCE.map(d => ({ ...d, topic: 'OSCE 總分' }));
    const osceData = buildTimelineData(osceWithTopic, 'topic', 'total_score');

    return {
      kpi: { avgDops, avgCex, latestOSCE, finalProgress },
      radarData,
      ksaPhases,
      epaBarData, // [新] EPA 長條圖資料
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
                    fill={CHART_COLORS[idx % CHART_COLORS.length]} 
                    fillOpacity={0.2} 
                  />
                ))}
                <Tooltip />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          ) : <div className="h-full flex items-center justify-center text-gray-400">尚無 KSA 評估資料</div>}
        </div>
      </div>

      {/* 3. 評估圖表區塊 (2x2 Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* [新] EPA 橫向長條圖 */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-500"/> EPA 信任等級進度 (目前最高)
          </h3>
          <div className="h-64 w-full">
            {processedData.epaBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={processedData.epaBarData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                  <XAxis 
                    type="number" 
                    domain={[0, 7]} 
                    tickCount={8} 
                    tickFormatter={(val) => EPA_LEVEL_LABELS[val] || ''} 
                    tick={{ fontSize: 12, fontWeight: 'bold' }}
                  />
                  {/* Y 軸顯示項目名稱，預留空間以免字被切掉 */}
                  <YAxis type="category" dataKey="epaId" width={100} tick={{ fontSize: 12, fill: '#4B5563' }} />
                  
                  {/* 滑鼠移上去的提示框 */}
                  <Tooltip 
                    formatter={(value) => [EPA_LEVEL_LABELS[value] || '未評估', '目前等級']}
                    contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                  />
                  
                  {/* 及格線設定在 Index 6 (也就是 Level 4) */}
                  <ReferenceLine x={6} stroke="#EF4444" strokeDasharray="5 5" label={{ position: 'top', value: '及格線(4)', fill: '#EF4444', fontSize: 11, fontWeight: 'bold' }} />
                  
                  <Bar dataKey="levelIndex" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
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
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: '10px' }} />
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
