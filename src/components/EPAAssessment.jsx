import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  History, 
  ChevronRight, 
  Plus, 
  Calendar, 
  User, 
  CheckCircle2, 
  AlertCircle,
  BarChart3,
  Search
} from 'lucide-react';
import { EPA_CONFIG, EPA_LEVEL_OPTIONS } from '../data/EPA_Config';

const EPAAssessment = ({ studentEmail, studentName, isTeacher, userProfile }) => {
  const [selectedEPA, setSelectedEPA] = useState(null); // 目前點選的 EPA 主題
  const [showHistoryModal, setShowHistoryModal] = useState(false); // 控制歷史視窗開關
  
  // 模擬資料 (之後會在 Step 4 替換成從 API 抓取的真實資料)
  const [assessments, setAssessments] = useState([]);

  // 根據 studentEmail 篩選出該學員的紀錄 (之後會是 API 邏輯)
  const studentRecords = assessments.filter(r => r.student_email === studentEmail);

  // 開啟歷史視窗
  const handleCardClick = (epa) => {
    setSelectedEPA(epa);
    setShowHistoryModal(true);
  };

  // 關閉視窗
  const closeModal = () => {
    setShowHistoryModal(false);
    setSelectedEPA(null);
  };

  return (
    <div className="space-y-6">
      {/* 標題區 */}
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            EPA 可信任專業活動評估
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            學員：<span className="font-medium text-gray-700">{studentName || '未選擇'}</span>
          </p>
        </div>
        <div className="text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-lg">
          共 {EPA_CONFIG.length} 項主題
        </div>
      </div>

      {/* EPA 卡片列表 (Grid Layout) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {EPA_CONFIG.map((epa) => {
          // 計算該 EPA 的統計數據
          const epaRecords = studentRecords.filter(r => r.epa_id === epa.id);
          const lastRecord = epaRecords.length > 0 ? epaRecords[0] : null; // 假設 API 回傳時已排序
          const count = epaRecords.length;

          return (
            <div 
              key={epa.id}
              onClick={() => handleCardClick(epa)}
              className="bg-white border rounded-xl p-5 hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden"
            >
              {/* 卡片頂部顏色條 (裝飾用) */}
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="flex justify-between items-start mb-3">
                <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded">
                  {epa.id}
                </span>
                {count > 0 && (
                  <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                    <History className="w-3 h-3" /> {count} 次評估
                  </span>
                )}
              </div>

              <h3 className="font-bold text-gray-800 mb-2 group-hover:text-indigo-600 transition-colors">
                {epa.title.replace(`${epa.id}. `, '')}
              </h3>
              
              <p className="text-sm text-gray-500 line-clamp-2 mb-4 h-10">
                {epa.description}
              </p>

              {/* 狀態列 */}
              <div className="pt-3 border-t flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-400">目前信賴等級</span>
                  <span className={`text-sm font-bold ${lastRecord ? 'text-green-600' : 'text-gray-300'}`}>
                    {lastRecord ? lastRecord.evaluation.level : '尚未評估'}
                  </span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          );
        })}
      </div>

      {/* 歷史紀錄彈出視窗 (Modal) */}
      {showHistoryModal && selectedEPA && (
        <HistoryModal 
          epa={selectedEPA} 
          records={studentRecords.filter(r => r.epa_id === selectedEPA.id)}
          onClose={closeModal}
          isTeacher={isTeacher}
          studentName={studentName}
        />
      )}
    </div>
  );
};

