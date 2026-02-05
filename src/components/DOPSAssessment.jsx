import React, { useState, useEffect } from 'react';
import { DOPS_FORMS } from '../data/dopsForms';
import { 
  Save, CheckCircle, Loader2, Lock, Unlock, ArrowLeft, User, CheckCircle2, 
  FileText, Check, X as XIcon, AlertCircle, Clock, ChevronRight, Mail, Send
} from 'lucide-react';

const DOPSAssessment = ({ studentEmail, studentName, userRole, currentUserEmail, currentUserName, gasApiUrl }) => {
  const [view, setView] = useState('menu'); 
  const [selectedFormId, setSelectedFormId] = useState(null);
  
  const [statusMap, setStatusMap] = useState({});
  const [formData, setFormData] = useState({});
  const [status, setStatus] = useState('draft'); // draft -> teacher_graded -> completed
  const [loading, setLoading] = useState(false);
  const [menuLoading, setMenuLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const isAdmin = userRole === 'admin';     
  const isTeacher = userRole === 'teacher'; 
  const isStudent = userRole === 'student'; 

  // 取得目前選中的表單設定
  const currentFormConfig = DOPS_FORMS.find(f => f.id === selectedFormId);

  // --- 權限控制核心 ---
  // 1. 評分欄位：只有教師在 Draft 狀態下可編輯
  const canEditScores = (isTeacher || isAdmin) && status === 'draft';
  
  // 2. 學生回饋欄位：只有學生在 Teacher Graded 狀態下可編輯
  const canEditStudentFeedback = isStudent && status === 'teacher_graded';

  // 3. 全域唯讀 (用於某些共用欄位或結案後)
  const isGlobalReadOnly = status === 'completed';

  useEffect(() => {
    if (view === 'menu' && studentEmail) {
      loadAllStatuses();
    }
  }, [view, studentEmail]);

  useEffect(() => {
    if (view === 'form' && selectedFormId && studentEmail) {
      loadFormData();
    }
  }, [view, selectedFormId, studentEmail]);

  // 1. 讀取所有狀態 (用於選單)
  const loadAllStatuses = async () => {
    setMenuLoading(true);
    try {
      const promises = DOPS_FORMS.map(form => 
        fetch(`${gasApiUrl}?type=getDOPS&studentEmail=${studentEmail}&dopsId=${form.id}`)
          .then(res => res.json())
          .then(data => ({ id: form.id, status: data.status || 'draft', updatedAt: data.updatedAt }))
          .catch(() => ({ id: form.id, status: 'draft' }))
      );
      const results = await Promise.all(promises);
      const newMap = {};
      results.forEach(r => { newMap[r.id] = { status: r.status, updatedAt: r.updatedAt }; });
      setStatusMap(newMap);
    } catch (error) {
      console.error("讀取列表失敗", error);
    }
    setMenuLoading(false);
  };

  // 2. 讀取單一表單
  const loadFormData = async () => {
    setLoading(true);
    try {
      // 改用 type=getDOPS
      const response = await fetch(`${gasApiUrl}?type=getDOPS&studentEmail=${studentEmail}&dopsId=${selectedFormId}`);
      const data = await response.json();
      
      setFormData(data.formData || {});
      setStatus(data.status || 'draft');
      setLastUpdated(data.updatedAt ? new Date(data.updatedAt) : null);
    } catch (error) {
      console.error("讀取失敗", error);
    }
    setLoading(false);
  };

  // 3. 儲存邏輯
  const handleSave = async (newStatus) => {
    setSaving(true);
    const targetStatus = newStatus || status;
    let finalFormData = { ...formData };

    // 教師送出：自動壓上教師簽名與日期
    if (newStatus === 'teacher_graded') {
      finalFormData.sign_teacher_name = currentUserName;
      finalFormData.sign_teacher_date = new Date().toISOString().split('T')[0];
    }

    // 學生送出：自動壓上學生簽名與日期
    if (newStatus === 'completed') {
      // 檢查是否填寫回饋
      if (!finalFormData.feedback_student_thoughts) {
        alert("請填寫心得與感想後再送出！");
        setSaving(false);
        return;
      }
      finalFormData.sign_student_name = currentUserName;
      finalFormData.sign_student_date = new Date().toISOString().split('T')[0];
    }

    const payload = {
      type: 'saveDOPS', // 對應 GAS 的新邏輯
      dopsId: selectedFormId, 
      studentEmail,
      studentName,
      formData: finalFormData,
      status: targetStatus,
      updatedBy: currentUserEmail,
      teacherSign: finalFormData.sign_teacher_name, // 額外傳送以便 GAS 記錄在欄位
      studentSign: finalFormData.sign_student_name
    };

    try {
      await fetch(gasApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      setStatus(targetStatus);
      setFormData(finalFormData);
      setLastUpdated(new Date());
      
      let msg = '儲存成功！';
      if (newStatus === 'teacher_graded') msg = '評估已完成，系統將通知學生填寫回饋。';
      if (newStatus === 'completed') msg = '回饋已送出，本表單已結案。';
      alert(msg);
      
      if (newStatus) {
        setStatusMap(prev => ({ ...prev, [selectedFormId]: { status: targetStatus, updatedAt: new Date() } }));
        setView('menu');
      }
    } catch (error) {
      alert("儲存失敗，請檢查網路");
    }
    setSaving(false);
  };

  const handleChange = (fieldId, value) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  // --- 欄位渲染 ---
  const renderField = (field, sectionId) => {
    const value = formData[field.id];
    
    // 判斷該欄位是否可編輯
    let editable = false;
    
    // 1. 回饋欄位特殊處理
    if (field.id.startsWith('feedback_student')) {
      // 學生回饋：只有學生在 teacher_graded 階段可寫
      editable = canEditStudentFeedback;
    } else if (field.id.startsWith('feedback_teacher')) {
      // 教師回饋：只有教師在 draft 階段可寫
      editable = canEditScores;
    } else {
      // 其他評分欄位：只有教師在 draft 階段可寫
      editable = canEditScores;
    }

    const disabled = !editable;

    if (field.type === 'score_5') {
      return (
        <div className="flex flex-wrap gap-2 mt-2">
          {['5 (優異)', '4 (良好)', '3 (一般)', '2 (加強)', '1 (不通過)', 'N/A'].map((opt, idx) => {
            const val = opt.split(' ')[0];
            return (
              <label key={idx} className={`flex items-center gap-1 px-3 py-2 border rounded-lg cursor-pointer transition-colors text-sm ${value === val ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
                <input type="radio" name={field.id} value={val} checked={value === val} onChange={() => handleChange(field.id, val)} disabled={disabled} className="hidden" />
                {opt}
              </label>
            )
          })}
        </div>
      );
    }
    if (field.type === 'score_10') {
      return (
        <div className="flex flex-wrap gap-1 mt-2">
          {[1,2,3,4,5,6,7,8,9,10].map(num => (
            <label key={num} className={`w-8 h-8 flex items-center justify-center rounded-full border cursor-pointer font-bold text-sm transition-colors ${value == num ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
              <input type="radio" name={field.id} value={num} checked={value == num} onChange={() => handleChange(field.id, num)} disabled={disabled} className="hidden" />
              {num}
            </label>
          ))}
        </div>
      );
    }
    if (field.type === 'yes_no') {
      return (
        <div className="flex gap-4 mt-1">
          {['符合', '不符合'].map(opt => (
            <label key={opt} className={`flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer transition-colors text-sm font-medium ${value === opt ? (opt === '符合' ? 'bg-green-100 text-green-800 border-green-300' : 'bg-red-100 text-red-800 border-red-300') : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
              <input type="radio" name={field.id} value={opt} checked={value === opt} onChange={() => handleChange(field.id, opt)} disabled={disabled} className="hidden" />
              {opt === '符合' ? <Check className="w-4 h-4"/> : <XIcon className="w-4 h-4"/>}
              {opt}
            </label>
          ))}
        </div>
      );
    }
    if (field.type === 'textarea') {
      return (
        <textarea className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-gray-100 min-h-[80px]" value={value || ''} onChange={e => handleChange(field.id, e.target.value)} disabled={disabled} placeholder={editable ? "請輸入內容..." : "(未填寫)"} />
      );
    }
    return null;
  };

  // --- 狀態標籤 ---
  const StatusBadge = ({ status }) => {
    switch (status) {
      case 'completed': return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3"/> 已結案</span>;
      case 'teacher_graded': return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold flex items-center gap-1"><User className="w-3 h-3"/> 待學生回饋</span>;
      default: return <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs font-bold">未開始</span>;
    }
  };

  if (view === 'menu') {
    return (
      <div className="animate-in fade-in">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-gray-700 flex items-center gap-2"><CheckCircle2 className="w-6 h-6 text-indigo-600" /> DOPS 評估項目</h3>
          <div className="text-xs text-gray-500">共 {DOPS_FORMS.length} 項</div>
        </div>
        
        {menuLoading ? (
          <div className="py-12 text-center text-gray-400"><Loader2 className="w-8 h-8 animate-spin mx-auto mb-2"/>讀取進度中...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {DOPS_FORMS.map(form => {
              const currentStatus = statusMap[form.id]?.status || 'draft';
              const lastUpdate = statusMap[form.id]?.updatedAt;
              return (
                <button key={form.id} onClick={() => { setSelectedFormId(form.id); setView('form'); }} className="flex flex-col text-left bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-indigo-400 transition-all group relative overflow-hidden">
                  <div className="flex justify-between items-start mb-3">
                    <div className="bg-indigo-50 p-2 rounded-lg group-hover:bg-indigo-100 transition-colors"><FileText className="w-6 h-6 text-indigo-600" /></div>
                    <StatusBadge status={currentStatus} />
                  </div>
                  <h4 className="font-bold text-gray-800 text-base mb-1 group-hover:text-indigo-600 transition-colors">{form.title}</h4>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-4 h-8">{form.description}</p>
                  <div className="mt-auto pt-3 border-t border-gray-50 flex justify-between items-center w-full">
                    <span className="text-[10px] text-gray-400">{lastUpdate ? `更新: ${new Date(lastUpdate).toLocaleDateString()}` : '尚未開始'}</span>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (loading) return <div className="p-8 text-center text-gray-500 flex justify-center"><Loader2 className="animate-spin mr-2"/> 載入表單中...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in slide-in-from-right-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setView('menu')} className="flex items-center gap-1 text-gray-500 hover:text-indigo-600 font-bold text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm">
          <ArrowLeft className="w-4 h-4" /> 返回列表
        </button>
        <span className="text-gray-300">|</span>
        <span className="text-gray-700 font-medium">{studentName} - {currentFormConfig?.title}</span>
      </div>

      {/* Status Bar */}
      <div className={`p-4 rounded-lg flex justify-between items-center ${status === 'completed' ? 'bg-green-50 border-green-200 text-green-800' : status === 'teacher_graded' ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
        <div className="flex items-center gap-2">
           {status === 'completed' ? <Lock className="w-5 h-5"/> : <Unlock className="w-5 h-5"/>}
           <span className="font-bold">
             狀態：{status === 'draft' ? '教師評估中' : status === 'teacher_graded' ? '等待學生回饋' : '已結案'}
           </span>
        </div>
        {lastUpdated && <span className="text-xs opacity-70">更新：{lastUpdated.toLocaleDateString()}</span>}
      </div>

      {/* Form Content */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="bg-indigo-600 px-6 py-4">
          <h2 className="text-xl font-bold text-white">{currentFormConfig?.title}</h2>
          <p className="text-indigo-100 text-sm mt-1">版本：{currentFormConfig?.version}</p>
        </div>

        <div className="p-6 md:p-8 space-y-10">
          {currentFormConfig?.sections.map(section => (
            <div key={section.id} className="border-b border-gray-100 pb-8 last:border-0 last:pb-0">
              <h3 className="text-lg font-bold text-gray-800 mb-4 bg-gray-50 p-2 rounded border-l-4 border-indigo-500">{section.title}</h3>
              <div className="space-y-6">
                {section.fields.map(field => (
                  <div key={field.id}>
                    <label className="block text-sm font-bold text-gray-700 mb-1">{field.label}</label>
                    {renderField(field, section.id)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
          
          {/* 1. 教師操作區 */}
          {status === 'draft' && (isTeacher || isAdmin) && (
            <div className="flex justify-end gap-3">
              <button onClick={() => handleSave('draft')} disabled={saving} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg">暫存草稿</button>
              <button onClick={() => { if(window.confirm('確認評分完成？將通知學生填寫回饋。')) handleSave('teacher_graded'); }} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2"><Send className="w-4 h-4"/> 送出給學生</button>
            </div>
          )}

          {/* 2. 學生操作區 */}
          {status === 'teacher_graded' && isStudent && (
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-2 bg-blue-50 p-3 rounded text-blue-800 text-sm">
                <AlertCircle className="w-5 h-5 mt-0.5"/>
                <div>
                  <p className="font-bold">請填寫您的心得與感想</p>
                  <p>教師已完成評分，請針對本次評估填寫回饋後結案。</p>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => handleSave('teacher_graded')} disabled={saving} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg">暫存回饋</button>
                <button onClick={() => { if(window.confirm('確認回饋內容無誤？送出後將結案。')) handleSave('completed'); }} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2"><CheckCircle className="w-4 h-4"/> 完成並結案</button>
              </div>
            </div>
          )}

          {/* 3. 結案狀態 */}
          {status === 'completed' && (
            <div className="flex justify-between items-center text-sm text-gray-500">
              <div className="flex gap-4">
                <span>教師簽核：{formData.sign_teacher_name} ({formData.sign_teacher_date})</span>
                <span>學生簽核：{formData.sign_student_name} ({formData.sign_student_date})</span>
              </div>
              <span className="text-green-600 font-bold flex items-center gap-1"><Lock className="w-4 h-4"/> 本表單已結案</span>
            </div>
          )}

          {/* 4. 等待中狀態提示 */}
          {status === 'teacher_graded' && (isTeacher || isAdmin) && (
            <div className="text-center text-blue-600 font-bold flex items-center justify-center gap-2">
              <Clock className="w-5 h-5"/> 已送出，等待學生填寫回饋中...
            </div>
          )}
          {status === 'draft' && isStudent && (
            <div className="text-center text-gray-400 font-bold flex items-center justify-center gap-2">
              <Clock className="w-5 h-5"/> 等待教師評估中...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DOPSAssessment;
