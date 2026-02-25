import React, { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { Target, TrendingUp, Award, Activity } from 'lucide-react';

const DashboardCharts = ({ studentEmail, dashboardData }) => {
  
  // 1. 資料過濾與預處理
  const processedData = useMemo(() => {
    if (!dashboardData || !studentEmail) return null;

    // 過濾該學員的資料
    const studentDOPS = dashboardData.dops?.filter(d => d.email === studentEmail) || [];
    const studentMiniCEX = dashboardData.minicex?.filter(d => d.email === studentEmail) || [];
    const studentOSCE = dashboardData.osce?.filter(d => d.email === studentEmail) || [];
    const studentKSA = dashboardData.ksa?.filter(d => d.email === studentEmail) || [];
    const studentFinal = dashboardData.final?.[studentEmail] || null;

    // --- 計算 KPI ---
    const calcAvg = (arr) => arr.length > 0 ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : 0;
    
    // DOPS 平均 (從 formData 中抓出所有數字型態的評分並平均)
    const allDopsScores = studentDOPS.flatMap(d => Object.values(d.formData || {}).map(Number).filter(n => !isNaN(n)));
    const avgDops = calcAvg(allDopsScores);

    // Mini-CEX 平均
    const allCexScores = studentMiniCEX.flatMap(d => Object.values(d.scores || {}).filter(s => s !== 'NA').map(Number).filter(n => !isNaN(n)));
    const avgCex = calcAvg(allCexScores);

    // OSCE 最新分數
    const latestOSCE = studentOSCE.length > 0 ? studentOSCE[0].total_score : '無';

    // 完訓進度
    let finalProgress = 0;
    if (studentFinal && studentFinal.items) {
      const items = Object.values(studentFinal.items);
      const passedCount = items.filter(i => i.passed).length;
      finalProgress = items.length > 0 ? Math.round((passedCount / 24) * 100) : 0; // 假設全部有 24 項
    }

    // --- KSA 雷達圖資料 (取最新一次的階段) ---
    let radarData = [
      { subject: '專業知識', score: 0, fullMark: 9 },
      { subject: '專業技能', score: 0, fullMark: 9 },
      { subject: '專業態度', score: 0, fullMark: 9 }
    ];
    if (studentKSA.length > 0) {
      // 找 phaseId 最大的 (最新)
      const latestKSA = studentKSA.reduce((prev, current) => (prev.phaseId > current.phaseId) ? prev : current);
      const scores = latestKSA.scores || {};
      
      const kScores = ['k1','k2','k3','k4'].map(k => Number(scores[k])).filter(n => !isNaN(n));
      const sScores = ['s1','s2','s3','s4'].map(k => Number(scores[k])).filter(n => !isNaN(n));
      const aScores = ['a1','a2','a3','a4'].map(k => Number(scores[k])).filter(n => !isNaN(n));

      radarData = [
        { subject: '專業知識', score: parseFloat(calcAvg(kScores)) || 0, fullMark: 9 },
        { subject: '專業技能', score: parseFloat(calcAvg(sScores)) || 0, fullMark: 9 },
        { subject: '專業態度', score: parseFloat(calcAvg(aScores)) || 0, fullMark: 9 }
      ];
    }

    // --- 歷程折線圖資料 (合併日期) ---
    const timelineMap = {};
    
    // 整理 DOPS
    studentDOPS.forEach(d => {
      const scores = Object.values(d.formData || {}).map(Number).filter(n => !isNaN(n));
      if (scores.length > 0) {
        if (!timelineMap[d.date]) timelineMap[d.date] = {};
        timelineMap[d.date].DOPS = parseFloat(calcAvg(scores));
      }
    });

    // 整理 Mini-CEX
    studentMiniCEX.forEach(d => {
      const scores = Object.values(d.scores || {}).filter(s => s !== 'NA').map(Number).filter(n => !isNaN(n));
      if (scores.length > 0) {
        if (!timelineMap[d.date]) timelineMap[d.date] = {};
        timelineMap[d.date].MiniCEX = parseFloat(calcAvg(scores));
      }
    });

    // 轉為陣列並按日期排序
    const timelineData = Object.keys(timelineMap)
      .sort((a, b) => new Date(a) - new Date(b))
      .map(date => ({
        date: date.substring(5), // 只顯示 MM-DD
        DOPS: timelineMap[date].DOPS || null,
        MiniCEX: timelineMap[date].MiniCEX || null
      }));

    return {
      kpi: { avgDops, avgCex, latestOSCE, finalProgress },
      radarData,
      timelineData
    };
  }, [dashboardData, studentEmail]);

  if (!processedData) return <div className="text-gray-400 text-center py-8">請選擇學員以載入資料</div>;

  return (
    <div className="space-y-6 animate-in fade-in">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 2. KSA 雷達圖 */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">核心能力雷達圖 (KSA最新)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={processedData.radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#4B5563', fontSize: 12, fontWeight: 'bold' }} />
                <PolarRadiusAxis angle={30} domain={[0, 9]} tick={{ fontSize: 10 }} />
                <Radar name="能力評分" dataKey="score" stroke="#8B5CF6" fill="#C4B5FD" fillOpacity={0.6} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. 學習成長折線圖 */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">臨床評估成長軌跡 (滿分9分)</h3>
          <div className="h-64 w-full">
            {processedData.timelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={processedData.timelineData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 9]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="DOPS" stroke="#3B82F6" strokeWidth={3} connectNulls dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="MiniCEX" stroke="#14B8A6" strokeWidth={3} connectNulls dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">尚無評估歷程資料</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardCharts;