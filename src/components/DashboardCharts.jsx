import React, { useMemo, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { Target, TrendingUp, Award, Activity } from 'lucide-react';

const DashboardCharts = ({ studentEmail, dashboardData }) => {

  // 加入除錯日誌，方便我們在 F12 Console 觀察資料長怎樣
  useEffect(() => {
    console.log("📊 [儀表板除錯] 目前選定的學員 Email:", studentEmail);
    console.log("📦 [儀表板除錯] 後端傳來的原始資料:", dashboardData);
  }, [studentEmail, dashboardData]);
  
  // 資料過濾與預處理
  const processedData = useMemo(() => {
    if (!dashboardData || !studentEmail) return null;

    // ★ 強化：比對 Email 時無視大小寫與前後空白
    const isMatch = (email1, email2) => {
      if (!email1 || !email2) return false;
      return String(email1).toLowerCase().trim() === String(email2).toLowerCase().trim();
    };

    // 如果後端回傳的是 error (代表 GAS 沒更新成功)，就回傳 null
    if (dashboardData.status === 'error') {
      console.error("❌ 後端回傳錯誤，請確認 GAS 是否有確實「建立新版本」部署！");
      return null;
    }

    // 過濾該學員的資料
    const studentDOPS = (dashboardData.dops || []).filter(d => isMatch(d.email, studentEmail));
    const studentMiniCEX = (dashboardData.minicex || []).filter(d => isMatch(d.email, studentEmail));
    const studentOSCE = (dashboardData.osce || []).filter(d => isMatch(d.email, studentEmail));
    const studentKSA = (dashboardData.ksa || []).filter(d => isMatch(d.email, studentEmail));
    
    // 完訓進度 (Final 是以 email 當 key 的 object)
    let studentFinal = null;
    if (dashboardData.final) {
      const matchedKey = Object.keys(dashboardData.final).find(k => isMatch(k, studentEmail));
      if (matchedKey) studentFinal = dashboardData.final[matchedKey];
    }

    // --- 計算 KPI ---
    const calcAvg = (arr) => arr.length > 0 ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : 0;
    
    // DOPS 平均 (嘗試從 formData 中抓出數字，如果您的 DOPS 不是數字評分，這裡會是 0)
    const allDopsScores = studentDOPS.flatMap(d => Object.values(d.formData || {}).map(Number).filter(n => !isNaN(n)));
    const avgDops = calcAvg(allDopsScores);

    // Mini-CEX 平均
    const allCexScores = studentMiniCEX.flatMap(d => Object.values(d.scores || {}).filter(s => s !== 'NA').map(Number).filter(n => !isNaN(n)));
    const avgCex = calcAvg(allCexScores);

    // OSCE 最新分數 (因為有照日期排序，取 [0] 就是最新)
    const latestOSCE = studentOSCE.length > 0 ? studentOSCE[0].total_score : '無';

    // 完訓進度
    let finalProgress = 0;
    if (studentFinal && studentFinal.items) {
      const items = Object.values(studentFinal.items);
      const passedCount = items.filter(i => i.passed).length;
      // 假設完訓大約 20 項，您可以根據您的實際數量修改分母 (這裡暫定 20)
      finalProgress = items.length > 0 ? Math.min(Math.round((passedCount / 20) * 100), 100) : 0; 
    }

    // --- KSA 雷達圖資料 (取最新一次的階段) ---
    let radarData = [
      { subject: '專業知識', score: 0, fullMark: 9 },
      { subject: '專業技能', score: 0, fullMark: 9 },
      { subject: '專業態度', score: 0, fullMark: 9 }
    ];
    
    if (studentKSA.length > 0) {
      const latestKSA = studentKSA.reduce((prev, current) => (prev.phaseId > current.phaseId) ? prev : current);
      const scores = latestKSA.scores || {};
      
      // 注意：這裡假設您的 KSA 項目 ID 是包含 k, s, a 開頭的 (例如 k_1, s_1, a_1 或 item_k1)
      // 自動抓取屬性名稱中包含 'k' / 's' / 'a' 的數值來平均
      const kScores = Object.entries(scores).filter(([key]) => key.toLowerCase().includes('k')).map(e => Number(e[1])).filter(n => !isNaN(n));
      const sScores = Object.entries(scores).filter(([key]) => key.toLowerCase().includes('s')).map(e => Number(e[1])).filter(n => !isNaN(n));
      const aScores = Object.entries(scores).filter(([key]) => key.toLowerCase().includes('a')).map(e => Number(e[1])).filter(n => !isNaN(n));

      radarData = [
        { subject: '專業知識', score: parseFloat(calcAvg(kScores)) || 0, fullMark: 9 },
        { subject: '專業技能', score: parseFloat(calcAvg(sScores)) || 0, fullMark: 9 },
        { subject: '專業態度', score: parseFloat(calcAvg(aScores)) || 0, fullMark: 9 }
      ];
    }

    // --- 歷程折線圖資料 (合併日期) ---
    const timelineMap = {};
    
    studentDOPS.forEach(d => {
      const scores = Object.values(d.formData || {}).map(Number).filter(n => !isNaN(n));
      if (scores.length > 0) {
        if (!timelineMap[d.date]) timelineMap[d.date] = {};
        timelineMap[d.date].DOPS = parseFloat(calcAvg(scores));
      }
    });

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
      timelineData,
      hasData: studentDOPS.length || studentMiniCEX.length || studentOSCE.length || studentKSA.length
    };
  }, [dashboardData, studentEmail]);

  if (!processedData) return <div className="text-gray-400 text-center py-8">正在載入或無法解析資料，請檢查網路狀態。</div>;
  if (!processedData.hasData) return <div className="text-orange-500 bg-orange-50 p-6 rounded-xl text-center font-bold border border-orange-200">此學員目前沒有任何評估紀錄。</div>;

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
              <div className="h-full flex items-center justify-center text-gray-400">目前尚無 DOPS 或 Mini-CEX 的「數字型」評估分數</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardCharts;
