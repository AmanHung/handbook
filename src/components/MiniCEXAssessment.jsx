import React, { useState, useEffect } from 'react';
import { 
  Stethoscope, History, Plus, ChevronRight, User, 
  CheckCircle2, Send, Save, Loader2, Calendar, AlertCircle
} from 'lucide-react';
import { 
  MINICEX_TOPICS, COMPLEXITY_OPTIONS, EVALUATION_ITEMS, getScoreStyle 
} from '../data/MiniCEX_Config';

const MiniCEXAssessment = ({ studentEmail, studentName, isTeacher, userProfile, apiUrl }) => {
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewingRecordId, setViewingRecordId] = useState(null);
  
  // 新增評估表單狀態
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    complexity: { medication: '', disease: '' },
    scores: {},
    teacher_feedback: { good: '', improve: '' }
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 學生回饋表單狀態
  const [feedbackData, setFeedbackData] = useState({ reflection: '', improve: '' });

  // 讀取資料
  const fetchRecords = async () => {
    if (!studentEmail) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}?type=getMiniCEX&studentEmail=${studentEmail}`);
      const data = await res.json();
      setRecords(data.records || []);
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [studentEmail]);

  useEffect(() => {
    if (selectedTopic && records.length > 0 && !viewingRecordId && !isAdding) {
      setViewingRecordId(records[0].record_id);
    }
  }, [selectedTopic, records]);

  // 教師儲存評估
  const handleSaveAssessment = async () => {
    if (!formData.complexity.medication || !formData.complexity.disease) return alert('請選擇複雜度');
    const allScores = EVALUATION_ITEMS.every(item => formData.scores[item.id]);
    if (!allScores) return alert('請完成所有項目評分');

    setIsSubmitting(true);
    const payload = {
      action: 'save_minicex_record',
      student_email: studentEmail,
      student_name: studentName,
      teacher_name: userProfile?.displayName || 'Unknown',
      date: formData.date,
      complexity: formData.complexity,
      scores: formData.scores,
      teacher_feedback: formData.teacher_feedback
    };

    try {
      await fetch(apiUrl, { method: 'POST', body: JSON.stringify(payload) });
      alert('評估已儲存並通知學員！');
      setIsAdding(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        complexity: { medication: '', disease: '' },
        scores: {},
        teacher_feedback: { good: '', improve: '' }
      });
      fetchRecords();
    } catch (e) {
      alert('儲存失敗');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 學員儲存回饋
  const handleSaveFeedback = async (recordId) => {
    if (!feedbackData.reflection) return alert('請填寫心得');
    setIsSubmitting(true);
    try {
      await fetch(apiUrl, {
        method: 'POST',
        body: JSON.stringify({
          action: 'save_minicex_feedback',
          record_id: recordId,
          student_feedback: feedbackData
        })
      });
      alert('回饋已送出！');
      fetchRecords();
    } catch (e) {
      alert('送出失敗');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentRecord = records.find(r => r.record_id === viewingRecordId);

  // 1. 卡片選單 (首頁)
  if (!selectedTopic) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in">
        {MINICEX_TOPICS.map(topic => {
          // ★★★ 修改處 1：計算小數第一位 ★★★
          if (latestRecord) {
            const numericScores = Object.values(latestRecord.scores).filter(s => s !== 'NA').map(Number).filter(n => !isNaN(n));
            if (numericScores.length > 0) {
              const totalScore = numericScores.reduce((a, b) => a + b, 0);
              
              // 取小數第一位 (回傳字串，所以需要 parseFloat 轉回數字作判斷，或直接用字串顯示)
              const avgScoreStr = (totalScore / numericScores.length).toFixed(1);
              avgScore = parseFloat(avgScoreStr); 
              
              // 依據平均分判斷結果 (1-3, 4-6, 7-9)
              // 注意：因為有小數，邏輯微調為 < 4, < 7
              if (avgScore < 4) {
                resultLabel = '有待加強';
                resultColor = 'bg-red-50 text-red-700 border-red-200';
              } else if (avgScore < 7) {
                resultLabel = '達到預期標準';
                resultColor = 'bg-blue-50 text-blue-700 border-blue-200';
              } else {
                resultLabel = '表現優秀';
                resultColor = 'bg-green-50 text-green-700 border-green-200';
              }
              
              // 覆蓋 avgScore 為字串，確保顯示時有小數點 (例如 6.0)
              avgScore = avgScoreStr;
            }
          }

          return (
            <button 
              key={topic.id}
              onClick={() => setSelectedTopic(topic)}
              className="flex flex-col text-left bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-teal-400 transition-all group"
            >
              <div className="flex justify-between items-start mb-3 w-full">
                <div className="bg-teal-50 p-2 rounded-lg group-hover:bg-teal-100 transition-colors">
                  <Stethoscope className="w-6 h-6 text-teal-600" />
                </div>
                {/* 顯示最新平均分與結果 */}
                {latestRecord ? (
                  <div className="flex flex-col items-end">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${resultColor}`}>
                      平均 {avgScore} 分 ({resultLabel})
                    </span>
                    <span className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3"/> {latestRecord.date}
                    </span>
                  </div>
                ) : (
                  <span className="bg-gray-100 text-gray-500 text-xs font-bold px-2 py-1 rounded-full border border-gray-200">
                    尚無紀錄
                  </span>
                )}
              </div>
              <h4 className="font-bold text-gray-800 text-base mb-1 group-hover:text-teal-600">
                {topic.title}
              </h4>
              <p className="text-xs text-gray-500">{topic.description}</p>
            </button>
          );
        })}
      </div>
    );
  }

  // ★★★ 修改處 2：詳細檢視區的平均分計算 ★★★
  let detailAvgScore = 0;
  let detailResultLabel = '';
  let detailResultColor = '';
  if (currentRecord) {
     const numScoresDetail = Object.values(currentRecord.scores).filter(s => s !== 'NA').map(Number).filter(n => !isNaN(n));
     if (numScoresDetail.length > 0) {
        const sumDetail = numScoresDetail.reduce((a, b) => a + b, 0);
        
        // 取小數第一位
        const detailAvgStr = (sumDetail / numScoresDetail.length).toFixed(1);
        const detailAvgNum = parseFloat(detailAvgStr);

        if (detailAvgNum < 4) { 
           detailResultLabel = '有待加強'; 
           detailResultColor = 'text-red-600 border-red-200 bg-red-50'; 
        } else if (detailAvgNum < 7) { 
           detailResultLabel = '達到預期標準'; 
           detailResultColor = 'text-blue-600 border-blue-200 bg-blue-50'; 
        } else { 
           detailResultLabel = '表現優秀'; 
           detailResultColor = 'text-green-600 border-green-200 bg-green-50'; 
        }
        
        detailAvgScore = detailAvgStr; // 準備顯示用的字串
     }
  }

  // 2. 詳細內容與表單
  return (
    <div className="h-[calc(100vh-180px)] flex flex-col animate-in slide-in-from-right-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => { setSelectedTopic(null); setIsAdding(false); setViewingRecordId(null); }} className="p-2 hover:bg-gray-100 rounded-full">
            <ChevronRight className="w-5 h-5 text-gray-500 rotate-180" />
          </button>
          <h2 className="text-xl font-bold text-gray-800">{selectedTopic.title}</h2>
        </div>
        {isTeacher && !isAdding && (
          <button 
            onClick={() => { setIsAdding(true); setViewingRecordId(null); }}
            className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 shadow-sm font-medium"
          >
            <Plus className="w-4 h-4" /> 新增評估
          </button>
        )}
      </div>

      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
        {/* 左側列表 */}
        <div className="col-span-12 md:col-span-4 lg:col-span-3 flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-3 bg-gray-50 border-b font-bold text-gray-700 flex items-center gap-2">
            <History className="w-4 h-4"/> 評估紀錄
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {records.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">尚無紀錄</div>
            ) : (
              records.map(record => {
                // 計算列表上的平均分
                const numScores = Object.values(record.scores).filter(s => s !== 'NA').map(Number).filter(n => !isNaN(n));
                const recSum = numScores.reduce((a, b) => a + b, 0);
                const recAvg = numScores.length > 0 ? (recSum / numScores.length).toFixed(1) : 0;

                return (
                  <button
                    key={record.record_id}
                    onClick={() => { setViewingRecordId(record.record_id); setIsAdding(false); }}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      viewingRecordId === record.record_id 
                        ? 'bg-teal-50 border-teal-200 ring-1 ring-teal-200' 
                        : 'bg-white border-gray-100 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between font-bold text-gray-800 text-sm">
                      {record.date}
                      <span className="text-teal-700 bg-teal-100 px-2 py-0.5 rounded text-xs border border-teal-200">
                        平均 {recAvg} 分
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 flex justify-between items-center mt-1">
                      <span className="flex items-center gap-1"><User className="w-3 h-3"/> {record.teacher_name}</span>
                      {record.status === 'teacher_graded' && <span className="text-orange-500 text-[10px]">待回饋</span>}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* 右側內容 */}
        <div className="col-span-12 md:col-span-8 lg:col-span-9 flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="flex-1 overflow-y-auto p-6">
            
            {/* A. 新增模式 (教師) */}
            {isAdding && isTeacher ? (
              <div className="space-y-8">
                {/* 日期與複雜度 */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">評估日期</label>
                    <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="border rounded p-2"/>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {['medication', 'disease'].map(type => (
                      <div key={type}>
                        <label className="block text-sm font-bold text-gray-700 mb-2">{type === 'medication' ? '用藥' : '疾病'}複雜度</label>
                        <div className="flex flex-col gap-2">
                          {COMPLEXITY_OPTIONS[type].map(opt => (
                            <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                              <input 
                                type="radio" 
                                name={`comp_${type}`}
                                checked={formData.complexity[type] === opt.value}
                                onChange={() => setFormData({
                                  ...formData, 
                                  complexity: { ...formData.complexity, [type]: opt.value }
                                })}
                                className="text-teal-600"
                              />
                              {opt.label}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 評分項目 */}
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-800 border-l-4 border-teal-500 pl-3">評分項目 (1-9)</h3>
                  {EVALUATION_ITEMS.map(item => (
                    <div key={item.id} className="flex items-center justify-between border-b pb-2">
                      <span className="text-sm font-medium text-gray-700 w-1/3">{item.label}</span>
                      <div className="flex gap-1 flex-wrap justify-end">
                        {[1,2,3,4,5,6,7,8,9].map(num => (
                          <button
                            key={num}
                            onClick={() => setFormData({...formData, scores: {...formData.scores, [item.id]: num}})}
                            className={`w-8 h-8 rounded text-xs font-bold border transition-all ${
                              formData.scores[item.id] === num 
                                ? 'bg-teal-600 text-white border-teal-600' 
                                : 'hover:bg-gray-100 text-gray-600'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                        <button 
                          onClick={() => setFormData({...formData, scores: {...formData.scores, [item.id]: 'NA'}})}
                          className={`px-2 h-8 rounded text-xs border ml-2 ${formData.scores[item.id] === 'NA' ? 'bg-gray-600 text-white' : 'text-gray-500'}`}
                        >
                          N/A
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 教師回饋 */}
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-800 border-l-4 border-teal-500 pl-3">教師回饋</h3>
                  <textarea 
                    placeholder="表現良好項目..." 
                    className="w-full p-3 border rounded-lg h-20 text-sm"
                    value={formData.teacher_feedback.good}
                    onChange={e => setFormData({...formData, teacher_feedback: {...formData.teacher_feedback, good: e.target.value}})}
                  />
                  <textarea 
                    placeholder="建議加強項目..." 
                    className="w-full p-3 border rounded-lg h-20 text-sm"
                    value={formData.teacher_feedback.improve}
                    onChange={e => setFormData({...formData, teacher_feedback: {...formData.teacher_feedback, improve: e.target.value}})}
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <button 
                    onClick={handleSaveAssessment} 
                    disabled={isSubmitting}
                    className="bg-teal-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-teal-700 flex items-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin w-4 h-4"/> : <Save className="w-4 h-4"/>}
                    儲存評估
                  </button>
                </div>
              </div>
            ) : currentRecord ? (
              // B. 檢視模式
              <div className="space-y-8">
                {/* 基本資訊與總分 */}
                <div className="flex justify-between items-start border-b pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-teal-600"/> {currentRecord.date}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">評估教師：{currentRecord.teacher_name}</p>
                    <div className="text-xs text-gray-500 mt-2 space-y-1">
                      <p>用藥複雜度: {COMPLEXITY_OPTIONS.medication.find(o => o.value === currentRecord.complexity.medication)?.label}</p>
                      <p>疾病複雜度: {COMPLEXITY_OPTIONS.disease.find(o => o.value === currentRecord.complexity.disease)?.label}</p>
                    </div>
                  </div>
                  {/* 右上方顯示平均分與判定結果 */}
                  <div className="text-right">
                    <div className="text-3xl font-bold text-gray-800 mb-2">
                      {detailAvgScore} <span className="text-sm font-normal text-gray-500">/ 9 分 (平均)</span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${detailResultColor}`}>
                      {detailResultLabel}
                    </span>
                  </div>
                </div>

                {/* 評分結果 */}
                <div className="space-y-2">
                  {EVALUATION_ITEMS.map(item => {
                    const score = currentRecord.scores[item.id];
                    return (
                      <div key={item.id} className="flex justify-between items-center text-sm p-2 hover:bg-gray-50 rounded">
                        <span className="text-gray-700">{item.label}</span>
                        <span className={`px-2 py-1 rounded font-bold text-xs ${getScoreStyle(score)}`}>
                          {score === 'NA' ? '不適用' : `${score} 分`}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* 回饋區 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-bold text-blue-800 text-sm mb-2">表現良好</h4>
                    <p className="text-sm text-blue-900 whitespace-pre-wrap">{currentRecord.teacher_feedback.good}</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h4 className="font-bold text-orange-800 text-sm mb-2">建議加強</h4>
                    <p className="text-sm text-orange-900 whitespace-pre-wrap">{currentRecord.teacher_feedback.improve}</p>
                  </div>
                </div>

                {/* 學員回饋 (雙向) */}
                <div className="pt-6 border-t">
                  <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Send className="w-4 h-4"/> 學員回饋
                  </h4>
                  {currentRecord.status === 'completed' ? (
                    <div className="bg-gray-50 p-4 rounded-lg border">
                      <p className="text-sm font-bold text-gray-700">心得感想：</p>
                      <p className="text-sm text-gray-600 mb-3">{currentRecord.student_feedback.reflection}</p>
                      <p className="text-sm font-bold text-gray-700">自我加強：</p>
                      <p className="text-sm text-gray-600">{currentRecord.student_feedback.improve}</p>
                    </div>
                  ) : !isTeacher ? (
                    <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-orange-200">
                      <textarea 
                        placeholder="心得與感想..." 
                        className="w-full p-2 border rounded text-sm"
                        value={feedbackData.reflection}
                        onChange={e => setFeedbackData({...feedbackData, reflection: e.target.value})}
                      />
                      <textarea 
                        placeholder="自覺可再加強部分..." 
                        className="w-full p-2 border rounded text-sm"
                        value={feedbackData.improve}
                        onChange={e => setFeedbackData({...feedbackData, improve: e.target.value})}
                      />
                      <button 
                        onClick={() => handleSaveFeedback(currentRecord.record_id)}
                        disabled={isSubmitting}
                        className="w-full bg-orange-500 text-white py-2 rounded font-bold text-sm hover:bg-orange-600"
                      >
                        {isSubmitting ? '傳送中...' : '送出回饋'}
                      </button>
                    </div>
                  ) : (
                    <div className="text-center text-gray-400 text-sm py-4 italic border border-dashed rounded">
                      等待學員回饋中...
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                請選擇一筆紀錄
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MiniCEXAssessment;
