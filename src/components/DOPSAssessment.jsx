import React, { useState, useEffect } from 'react';
import { DOPS_FORMS } from '../data/dopsForms';
import { 
  Save, CheckCircle, Loader2, Lock, Unlock, ArrowLeft, User, CheckCircle2, 
  FileText, Check, X as XIcon, AlertCircle, Clock, ChevronRight
} from 'lucide-react';

const DOPSAssessment = ({ studentEmail, studentName, userRole, currentUserEmail, currentUserName, gasApiUrl }) => {
  const [view, setView] = useState('menu'); // menu, form
  const [selectedFormId, setSelectedFormId] = useState(null);
  
  // 儲存所有 DOPS 表單的狀態對照表 { 'dops_op_dispensing': 'approved', ... }
  const [statusMap, setStatusMap] = useState({});
  
  // 單一表單的資料
  const [formData, setFormData] = useState({});
  const [status, setStatus] = useState('draft'); 
  const [loading, setLoading] = useState(false);
  const [menuLoading, setMenuLoading] = useState(false); // 選單讀取狀態
  const [saving, setSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [signOffData, setSignOffData] = useState({
    teacherName: '', teacherDate: '', adminName: '', adminDate: ''
  });

  const isAdmin = userRole === 'admin';     
  const isTeacher = userRole === 'teacher'; 
  const isStudent = userRole === 'student'; 

  // 取得目前選中的表單設定
  const currentFormConfig = DOPS_FORMS.find(f => f.id === selectedFormId);

  const isGlobalReadOnly = 
    status === 'approved' || 
    (status === 'assessed' && !isAdmin) ||
    (status === 'submitted' && isStudent);

  // ★★★ 初始化：讀取所有 DOPS 狀態 (用於卡片顯示) ★★★
  useEffect(() => {
    if (view === 'menu' && studentEmail) {
      loadAllStatuses();
    }
  }, [view, studentEmail]);

  // ★★★ 讀取單一表單詳細資料 ★★★
  useEffect(() => {
    if (view === 'form' && selectedFormId && studentEmail) {
      loadFormData();
    }
  }, [view, selectedFormId, studentEmail]);

  // 自動帶入簽核姓名
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (isTeacher && status === 'submitted' && !signOffData.teacherName) {
      setSignOffData(prev => ({ ...prev, teacherName: currentUserName || '指導藥師', teacherDate: today }));
    }
    if (isAdmin && status === 'assessed' && !signOffData.adminName) {
      setSignOffData(prev => ({ ...prev, adminName: currentUserName || '教學負責人', adminDate: today }));
    }
  }, [userRole, isTeacher, isAdmin, status, currentUserName]);

  // 1. 讀取該學生所有 DOPS 的狀態 (用於選單卡片)
  const loadAllStatuses = async () => {
    setMenuLoading(true);
    try {
      // 這裡呼叫一個新參數 mode=summary 來取得摘要，或直接讀取全部並在前端過濾
      // 為求簡單，我們假設後端 getAssessment 若沒傳 formType 會回傳該學生所有紀錄 (或者我們依序讀取)
      // 最佳解：修改 GAS 增加 getDopsSummary，但為了不改 GAS，我們這裡用前端 fetch 所有已知的 ID
      // *註：若 GAS 端未實作 summary，建議依賴前端個別讀取或更新 GAS。
      // 為了相容您現有的 GAS，我們假設 GAS 會回傳空或錯誤若找不到。
      // **更穩定的做法**：我們用 Promise.all 平行讀取所有表單狀態 (雖然請求數多但邏輯最簡單)
      
      const promises = DOPS_FORMS.map(form => 
        fetch(`${gasApiUrl}?type=getAssessment&studentEmail=${studentEmail}&formType=${form.id}`)
          .then(res => res.json())
          .then(data => ({ id: form.id, status: data.status || 'draft', updatedAt: data.updatedAt }))
          .catch(() => ({ id: form.id, status: 'draft' }))
      );

      const results = await Promise.all(promises);
      const newMap = {};
      results.forEach(r => {
        newMap[r.id] = { status: r.status, updatedAt: r.updatedAt };
      });
      setStatusMap(newMap);

    } catch (error) {
      console.error("讀取狀態列表失敗", error);
    }
    setMenuLoading(false);
  };

  // 2. 讀取單一表單
  const loadFormData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${gasApiUrl}?type=getAssessment&studentEmail=${studentEmail}&formType=${selectedFormId}`);
      const data = await response.json();
      
      const loadedFormData = data.formData || {};
      setFormData(loadedFormData);
      setStatus(data.status || 'draft');
      setLastUpdated(data.updatedAt ? new Date(data.updatedAt) : null);

      setSignOffData({
        teacherName: loadedFormData.sign_teacher_name || '',
        teacherDate: loadedFormData.sign_teacher_date || '',
        adminName: loadedFormData.sign_admin_name || '',
        adminDate: loadedFormData.sign_admin_date || ''
      });
    } catch (error) {
      console.error("讀取失敗", error);
    }
    setLoading(false);
  };

  const handleSave = async (newStatus) => {
    setSaving(true);
    const targetStatus = newStatus || status;
    const today = new Date().toISOString().split('T')[0];
    let finalFormData = { ...formData };

    if (newStatus === 'submitted') finalFormData.sign_student_date = today;

    if (newStatus === 'assessed') {
      if (!signOffData.teacherDate) { alert("請選擇評估日期"); setSaving(false); return; }
      finalFormData.sign_teacher_name = currentUserName;
      finalFormData.sign_teacher_date = signOffData.teacherDate;
    }

    if (newStatus === 'approved') {
      if (!signOffData.adminDate) { alert("請選擇審核日期"); setSaving(false); return; }
      finalFormData.sign_admin_name = currentUserName;
      finalFormData.sign_admin_date = signOffData.adminDate;
    }

    const payload = {
      type: 'saveAssessment',
      formType: selectedFormId, 
      studentEmail,
      studentName,
      formData: finalFormData,
      status: targetStatus,
      updatedBy: currentUserEmail
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
      if (newStatus === 'submitted') msg = '已送出，等待教師評估。';
      if (newStatus === 'assessed') msg = '評估完成，等待負責人審核。';
      if (newStatus === 'approved') msg = '已完成審核結案！';
      alert(msg);
      
      if (['submitted', 'assessed', 'approved'].includes(newStatus)) {
        // 更新狀態 Map 避免回到首頁沒更新
        setStatusMap(prev => ({
            ...prev,
            [selectedFormId]: { status: targetStatus, updatedAt: new Date() }
        }));
        setView('menu');
      }

    } catch (error) {
      alert("儲存失敗，請檢查網路");
    }
    setSaving(false);
  };

  const handleChange = (fieldId, value) => {
    if (isGlobalReadOnly) return;
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  // --- 欄位渲染邏輯 (維持不變) ---
  const renderField = (field) => {
    const value = formData[field.id];
    const disabled = isGlobalReadOnly;

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
        <textarea className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-gray-100 min-h-[80px]" value={value || ''} onChange={e => handleChange(field.id, e.target.value)} disabled={disabled} placeholder="請輸入內容..." />
      );
    }
    return null;
  };

  // --- 輔助：狀態標籤元件 ---
  const StatusBadge = ({ status }) => {
    switch (status) {
      case 'approved':
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold flex items-center gap-1"><Lock className="w-3 h-3"/> 已結案</span>;
      case 'assessed':
        return <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-bold flex items-center gap-1"><Clock className="w-3 h-3"/> 待審核</span>;
      case 'submitted':
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold flex items-center gap-1"><User className="w-3 h-3"/> 待評估</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs font-bold">未完成</span>;
    }
  };

  // -------------------------------------------------------------------------
  // 畫面 1: 多卡片儀表板 (EPA 風格)
  // -------------------------------------------------------------------------
  if (view === 'menu') {
    return (
      <div className="animate-in fade-in">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-gray-700 flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-indigo-600" />
            DOPS 評估項目
          </h3>
          <div className="text-xs text-gray-500">
            共 {DOPS_FORMS.length} 項評估
          </div>
        </div>
        
        {menuLoading ? (
          <div className="py-12 text-center text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2"/>
            讀取進度中...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {DOPS_FORMS.map(form => {
              const currentStatus = statusMap[form.id]?.status || 'draft';
              const lastUpdate = statusMap[form.id]?.updatedAt;
              
              return (
                <button 
                  key={form.id}
                  onClick={() => { setSelectedFormId(form.id); setView('form'); }}
                  className="flex flex-col text-left bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-indigo-400 transition-all group relative overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="bg-indigo-50 p-2 rounded-lg group-hover:bg-indigo-100 transition-colors">
                      <FileText className="w-6 h-6 text-indigo-600" />
                    </div>
                    <StatusBadge status={currentStatus} />
                  </div>
                  
                  <h4 className="font-bold text-gray-800 text-base mb-1 group-hover:text-indigo-600 transition-colors">
                    {form.title}
                  </h4>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-4 h-8">
                    {form.description}
                  </p>
                  
                  <div className="mt-auto pt-3 border-t border-gray-50 flex justify-between items-center w-full">
                    <span className="text-[10px] text-gray-400">
                      {lastUpdate ? `更新: ${new Date(lastUpdate).toLocaleDateString()}` : '尚未開始'}
                    </span>
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

  // -------------------------------------------------------------------------
  // 畫面 2: 表單內容
  // -------------------------------------------------------------------------
  if (loading) return <div className="p-8 text-center text-gray-500 flex justify-center"><Loader2 className="animate-spin mr-2"/> 載入表單中...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in slide-in-from-right-4">
      {/* 導航 */}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setView('menu')} className="flex items-center gap-1 text-gray-500 hover:text-indigo-600 font-bold text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm">
          <ArrowLeft className="w-4 h-4" /> 返回 DOPS 列表
        </button>
        <span className="text-gray-300">|</span>
        <span className="text-gray-700 font-medium">{studentName} - {currentFormConfig?.title}</span>
      </div>

      {/* 狀態列 */}
      <div className={`p-4 rounded-lg flex justify-between items-center ${
        status === 'approved' ? 'bg-green-50 border border-green-200 text-green-800' :
        status === 'assessed' ? 'bg-purple-50 border border-purple-200 text-purple-800' :
        status === 'submitted' ? 'bg-blue-50 border border-blue-200 text-blue-800' :
        'bg-gray-50 border border-gray-200 text-gray-700'
      }`}>
        <div className="flex items-center gap-2">
           {status === 'approved' ? <Lock className="w-5 h-5"/> : <Unlock className="w-5 h-5"/>}
           <span className="font-bold">
             狀態：{status === 'draft' ? '草稿' : status === 'submitted' ? '已提交 (待評估)' : status === 'assessed' ? '已評估 (待審核)' : '已結案'}
           </span>
        </div>
        {lastUpdated && <span className="text-xs opacity-70">更新：{lastUpdated.toLocaleDateString()}</span>}
      </div>

      {/* 表單內容 */}
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
                    <label className="block text-sm font-bold text-gray-700">{field.label}</label>
                    {renderField(field)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 簽核區塊 */}
        <div className="bg-gray-50 border-t border-gray-200">
          {status === 'submitted' && (isTeacher || isAdmin) && (
            <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
              <h4 className="font-bold text-blue-800 mb-3 flex items-center gap-2"><User className="w-4 h-4"/> 教師評估簽核</h4>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs font-bold text-blue-600 block mb-1">評估教師</label>
                  <input type="text" value={signOffData.teacherName} disabled className="w-full px-3 py-2 border rounded bg-gray-100 cursor-not-allowed"/>
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold text-blue-600 block mb-1">評估日期</label>
                  <input type="date" value={signOffData.teacherDate} onChange={e => setSignOffData({...signOffData, teacherDate: e.target.value})} className="w-full px-3 py-2 border rounded"/>
                </div>
              </div>
            </div>
          )}
          {status === 'assessed' && isAdmin && (
            <div className="px-6 py-4 bg-purple-50 border-b border-purple-100">
              <h4 className="font-bold text-purple-800 mb-3 flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> 負責人審核簽核</h4>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs font-bold text-purple-600 block mb-1">審核負責人</label>
                  <input type="text" value={signOffData.adminName} disabled className="w-full px-3 py-2 border rounded bg-gray-100 cursor-not-allowed"/>
                </div>
                <div className="flex-1">
                  <label className="text-xs font-bold text-purple-600 block mb-1">審核日期</label>
                  <input type="date" value={signOffData.adminDate} onChange={e => setSignOffData({...signOffData, adminDate: e.target.value})} className="w-full px-3 py-2 border rounded"/>
                </div>
              </div>
            </div>
          )}

          {/* 按鈕區 */}
          <div className="px-6 py-4 flex justify-end gap-3">
            {!isGlobalReadOnly && (
              <button onClick={() => handleSave(status)} disabled={saving} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium flex items-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} 儲存進度
              </button>
            )}
            {status === 'draft' && isStudent && (
              <button onClick={() => { if(window.confirm('確認送出？')) handleSave('submitted'); }} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex gap-2"><CheckCircle className="w-4 h-4"/> 提交評估</button>
            )}
            {status === 'submitted' && (isTeacher || isAdmin) && (
              <button onClick={() => { if(window.confirm('確認評估完成？')) handleSave('assessed'); }} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex gap-2"><CheckCircle className="w-4 h-4"/> 完成評估</button>
            )}
            {status === 'assessed' && isAdmin && (
              <div className="flex gap-2">
                <button onClick={() => handleSave('submitted')} className="px-4 py-2 bg-red-100 text-red-700 rounded-lg">退回</button>
                <button onClick={() => { if(window.confirm('確認核准？')) handleSave('approved'); }} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex gap-2"><CheckCircle className="w-4 h-4"/> 核准結案</button>
              </div>
            )}
            {status === 'approved' && (
              <span className="text-green-600 font-bold flex items-center gap-2"><Lock className="w-4 h-4"/> 已結案</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DOPSAssessment;
