import React, { useState, useEffect } from 'react';
import { DOPS_FORMS } from '../data/dopsForms';
import { 
  Save, CheckCircle, Loader2, Lock, Unlock, ArrowLeft, User, CheckCircle2, 
  FileText, Check, X as XIcon, AlertCircle, Clock, ChevronRight, Plus, Calendar,
  Star, AlertTriangle, RotateCcw
} from 'lucide-react';

const DOPSAssessment = ({ studentEmail, studentName, userRole, currentUserEmail, currentUserName, gasApiUrl }) => {
  const [view, setView] = useState('menu'); 
  const [selectedFormId, setSelectedFormId] = useState(null);
  
  const [recordsList, setRecordsList] = useState([]); 
  const [currentInstanceId, setCurrentInstanceId] = useState(null); 

  const [formData, setFormData] = useState({});
  const [evaluationDate, setEvaluationDate] = useState(''); 
  const [status, setStatus] = useState('draft'); 
  
  const [menuLoading, setMenuLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [dashboardSummary, setDashboardSummary] = useState({});

  const [signOffData, setSignOffData] = useState({
    teacherName: '', teacherDate: '', adminName: '', adminDate: ''
  });

  const isAdmin = userRole === 'admin';     
  const isTeacher = userRole === 'teacher'; 
  const isStudent = userRole === 'student'; 

  const currentFormConfig = DOPS_FORMS.find(f => f.id === selectedFormId);

  const canEditScores = (isTeacher || isAdmin) && status === 'draft';
  const canEditStudentFeedback = isStudent && status === 'teacher_graded';
  
  const isGlobalReadOnly = status === 'completed' || status === 'needs_improvement';

  useEffect(() => {
    if (view === 'menu' && studentEmail) {
      loadDashboardSummary();
    }
  }, [view, studentEmail]);

  useEffect(() => {
    if (view === 'form' && selectedFormId && studentEmail) {
      loadRecordsList();
    }
  }, [view, selectedFormId, studentEmail]);

  useEffect(() => {
    if (currentInstanceId && recordsList.length > 0) {
      const record = recordsList.find(r => r.instanceId === currentInstanceId);
      if (record) {
        setFormData(record.formData || {});
        setStatus(record.status || 'draft');
        setEvaluationDate(record.formData.evaluation_date || record.timestamp.split('T')[0]);
        
        setSignOffData({
          teacherName: record.formData.sign_teacher_name || '',
          teacherDate: record.formData.sign_teacher_date || '',
          adminName: record.formData.sign_admin_name || '',
          adminDate: record.formData.sign_admin_date || ''
        });
      }
    }
  }, [currentInstanceId, recordsList]);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (isTeacher && status === 'submitted' && !signOffData.teacherName) {
      setSignOffData(prev => ({ ...prev, teacherName: currentUserName || '指導藥師', teacherDate: today }));
    }
    if (isAdmin && status === 'assessed' && !signOffData.adminName) {
      setSignOffData(prev => ({ ...prev, adminName: currentUserName || '教學負責人', adminDate: today }));
    }
  }, [userRole, isTeacher, isAdmin, status, currentUserName]);

  const loadDashboardSummary = async () => {
    setMenuLoading(true);
    try {
      const promises = DOPS_FORMS.map(form => 
        fetch(`${gasApiUrl}?type=getDOPSList&studentEmail=${studentEmail}&dopsId=${form.id}`)
          .then(res => res.json())
          .then(data => {
            const list = data.records || [];
            if (list.length > 0) {
              const latest = list[0];
              return { 
                id: form.id, 
                status: latest.status, 
                updatedAt: latest.timestamp,
                score: latest.formData?.global_rating 
              };
            }
            return { id: form.id, status: 'draft', score: null };
          })
          .catch(() => ({ id: form.id, status: 'draft' }))
      );

      const results = await Promise.all(promises);
      const newMap = {};
      results.forEach(r => { newMap[r.id] = r; });
      setDashboardSummary(newMap);
    } catch (error) {
      console.error("讀取摘要失敗", error);
    }
    setMenuLoading(false);
  };

  const loadRecordsList = async () => {
    setListLoading(true);
    try {
      const response = await fetch(`${gasApiUrl}?type=getDOPSList&studentEmail=${studentEmail}&dopsId=${selectedFormId}`);
      const data = await response.json();
      const list = data.records || [];
      
      setRecordsList(list);

      if (list.length > 0) {
        if (!currentInstanceId || !list.find(r => r.instanceId === currentInstanceId)) {
          setCurrentInstanceId(list[0].instanceId);
        }
      } else {
        handleCreateNew();
      }
    } catch (error) {
      console.error("讀取列表失敗", error);
    }
    setListLoading(false);
  };

  const handleCreateNew = () => {
    const newId = 'NEW_' + new Date().getTime();
    const today = new Date().toISOString().split('T')[0];
    
    const newRecord = {
      instanceId: newId,
      status: 'draft',
      timestamp: new Date().toISOString(),
      formData: { evaluation_date: today },
      teacherSign: '',
      studentSign: ''
    };

    setRecordsList(prev => [newRecord, ...prev]);
    setCurrentInstanceId(newId);
    setEvaluationDate(today);
    setFormData({ evaluation_date: today });
    setStatus('draft');
    setSignOffData({ teacherName: '', teacherDate: '', adminName: '', adminDate: '' });
  };

  const handleSave = async (newStatus) => {
    setSaving(true);
    let targetStatus = newStatus || status;
    const today = new Date().toISOString().split('T')[0];
    
    let finalFormData = { 
      ...formData, 
      evaluation_date: evaluationDate 
    };

    if (newStatus === 'teacher_graded') {
      if (!finalFormData.global_rating) {
        alert("請填寫整體評估分數！");
        setSaving(false); return;
      }
      finalFormData.sign_teacher_name = currentUserName;
      finalFormData.sign_teacher_date = today;
    }

    if (newStatus === 'completed') {
      if (!finalFormData.feedback_student_thoughts) {
        alert("請填寫心得與感想後再送出！");
        setSaving(false); return;
      }
      finalFormData.sign_student_name = currentUserName;
      finalFormData.sign_student_date = today;

      // 判斷分數決定狀態
      const score = parseInt(finalFormData.global_rating || 0, 10);
      if (score < 8) {
        targetStatus = 'needs_improvement';
      } else {
        targetStatus = 'completed';
      }
    }

    const payload = {
      type: 'saveDOPS',
      dopsId: selectedFormId,
      instanceId: currentInstanceId.startsWith('NEW_') ? null : currentInstanceId, 
      studentEmail,
      studentName,
      formData: finalFormData,
      status: targetStatus,
      updatedBy: currentUserEmail,
      teacherSign: finalFormData.sign_teacher_name,
      studentSign: finalFormData.sign_student_name
    };

    try {
      await fetch(gasApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      
      // ★★★ 修改：移除這裡的 Alert，只顯示非判定類的成功訊息 ★★★
      if (newStatus !== 'completed') {
        alert("儲存成功！");
      }

      await loadRecordsList(); 

    } catch (error) {
      alert("儲存失敗，請檢查網路");
    }
    setSaving(false);
  };

  const handleChange = (fieldId, value) => {
    if (isGlobalReadOnly) return;
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const renderField = (field) => {
    const value = formData[field.id];
    let editable = false;
    
    if (field.id.startsWith('feedback_student')) editable = canEditStudentFeedback;
    else if (field.id.startsWith('feedback_teacher')) editable = canEditScores;
    else editable = canEditScores;

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

  const StatusBadge = ({ status }) => {
    switch (status) {
      case 'completed': return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3"/> 已結案</span>;
      case 'needs_improvement': return <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3"/> 待加強</span>;
      case 'teacher_graded': return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold flex items-center gap-1"><User className="w-3 h-3"/> 待學生回饋</span>;
      default: return <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs font-bold">未開始</span>;
    }
  };

  // ★★★ 修改：渲染結果區塊元件 ★★★
  const RenderResultBlock = () => {
    const score = parseInt(formData.global_rating || 0, 10);
    
    // 依據分數回傳不同的樣式與文字
    if (score >= 8) {
      return (
        <div className="flex justify-between items-center p-4 rounded-lg border bg-green-50 border-green-200 text-green-800">
          <div className="flex items-center gap-2 text-sm font-bold">
            <CheckCircle className="w-6 h-6"/> 已完成此項考核
          </div>
        </div>
      );
    }
    
    if (score === 7) {
      return (
        <div className="flex flex-col sm:flex-row justify-between items-center p-4 rounded-lg border bg-orange-50 border-orange-200 text-orange-800 gap-3">
          <div className="flex items-center gap-2 text-sm font-bold">
            <AlertTriangle className="w-6 h-6"/> 針對不足之項目進行加強訓練→1週後重測
          </div>
          {(isTeacher || isAdmin) && (
            <button onClick={handleCreateNew} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-bold text-sm flex items-center gap-2 whitespace-nowrap">
              <RotateCcw className="w-4 h-4"/> 建立新評估
            </button>
          )}
        </div>
      );
    }

    // 0-6 分
    return (
      <div className="flex flex-col sm:flex-row justify-between items-center p-4 rounded-lg border bg-red-50 border-red-200 text-red-800 gap-3">
        <div className="flex items-center gap-2 text-sm font-bold">
          <AlertTriangle className="w-6 h-6"/> 整體作業流程需重新訓練→1個月後重測
        </div>
        {(isTeacher || isAdmin) && (
          <button onClick={handleCreateNew} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold text-sm flex items-center gap-2 whitespace-nowrap">
            <RotateCcw className="w-4 h-4"/> 建立新評估
          </button>
        )}
      </div>
    );
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
              const summary = dashboardSummary[form.id] || { status: 'draft', score: null, updatedAt: null };
              return (
                <button key={form.id} onClick={() => { setSelectedFormId(form.id); setView('form'); }} className="flex flex-col text-left bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-indigo-400 transition-all group relative overflow-hidden">
                  <div className="flex justify-between items-start mb-3">
                    <div className="bg-indigo-50 p-2 rounded-lg group-hover:bg-indigo-100 transition-colors"><FileText className="w-6 h-6 text-indigo-600" /></div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge status={summary.status} />
                      {summary.score && <span className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded border ${parseInt(summary.score)>=8 ? 'text-green-600 bg-green-50 border-green-100' : 'text-red-600 bg-red-50 border-red-100'}`}><Star className="w-3 h-3 fill-current" /> {summary.score} 分</span>}
                    </div>
                  </div>
                  <h4 className="font-bold text-gray-800 text-base mb-1 group-hover:text-indigo-600 transition-colors">{form.title}</h4>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-4 h-8">{form.description}</p>
                  <div className="mt-auto pt-3 border-t border-gray-50 flex justify-between items-center w-full">
                    <span className="text-[10px] text-gray-400">{summary.updatedAt ? `更新: ${new Date(summary.updatedAt).toLocaleDateString()}` : '尚未開始'}</span>
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
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-in slide-in-from-right-4">
      {/* 導航 */}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setView('menu')} className="flex items-center gap-1 text-gray-500 hover:text-indigo-600 font-bold text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm">
          <ArrowLeft className="w-4 h-4" /> 返回列表
        </button>
        <span className="text-gray-300">|</span>
        <span className="text-gray-700 font-medium">{studentName} - {currentFormConfig?.title}</span>
      </div>

      <div className="grid grid-cols-12 gap-6 items-start">
        {/* 左側：評估紀錄列表 */}
        <div className="col-span-12 md:col-span-3 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm sticky top-4">
          <div className="p-3 bg-gray-50 border-b border-gray-200 font-bold text-gray-700 flex justify-between items-center">
            評估紀錄
            {(isTeacher || isAdmin) && (
              <button onClick={handleCreateNew} className="p-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors" title="新增評估">
                <Plus className="w-4 h-4"/>
              </button>
            )}
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            {listLoading ? <div className="p-4 text-center text-gray-400"><Loader2 className="w-5 h-5 animate-spin mx-auto"/></div> : (
              recordsList.length === 0 ? <div className="p-4 text-center text-sm text-gray-400">尚無紀錄</div> : (
                recordsList.map(rec => (
                  <button key={rec.instanceId} onClick={() => setCurrentInstanceId(rec.instanceId)} className={`w-full text-left p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${currentInstanceId === rec.instanceId ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : ''}`}>
                    <div className="flex justify-between items-center">
                      <div className="font-bold text-sm text-gray-800">{rec.formData.evaluation_date || rec.timestamp.split('T')[0]}</div>
                      {rec.formData?.global_rating && <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${parseInt(rec.formData.global_rating)>=8 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>{rec.formData.global_rating}分</span>}
                    </div>
                    <div className="flex justify-between items-center mt-1"><StatusBadge status={rec.status} /></div>
                  </button>
                ))
              )
            )}
          </div>
        </div>

        {/* 右側：表單內容 */}
        <div className="col-span-12 md:col-span-9 space-y-6">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="flex items-center gap-2 text-indigo-700 font-bold"><Calendar className="w-5 h-5" /> 評估日期</div>
            <input type="date" value={evaluationDate} onChange={e => { if (canEditScores) { setEvaluationDate(e.target.value); setFormData(prev => ({...prev, evaluation_date: e.target.value})); }}} disabled={!canEditScores} className="border border-gray-300 rounded px-3 py-1 text-sm outline-none focus:border-indigo-500 disabled:bg-gray-100"/>
            {currentInstanceId?.startsWith('NEW_') && <span className="text-xs text-orange-500 font-bold ml-auto">* 新增中</span>}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className={`px-6 py-4 flex justify-between items-center ${status==='needs_improvement'?'bg-red-600':status==='completed'?'bg-green-600':'bg-indigo-600'}`}>
              <h2 className="text-xl font-bold text-white">{currentFormConfig?.title}</h2>
              <div className="text-white/90 text-sm flex items-center gap-2">
                {status==='needs_improvement' && <><AlertTriangle className="w-4 h-4"/> 待加強</>}
                {status==='completed' && <><CheckCircle className="w-4 h-4"/> 已結案</>}
                <span className="opacity-70">|</span> 
                v{currentFormConfig?.version}
              </div>
            </div>

            <div className="p-6 md:p-8 space-y-10">
              {currentFormConfig?.sections.map(section => (
                <div key={section.id} className="border-b border-gray-100 pb-8 last:border-0 last:pb-0">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 bg-gray-50 p-2 rounded border-l-4 border-indigo-500">{section.title}</h3>
                  <div className="space-y-6">
                    {section.fields.map(field => (
                      <div key={field.id}><label className="block text-sm font-bold text-gray-700 mb-1">{field.label}</label>{renderField(field)}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* 操作區 */}
            <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
              
              {status === 'draft' && (isTeacher || isAdmin) && (
                <div className="flex justify-end gap-3">
                  <button onClick={() => handleSave('draft')} disabled={saving} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg">暫存草稿</button>
                  <button onClick={() => { if(window.confirm('確認評分完成？將通知學生填寫回饋。')) handleSave('teacher_graded'); }} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2"><CheckCircle className="w-4 h-4"/> 送出給學生</button>
                </div>
              )}
              
              {status === 'teacher_graded' && isStudent && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-start gap-2 bg-blue-50 p-3 rounded text-blue-800 text-sm"><AlertCircle className="w-5 h-5 mt-0.5"/><div><p className="font-bold">請填寫心得與感想</p></div></div>
                  <div className="flex justify-end gap-3">
                    <button onClick={() => handleSave('teacher_graded')} disabled={saving} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg">暫存</button>
                    {/* ★★★ 修正按鈕文字：完成 ★★★ */}
                    <button onClick={() => { if(window.confirm('確認送出？系統將依分數判定結果。')) handleSave('completed'); }} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2"><CheckCircle className="w-4 h-4"/> 完成</button>
                  </div>
                </div>
              )}

              {/* ★★★ 根據分數顯示不同顏色的區塊 ★★★ */}
              {(status === 'completed' || status === 'needs_improvement') && (
                <div className="space-y-4">
                  <RenderResultBlock />

                  <div className="flex justify-between items-center text-sm text-gray-500 pt-2 border-t border-gray-200">
                    <div className="flex gap-4">
                      <span>教師簽核：{formData.sign_teacher_name} ({formData.sign_teacher_date})</span>
                      <span>學生簽核：{formData.sign_student_name} ({formData.sign_student_date})</span>
                    </div>
                    {status === 'completed' && <span className="text-green-600 font-bold flex items-center gap-1"><Lock className="w-4 h-4"/> 已結案</span>}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DOPSAssessment;