// ----------------------------------------------------------------------
// 子元件：歷史紀錄視窗 (History Modal)
// ----------------------------------------------------------------------
const HistoryModal = ({ epa, records, onClose, isTeacher, studentName }) => {
  const [selectedRecordId, setSelectedRecordId] = useState(null);

  // 預設選取最新一筆紀錄
  useEffect(() => {
    if (records.length > 0) {
      setSelectedRecordId(records[0].record_id);
    }
  }, [records]);

  // 找到當前選中的完整紀錄資料
  const currentRecord = records.find(r => r.record_id === selectedRecordId);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* 1. Modal Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
          <div>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              {epa.title}
            </h3>
            <p className="text-sm text-gray-500">學員：{studentName}</p>
          </div>
          <div className="flex items-center gap-3">
            {isTeacher && (
              <button 
                onClick={() => alert("下一步：開啟新增評估表單 (Step 3)")} 
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                新增評估
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 2. Modal Body (Split View) */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* 左側：歷史列表 (Timeline) */}
          <div className="w-1/3 border-r bg-gray-50 overflow-y-auto p-4">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">
              歷史評估紀錄 ({records.length})
            </h4>
            
            <div className="space-y-3">
              {records.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">
                  尚無評估紀錄
                </div>
              ) : (
                records.map((record) => (
                  <button
                    key={record.record_id}
                    onClick={() => setSelectedRecordId(record.record_id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedRecordId === record.record_id 
                        ? 'bg-white border-indigo-500 shadow-md ring-1 ring-indigo-500' 
                        : 'bg-white border-gray-200 hover:border-indigo-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-bold text-gray-800">
                        {record.evaluation.date}
                      </span>
                      {record.status === 'pending_trainee_feedback' && (
                        <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded">
                          待回饋
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                      <User className="w-3 h-3" />
                      {record.teacher_name}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                        Level {record.evaluation.level}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* 右側：詳細內容 (Details) */}
          <div className="w-2/3 overflow-y-auto p-8 bg-white">
            {currentRecord ? (
              <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                {/* 信任等級 */}
                <section>
                  <h4 className="text-sm font-bold text-gray-900 border-l-4 border-indigo-500 pl-3 mb-4">
                    評估結果：信賴等級
                  </h4>
                  <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-indigo-700">Level {currentRecord.evaluation.level}</span>
                      <span className="text-sm text-indigo-600">
                         - {EPA_LEVEL_OPTIONS.find(o => o.value === currentRecord.evaluation.level)?.label.split(':')[1]}
                      </span>
                    </div>
                  </div>
                </section>

                {/* 觀察細項 */}
                <section>
                  <h4 className="text-sm font-bold text-gray-900 border-l-4 border-indigo-500 pl-3 mb-4">
                    細項觀察任務
                  </h4>
                  <div className="space-y-3">
                    {Object.entries(currentRecord.evaluation.checklist).map(([item, isPassed], idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        {isPassed ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-gray-300 mt-0.5 flex-shrink-0" />
                        )}
                        <span className={`text-sm ${isPassed ? 'text-gray-700' : 'text-gray-400 line-through'}`}>
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* 教師回饋 */}
                <section>
                  <h4 className="text-sm font-bold text-gray-900 border-l-4 border-indigo-500 pl-3 mb-4">
                    教師質性回饋
                  </h4>
                  <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 whitespace-pre-line border">
                    {currentRecord.evaluation.feedback_content || "無文字回饋"}
                  </div>
                </section>

                {/* 雙向回饋區 (若還沒填寫，之後這裡會放按鈕) */}
                <section className="pt-6 border-t">
                  <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center justify-between">
                    <span>學員雙向回饋</span>
                    {currentRecord.feedback.satisfaction_score > 0 && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        已完成
                      </span>
                    )}
                  </h4>
                  
                  {currentRecord.feedback.satisfaction_score ? (
                    <div className="bg-green-50 p-4 rounded-lg border border-green-100 space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">教學滿意度：</span>
                        <span className="font-bold text-green-700">{currentRecord.feedback.satisfaction_score} / 9 分</span>
                      </div>
                      <div className="text-sm text-gray-700">
                        <span className="font-bold block mb-1">反思心得：</span>
                        {currentRecord.feedback.reflection}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-gray-400 text-sm">
                      學員尚未填寫回饋
                    </div>
                  )}
                </section>

              </div>
            ) : (
              // Empty State for Detail View
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <Search className="w-12 h-12 mb-3 opacity-20" />
                <p>請從左側選擇一筆紀錄查看詳情</p>
                {isTeacher && records.length === 0 && (
                  <p className="text-xs mt-2 text-indigo-500">或是點擊上方「新增評估」開始第一筆紀錄</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EPAAssessment;
