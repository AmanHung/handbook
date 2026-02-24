import React, { useState, useEffect } from 'react';
import { 
  History, Plus, ChevronRight, User, 
  CheckCircle2, Send, Save, Loader2, Calendar, ClipboardList
} from 'lucide-react';
import { 
  OSCE_TOPICS, OSCE_ITEMS, OSCE_FEEDBACK_OPTIONS, getOSCEResult 
} from '../data/OSCE_Config';

const OSCEAssessment = ({ studentEmail, studentName, isTeacher, userProfile, apiUrl }) => {
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewingRecordId, setViewingRecordId] = useState(null);
  
  // 新增評估狀態
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    scores: {}, // { item_01: 5, item_02: 3 ... }
    teacher_feedback: { attitude: [], skills: [], other: '' }
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 學生回饋狀態
  const [feedbackData, setFeedbackData] = useState({ reflection: '', improve: '' });

  const fetchRecords = async () => {
    if (!studentEmail) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}?type=getOSCE&studentEmail=${studentEmail}`);
      const data = await res.json();
      setRecords(data.records || []);
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRecords(); }, [studentEmail]);

  useEffect(() => {
    if (selectedTopic && records.length > 0 && !viewingRecordId && !isAdding) {
      setViewingRecordId(records[0].record_id);
    }
  }, [selectedTopic, records]);

  // 計算總分
  const totalScore = Object.values(formData.scores).reduce((acc, curr) => acc + (parseInt(curr) || 0), 0);

  const handleCheckboxChange = (category, value) => {
    setFormData(prev => {
      const currentArray = prev.teacher_feedback[category];
      const newArray = currentArray.includes(value) 
        ? currentArray.filter(v => v !== value) 
        : [...currentArray, value];
      return { ...prev, teacher_feedback: { ...prev.teacher_feedback, [category]: newArray } };
    });
  };

  const handleSaveAssessment = async () => {
    const allScoresFilled = OSCE_ITEMS.every(item => formData.scores[item.id] !== undefined);
    if (!allScoresFilled) return alert('請完成所有(15項)評分項目！');

    setIsSubmitting(true);
    const payload = {
      action: 'save_osce_record',
      student_email: studentEmail,
      student_name: studentName,
      teacher_name: userProfile?.displayName || 'Unknown',
      date: formData.date,
      scores: formData.scores,
      total_score: totalScore,
      teacher_feedback: formData.teacher_feedback
    };

    try {
      await fetch(apiUrl, { method: 'POST', body: JSON.stringify(payload) });
      alert('OSCE 評估已儲存並寄信通知學員！');
      setIsAdding(false);
      setFormData({ date: new Date().toISOString().split('T')[0], scores: {}, teacher_feedback: { attitude: [], skills: [], other: '' } });
      fetchRecords();
    } catch (e) {
      alert('儲存失敗');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveFeedback = async (recordId) => {
    if (!feedbackData.reflection) return alert('請填寫心得');
    setIsSubmitting(true);
    try {
      await fetch(apiUrl, { method: 'POST', body: JSON.stringify({ action: 'save_osce_feedback', record_id: recordId, student_feedback: feedbackData }) });
      alert('回饋已送出！');
      fetchRecords();
    } catch (e) { alert('送出失敗'); } finally { setIsSubmitting(false); }
  };

  const currentRecord = records.find(r => r.record_id === viewingRecordId);

  // 1. 首頁卡片選單
  if (!selectedTopic) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in">
        {OSCE_TOPICS.map(topic => {
          // ★★★ 抓取最新一筆紀錄並取得結果標籤 ★★★
          const latestRecord = records.length > 0 ? records[0] : null;

          return (
            <button 
              key={topic.id}
              onClick={() => setSelectedTopic(topic)}
              className="flex flex-col text-left bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-yellow-500 transition-all group"
            >
              <div className="flex justify-between items-start mb-3 w-full">
                <div className="bg-yellow-50 p-2 rounded-lg group-hover:bg-yellow-100 transition-colors">
                  <ClipboardList className="w-6 h-6 text-yellow-600" />
                </div>
                {/* ★★★ 顯示最新分數與結果 ★★★ */}
                {latestRecord ? (
                  <div className="flex flex-col items-end">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${getOSCEResult(latestRecord.total_score).color}`}>
                      最新: {latestRecord.total_score} 分 ({getOSCEResult(latestRecord.total_score).label})
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
              <h4 className="font-bold text-gray-800 text-base mb-1 group-hover:text-yellow-600">{topic.title}</h4>
              <p className="text-xs text-gray-500">{topic.description}</p>
            </button>
          );
        })}
      </div>
    );
  }

  // 2. 評估畫面
  return (
    <div className="h-[calc(100vh-180px)] flex flex-col animate-in slide-in-from-right-4">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => { setSelectedTopic(null); setIsAdding(false); setViewingRecordId(null); }} className="p-2 hover:bg-gray-100 rounded-full">
            <ChevronRight className="w-5 h-5 text-gray-500 rotate-180" />
          </button>
          <h2 className="text-xl font-bold text-gray-800">{selectedTopic.title}</h2>
        </div>
        {isTeacher && !isAdding && (
          <button onClick={() => { setIsAdding(true); setViewingRecordId(null); }} className="flex items-center gap-2 bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 shadow-sm font-bold text-sm">
            <Plus className="w-4 h-4" /> 新增評估
          </button>
        )}
      </div>

      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
        {/* 左側歷史列表 */}
        <div className="col-span-12 md:col-span-4 lg:col-span-3 flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-3 bg-gray-50 border-b font-bold text-gray-700 flex items-center gap-2">
            <History className="w-4 h-4"/> 評估紀錄
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {records.length === 0 ? <div className="text-center py-8 text-gray-400 text-sm">尚無紀錄</div> : 
              records.map(record => (
                <button
                  key={record.record_id}
                  onClick={() => { setViewingRecordId(record.record_id); setIsAdding(false); }}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${viewingRecordId === record.record_id ? 'bg-yellow-50 border-yellow-300 ring-1 ring-yellow-300' : 'bg-white hover:border-gray-300'}`}
                >
                  <div className="flex justify-between font-bold text-gray-800 text-sm">
                    {record.date}
                    <span className="text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded text-xs">{record.total_score} 分</span>
                  </div>
                  <div className="text-xs text-gray-500 flex justify-between items-center mt-1">
                    <span className="flex items-center gap-1"><User className="w-3 h-3"/> {record.teacher_name}</span>
                    {record.status === 'teacher_graded' && <span className="text-orange-500 text-[10px]">待回饋</span>}
                  </div>
                </button>
              ))
            }
          </div>
        </div>

        {/* 右側內容區 */}
        <div className="col-span-12 md:col-span-8 lg:col-span-9 flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="flex-1 overflow-y-auto p-6">
            
            {/* --- 新增模式 (教師) --- */}
            {isAdding && isTeacher ? (
              <div className="space-y-6">
                <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-lg border">
                  <Calendar className="w-5 h-5 text-yellow-600"/>
                  <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="border rounded p-2 text-sm outline-none"/>
                  <div className="ml-auto font-bold text-gray-700">目前總分：<span className="text-2xl text-yellow-600">{totalScore}</span></div>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-yellow-50 text-yellow-800 border-b">
                      <tr>
                        <th className="p-3 w-[60%]">評分項目(觀察重點)</th>
                        <th className="p-3 text-center">優良(5)</th>
                        <th className="p-3 text-center">普通(3)</th>
                        <th className="p-3 text-center">差(1)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {OSCE_ITEMS.map(item => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="p-3 text-gray-800 font-medium">{item.label}</td>
                          {[5, 3, 1].map(val => (
                            <td key={val} className="p-3 text-center">
                              <input 
                                type="radio" name={`osce_${item.id}`} className="w-5 h-5 text-yellow-600 cursor-pointer"
                                checked={formData.scores[item.id] === val}
                                onChange={() => setFormData({...formData, scores: {...formData.scores, [item.id]: val}})}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-4 bg-blue-50 p-5 rounded-lg border border-blue-100">
                  <h3 className="font-bold text-blue-800">綜合意見回饋</h3>
                  <div>
                    <label className="block text-sm font-bold text-blue-700 mb-2">態度表現：</label>
                    <div className="flex flex-wrap gap-2">
                      {OSCE_FEEDBACK_OPTIONS.attitude.map(opt => (
                        <label key={opt} className="flex items-center gap-1.5 text-sm bg-white px-3 py-1.5 rounded border border-blue-200 cursor-pointer hover:bg-blue-100">
                          <input type="checkbox" checked={formData.teacher_feedback.attitude.includes(opt)} onChange={() => handleCheckboxChange('attitude', opt)} className="text-blue-600 rounded"/> {opt}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-blue-700 mb-2">技巧：</label>
                    <div className="flex flex-wrap gap-2">
                      {OSCE_FEEDBACK_OPTIONS.skills.map(opt => (
                        <label key={opt} className="flex items-center gap-1.5 text-sm bg-white px-3 py-1.5 rounded border border-blue-200 cursor-pointer hover:bg-blue-100">
                          <input type="checkbox" checked={formData.teacher_feedback.skills.includes(opt)} onChange={() => handleCheckboxChange('skills', opt)} className="text-blue-600 rounded"/> {opt}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-blue-700 mb-2">其他：</label>
                    <input type="text" value={formData.teacher_feedback.other} onChange={e => setFormData({...formData, teacher_feedback: {...formData.teacher_feedback, other: e.target.value}})} className="w-full p-2 border rounded outline-none text-sm"/>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button onClick={handleSaveAssessment} disabled={isSubmitting} className="bg-yellow-500 text-white px-8 py-3 rounded-lg font-bold hover:bg-yellow-600 flex items-center gap-2">
                    {isSubmitting ? <Loader2 className="animate-spin w-4 h-4"/> : <Save className="w-4 h-4"/>} 儲存評估
                  </button>
                </div>
              </div>

            ) : currentRecord ? (
              // --- 檢視模式 ---
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><Calendar className="w-5 h-5 text-yellow-600"/> {currentRecord.date}</h3>
                    <p className="text-sm text-gray-500 mt-1">評估教師：{currentRecord.teacher_name}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-gray-800 mb-1">{currentRecord.total_score} <span className="text-sm font-normal text-gray-500">/ 75 分</span></div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getOSCEResult(currentRecord.total_score).color}`}>
                      {getOSCEResult(currentRecord.total_score).label}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <h4 className="font-bold text-gray-700 text-sm mb-2">評分明細：</h4>
                  {OSCE_ITEMS.map(item => (
                    <div key={item.id} className="flex justify-between items-center text-sm p-2 hover:bg-gray-50 rounded border-b border-gray-50">
                      <span className="text-gray-600 w-[80%] truncate">{item.label}</span>
                      <span className="font-bold text-gray-800 bg-yellow-50 px-3 py-1 rounded">{currentRecord.scores[item.id] || 0} 分</span>
                    </div>
                  ))}
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 space-y-3">
                  <h4 className="font-bold text-blue-800 text-sm">教師綜合意見：</h4>
                  <div className="text-sm text-blue-900"><span className="font-bold">態度表現：</span>{currentRecord.teacher_feedback.attitude?.join('、 ') || '無'}</div>
                  <div className="text-sm text-blue-900"><span className="font-bold">技巧：</span>{currentRecord.teacher_feedback.skills?.join('、 ') || '無'}</div>
                  {currentRecord.teacher_feedback.other && <div className="text-sm text-blue-900"><span className="font-bold">其他：</span>{currentRecord.teacher_feedback.other}</div>}
                </div>

                {/* 學員雙向回饋 */}
                <div className="pt-6 border-t">
                  <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Send className="w-4 h-4"/> 學員回饋</h4>
                  {currentRecord.status === 'completed' ? (
                    <div className="bg-gray-50 p-4 rounded-lg border text-sm text-gray-700 space-y-2">
                      <p><span className="font-bold text-gray-800">心得：</span>{currentRecord.student_feedback.reflection}</p>
                      <p><span className="font-bold text-gray-800">加強：</span>{currentRecord.student_feedback.improve}</p>
                    </div>
                  ) : !isTeacher ? (
                    <div className="space-y-3 bg-orange-50 p-4 rounded-lg border border-orange-100">
                      <textarea placeholder="心得與感想..." className="w-full p-2 border rounded text-sm outline-none" value={feedbackData.reflection} onChange={e => setFeedbackData({...feedbackData, reflection: e.target.value})}/>
                      <textarea placeholder="自覺可再加強部分..." className="w-full p-2 border rounded text-sm outline-none" value={feedbackData.improve} onChange={e => setFeedbackData({...feedbackData, improve: e.target.value})}/>
                      <button onClick={() => handleSaveFeedback(currentRecord.record_id)} disabled={isSubmitting} className="w-full bg-orange-500 text-white py-2 rounded font-bold text-sm hover:bg-orange-600">{isSubmitting ? '傳送中...' : '送出回饋'}</button>
                    </div>
                  ) : <div className="text-center text-gray-400 text-sm py-4 italic border border-dashed rounded">等待學員回饋中...</div>}
                </div>
              </div>
            ) : <div className="h-full flex items-center justify-center text-gray-400">請選擇一筆紀錄</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OSCEAssessment;
