import React, { useState, useEffect } from 'react';
import { 
  BookOpen, History, ChevronRight, Plus, 
  Calendar, User, CheckCircle2, AlertCircle, Search, Loader2, Send 
} from 'lucide-react';
import { EPA_CONFIG, EPA_LEVEL_OPTIONS, EPA_PERFORMANCE_OPTIONS } from '../data/EPA_Config';
import EPAFormModal from './EPAFormModal';

const EPAAssessment = ({ studentEmail, studentName, isTeacher, userProfile, apiUrl }) => {
  const [selectedEPA, setSelectedEPA] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 學生回饋狀態
  const [satisfaction, setSatisfaction] = useState(0);
  const [reflection, setReflection] = useState('');

  // API: 讀取
  const fetchEPARecords = async () => {
    if (!studentEmail) return;
    setLoading(true);
    try {
      // 呼叫後端 (相容舊版 action 參數)
      const response = await fetch(`${apiUrl}?action=get_epa_records&student_email=${studentEmail}`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setAssessments(data);
      } else {
        setAssessments([]); 
      }
    } catch (error) {
      console.error("Failed to fetch EPA records:", error);
      setAssessments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEPARecords();
  }, [studentEmail]);

  // API: 儲存新評估 (老師)
  const handleSaveAssessment = async (formData) => {
    setIsSubmitting(true);
    const payload = {
      action: 'save_epa_record',
      student_email: studentEmail,
      epa_id: selectedEPA,
      teacher_name: userProfile?.displayName || 'Unknown Teacher',
      date: new Date().toISOString().split('T')[0],
      evaluation: formData.evaluation, // 傳送評分物件
      feedback: formData.feedback || '',
      level: formData.level || '' // 建議後端也接收 level
    };

    try {
      await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
      });
      alert('評估已儲存！');
      setShowFormModal(false);
      fetchEPARecords();
    } catch (error) {
      alert('儲存失敗，請檢查網路');
    } finally {
      setIsSubmitting(false);
    }
  };

  // API: 儲存回饋 (學生)
  const onSaveFeedback = async (recordId, feedbackData) => {
    if (!recordId) return;
    const payload = {
      action: 'save_trainee_feedback',
      record_id: recordId,
      satisfaction: feedbackData.satisfaction,
      reflection: feedbackData.reflection
    };

    try {
      await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
      });
      alert('回饋已送出！');
      fetchEPARecords();
    } catch (error) {
      alert('送出失敗');
    }
  };

  // 篩選當前選擇的 EPA 紀錄
  const currentHistory = assessments.filter(r => r.epa_id === selectedEPA);
  const currentConfig = selectedEPA ? EPA_CONFIG[selectedEPA] : null;

  // 選擇某一筆紀錄進行查看 (右側詳情)
  const [viewingRecordId, setViewingRecordId] = useState(null);
  
  // 當切換 EPA 項目時，預設顯示最新一筆
  useEffect(() => {
    if (selectedEPA && currentHistory.length > 0) {
      setViewingRecordId(currentHistory[0].record_id);
    } else {
      setViewingRecordId(null);
    }
  }, [selectedEPA, assessments]);

  const currentRecord = currentHistory.find(r => r.record_id === viewingRecordId);

  // --- 畫面渲染 ---

  // 1. 卡片選單模式 (如果沒有選 EPA)
  if (!selectedEPA) {
    return (
      <div className="animate-in fade-in space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600"/> EPA 評估項目
          </h2>
          <div className="text-sm text-gray-500">共 {Object.keys(EPA_CONFIG).length} 項</div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-400"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2"/>讀取中...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(EPA_CONFIG || {}).map(([id, config]) => {
              // 計算該項目的完成次數
              const count = assessments.filter(a => a.epa_id === id).length;
              return (
                <button 
                  key={id}
                  onClick={() => setSelectedEPA(id)}
                  className="flex flex-col text-left bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-indigo-400 transition-all group relative overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="bg-indigo-50 p-2 rounded-lg group-hover:bg-indigo-100 transition-colors">
                      <CheckCircle2 className="w-6 h-6 text-indigo-600" />
                    </div>
                    {count > 0 && (
                      <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">
                        {count} 筆紀錄
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-gray-800 text-base mb-1 group-hover:text-indigo-600 transition-colors">
                    {config.title}
                  </h4>
                  <p className="text-xs text-gray-500 line-clamp-2">
                    {config.description}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // 2. 詳細內容模式 (選取了某個 EPA)
  return (
    <div className="h-[calc(100vh-100px)] flex flex-col animate-in slide-in-from-right-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedEPA(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronRight className="w-5 h-5 text-gray-500 rotate-180" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-800">{currentConfig?.title}</h2>
            <p className="text-xs text-gray-500">{currentConfig?.description}</p>
          </div>
        </div>
        {isTeacher && (
          <button 
            onClick={() => setShowFormModal(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium"
          >
            <Plus className="w-4 h-4" /> 新增評估
          </button>
        )}
      </div>

      {/* Content Grid */}
      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
        
        {/* Left: History List */}
        <div className="col-span-12 md:col-span-4 lg:col-span-3 flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-3 bg-gray-50 border-b border-gray-200 font-bold text-gray-700 flex items-center gap-2">
            <History className="w-4 h-4"/> 歷史紀錄
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {currentHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">尚無紀錄</div>
            ) : (
              currentHistory.map(record => (
                <button
                  key={record.record_id}
                  onClick={() => {
                    setViewingRecordId(record.record_id);
                    // 切換紀錄時重置回饋表單狀態
                    setSatisfaction(record.feedback_satisfaction || 0);
                    setReflection(record.feedback_reflection || '');
                  }}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    viewingRecordId === record.record_id 
                      ? 'bg-indigo-50 border-indigo-200 shadow-sm ring-1 ring-indigo-200' 
                      : 'bg-white border-gray-100 hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-gray-800 text-sm">{record.date}</span>
                    {/* Level Badge */}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                      record.level === 'Level 5' ? 'bg-green-50 text-green-700 border-green-200' :
                      record.level === 'Level 4' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      'bg-gray-50 text-gray-600 border-gray-200'
                    }`}>
                      {record.level || 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <User className="w-3 h-3"/> {record.teacher_name}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right: Detail View */}
        <div className="col-span-12 md:col-span-8 lg:col-span-9 flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="flex-1 overflow-y-auto">
            {currentRecord ? (
              <div className="p-6 space-y-8">
                {/* 1. 基本資訊 */}
                <div className="flex justify-between items-start pb-6 border-b border-gray-100">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-indigo-500"/> {currentRecord.date} 評估結果
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">評估教師：{currentRecord.teacher_name}</p>
                  </div>
                  <div className="text-right">
                    <span className="block text-2xl font-bold text-indigo-600">{currentRecord.level}</span>
                    <span className="text-xs text-gray-400">授權層級</span>
                  </div>
                </div>

                {/* 2. 檢核項目 (使用 || {} 防止崩潰) */}
                <section>
                  <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4"/> 評估細項
                  </h4>
                  <div className="grid gap-3">
                    {/* ★★★ 防呆保護：Object.entries 前加上 || {} ★★★ */}
                    {Object.entries(currentRecord.evaluation || {}).map(([key, value]) => {
                      // 嘗試從 config 找對應的標題，找不到就顯示 key
                      // currentConfig?.items 可能結構不同，這裡做簡單處理
                      // 假設 config.items 是物件或陣列
                      let label = key;
                      if (currentConfig?.items && !Array.isArray(currentConfig.items)) {
                         label = currentConfig.items[key]?.label || key;
                      }

                      return (
                        <div key={key} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg text-sm">
                          <span className="text-gray-700 font-medium">{label}</span>
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            value === 'yes' ? 'bg-green-100 text-green-700' : 
                            value === 'no' ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-500'
                          }`}>
                            {value === 'yes' ? '通過' : value === 'no' ? '未通過' : 'N/A'}
                          </span>
                        </div>
                      );
                    })}
                    {/* 如果 evaluation 為空，顯示提示 */}
                    {Object.keys(currentRecord.evaluation || {}).length === 0 && (
                      <div className="text-center text-gray-400 py-4 italic">無細項資料</div>
                    )}
                  </div>
                </section>

                {/* 3. 教師回饋 */}
                {currentRecord.feedback_content && (
                  <section className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <h4 className="font-bold text-blue-800 mb-2 text-sm">教師回饋</h4>
                    <p className="text-blue-900 text-sm whitespace-pre-wrap">{currentRecord.feedback_content}</p>
                  </section>
                )}

                {/* 4. 學員回饋區 */}
                <section className="pt-6 border-t border-gray-100">
                  <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <Send className="w-4 h-4"/> 學員回饋
                  </h4>
                  
                  {/* 如果已經有回饋資料 (且不是正在編輯中) */}
                  {currentRecord.feedback_reflection && !isTeacher ? (
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 space-y-2">
                       <div className="flex items-center gap-2 mb-2">
                         <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                           滿意度: {currentRecord.feedback_satisfaction} 分
                         </span>
                       </div>
                       <p className="text-orange-900 text-sm">{currentRecord.feedback_reflection}</p>
                    </div>
                  ) : (
                    // 如果沒有回饋，且是學生本人，顯示編輯表單
                    !isTeacher ? (
                       <div className="space-y-4 bg-gray-50 p-5 rounded-xl border border-gray-200">
                         <div>
                           <label className="block text-sm font-bold text-gray-700 mb-2">本次評估滿意度 (1-10)</label>
                           <div className="flex gap-1 flex-wrap">
                             {[1,2,3,4,5,6,7,8,9,10].map(num => (
                               <button
                                 key={num}
                                 onClick={() => setSatisfaction(num)}
                                 className={`w-8 h-8 rounded-full border text-sm font-bold transition-all ${
                                   satisfaction === num 
                                     ? 'bg-orange-500 text-white border-orange-600 scale-110' 
                                     : 'bg-white text-gray-500 border-gray-300 hover:border-orange-400'
                                 }`}
                               >
                                 {num}
                               </button>
                             ))}
                           </div>
                         </div>
                         
                         <div>
                           <label className="block text-sm font-bold text-gray-700 mb-2">心得與反思</label>
                           <textarea 
                             className="w-full p-3 border border-gray-300 rounded-lg text-sm h-24 focus:ring-2 focus:ring-orange-300 outline-none"
                             placeholder="針對老師的建議，您的想法是..."
                             value={reflection}
                             onChange={(e) => setReflection(e.target.value)}
                           />
                         </div>

                         <button 
                           onClick={() => onSaveFeedback(currentRecord.record_id, { satisfaction, reflection })}
                           disabled={satisfaction === 0}
                           className="w-full py-2 bg-orange-600 text-white rounded-lg font-bold text-sm hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                         >
                           {satisfaction === 0 ? "請先選擇滿意度分數" : "送出回饋"}
                         </button>
                      </div>
                    ) : (
                      // 老師端：顯示提示
                      <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-gray-400 text-sm italic">
                        學員尚未填寫回饋
                      </div>
                    )
                  )}
                </section>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400"><Search className="w-12 h-12 mb-3 opacity-20"/><p>請選擇一筆紀錄</p></div>
            )}
          </div>
        </div>
      </div>
      
      {/* Form Modal */}
      {showFormModal && (
        <EPAFormModal 
          config={currentConfig}
          studentName={studentName}
          onClose={() => setShowFormModal(false)}
          onSubmit={handleSaveAssessment}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
};

export default EPAAssessment;
