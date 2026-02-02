import React, { useState, useEffect } from 'react';
import { PRE_TRAINING_FORM } from '../data/preTrainingForm';
import { 
  Save, 
  CheckCircle, 
  Loader2, 
  Lock, 
  Unlock,
  Plus,
  Trash2,
  FileText,
  ArrowLeft,
  ChevronRight,
  User,
  Calendar,
  CheckCircle2
} from 'lucide-react';

// ★★★ 1. 接收 currentUserName ★★★
const PreTrainingAssessment = ({ studentEmail, studentName, userRole, currentUserEmail, currentUserName, gasApiUrl }) => {
  const [view, setView] = useState('menu');
  const [formData, setFormData] = useState({});
  const [status, setStatus] = useState('draft'); 
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [signOffData, setSignOffData] = useState({
    teacherName: '',
    teacherDate: '',
    adminName: '',
    adminDate: ''
  });

  const isAdmin = userRole === 'admin';     
  const isTeacher = userRole === 'teacher'; 
  const isStudent = userRole === 'student'; 

  const isGlobalReadOnly = 
    status === 'approved' || 
    (status === 'assessed' && !isAdmin) ||
    (status === 'submitted' && isStudent);

  useEffect(() => {
    if (studentEmail) {
      loadFormData();
    }
  }, [view, studentEmail]);

  // ★★★ 2. 自動帶入登入者姓名 ★★★
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    
    // 教師模式：若還沒簽名，自動填入當前登入者姓名
    if (isTeacher && status === 'submitted' && !signOffData.teacherName) {
      setSignOffData(prev => ({ 
        ...prev, 
        teacherName: currentUserName || '指導藥師', 
        teacherDate: today 
      }));
    }
    
    // 負責人模式：若還沒簽名，自動填入當前登入者姓名
    if (isAdmin && status === 'assessed' && !signOffData.adminName) {
      setSignOffData(prev => ({ 
        ...prev, 
        adminName: currentUserName || '教學負責人', 
        adminDate: today 
      }));
    }
  }, [userRole, isTeacher, isAdmin, status, currentUserName]);

  const loadFormData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${gasApiUrl}?type=getAssessment&studentEmail=${studentEmail}&formType=pre_training`);
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
      console.error("讀取表單失敗", error);
    }
    setLoading(false);
  };

  const handleSave = async (newStatus) => {
    setSaving(true);
    const targetStatus = newStatus || status;
    const today = new Date().toISOString().split('T')[0];

    let finalFormData = { ...formData };

    if (newStatus === 'submitted') {
      finalFormData.sign_student_date = today;
    }

    // ★★★ 3. 儲存時再次強制使用 currentUserName，確保安全性 ★★★
    if (newStatus === 'assessed') {
      if (!signOffData.teacherDate) {
        alert("請選擇評估日期");
        setSaving(false);
        return;
      }
      finalFormData.sign_teacher_name = currentUserName; // 強制寫入當前登入者
      finalFormData.sign_teacher_date = signOffData.teacherDate;
    }

    if (newStatus === 'approved') {
      if (!signOffData.adminDate) {
        alert("請選擇審核日期");
        setSaving(false);
        return;
      }
      finalFormData.sign_admin_name = currentUserName; // 強制寫入當前登入者
      finalFormData.sign_admin_date = signOffData.adminDate;
    }

    const payload = {
      type: 'saveAssessment',
      formType: 'pre_training',
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
      
      if (newStatus === 'approved' || newStatus === 'submitted' || newStatus === 'assessed') {
        setView('menu');
      }

    } catch (error) {
      console.error("儲存失敗", error);
      alert("儲存失敗，請檢查網路");
    }
    setSaving(false);
  };

  const handleChange = (sectionId, fieldId, value) => {
    if (isGlobalReadOnly) return;
    setFormData(prev => ({
      ...prev,
      [sectionId]: { ...prev[sectionId], [fieldId]: value }
    }));
  };

  const handleDynamicListChange = (sectionId, index, fieldId, value) => {
    if (isGlobalReadOnly) return;
    const currentList = formData[sectionId]?.list || [];
    const newList = [...currentList];
    if (!newList[index]) newList[index] = {};
    newList[index][fieldId] = value;
    setFormData(prev => ({ ...prev, [sectionId]: { ...prev[sectionId], list: newList } }));
  };

  const addDynamicItem = (sectionId) => {
    if (isGlobalReadOnly) return;
    const currentList = formData[sectionId]?.list || [];
    setFormData(prev => ({ ...prev, [sectionId]: { ...prev[sectionId], list: [...currentList, {}] } }));
  };

  const removeDynamicItem = (sectionId, index) => {
    if (isGlobalReadOnly) return;
    const currentList = formData[sectionId]?.list || [];
    const newList = currentList.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, [sectionId]: { ...prev[sectionId], list: newList } }));
  };

  const renderField = (field, sectionId, value, onChangeHandler, isSectionLocked) => {
    const disabled = isGlobalReadOnly || isSectionLocked;
    const widthStyle = field.width ? { width: field.width } : { width: '100%' };

    switch (field.type) {
      case 'text':
      case 'number': 
        return (
          <input
            type={field.type}
            style={widthStyle} 
            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-gray-100"
            value={value || ''}
            onChange={e => onChangeHandler(field.id, e.target.value)}
            disabled={disabled}
            placeholder={field.placeholder}
          />
        );
      case 'textarea':
        return (
          <textarea
            style={widthStyle}
            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-gray-100"
            rows={3}
            value={value || ''}
            onChange={e => onChangeHandler(field.id, e.target.value)}
            disabled={disabled}
          />
        );
      case 'radio':
        return (
          <div className="flex flex-wrap gap-4">
            {field.options.map(opt => (
              <label key={opt} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={`${sectionId}_${field.id}`}
                  value={opt}
                  checked={value === opt}
                  onChange={e => onChangeHandler(field.id, e.target.value)}
                  disabled={disabled}
                  className="w-4 h-4 text-indigo-600"
                />
                <span className="text-gray-700">{opt}</span>
              </label>
            ))}
            {field.has_other_text && (
              <div className="flex items-center gap-2">
                 <input
                  type="radio"
                  name={`${sectionId}_${field.id}`}
                  value="其他"
                  checked={value === '其他'}
                  onChange={e => onChangeHandler(field.id, '其他')}
                  disabled={disabled}
                />
                <span className="text-gray-700">其他:</span>
                <input 
                  type="text" 
                  className="border-b border-gray-300 focus:border-indigo-500 outline-none px-1 disabled:bg-transparent"
                  disabled={disabled || value !== '其他'}
                  value={formData[sectionId]?.[`${field.id}_other`] || ''}
                  onChange={e => onChangeHandler(`${field.id}_other`, e.target.value)}
                />
              </div>
            )}
          </div>
        );
      case 'score_radio':
        return (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-bold text-gray-600">分數:</label>
              <input 
                type="number"
                placeholder="0-100"
                className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-gray-100 text-center"
                value={formData[sectionId]?.[`${field.id}_score`] || ''}
                onChange={e => onChangeHandler(`${field.id}_score`, e.target.value)} 
                disabled={disabled}
              />
            </div>
            <div className="flex flex-wrap gap-4">
              {field.options.map(opt => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={`${sectionId}_${field.id}`}
                    value={opt}
                    checked={value === opt}
                    onChange={e => onChangeHandler(field.id, e.target.value)}
                    disabled={disabled}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <span className="text-gray-700">{opt}</span>
                </label>
              ))}
            </div>
          </div>
        );
      case 'checkbox':
        const checkedValues = Array.isArray(value) ? value : [];
        return (
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {field.options.map(opt => (
              <label key={opt} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  value={opt}
                  checked={checkedValues.includes(opt)}
                  disabled={disabled}
                  onChange={e => {
                    const newValues = e.target.checked
                      ? [...checkedValues, opt]
                      : checkedValues.filter(v => v !== opt);
                    onChangeHandler(field.id, newValues);
                  }}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span className="text-gray-700">{opt}</span>
              </label>
            ))}
          </div>
        );
      default: return null;
    }
  };

  if (view === 'menu') {
    const isSubmitted = ['submitted', 'assessed', 'approved'].includes(status);
    const isAssessed = ['assessed', 'approved'].includes(status);
    const isApproved = status === 'approved';

    return (
      <div className="max-w-4xl mx-auto animate-in fade-in">
        <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-600" />
          可用的評估表單
        </h3>
        
        <div 
          onClick={() => setView('form')}
          className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer overflow-hidden group"
        >
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 group-hover:bg-indigo-50 transition-colors">
            <div>
              <h4 className="font-bold text-gray-800 text-lg group-hover:text-indigo-600">新進藥師學前評估表</h4>
              <p className="text-xs text-gray-500 mt-1">版本：{PRE_TRAINING_FORM.version}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600" />
          </div>

          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-gray-700">
                <div className={`w-2 h-2 rounded-full ${isSubmitted ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <span>學生填寫</span>
                {formData.sign_student_date && (
                  <span className="bg-gray-100 px-2 py-0.5 rounded text-xs text-gray-600">
                    {formData.sign_student_date}
                  </span>
                )}
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                isSubmitted ? 'bg-green-100 text-green-700' : 
                status === 'draft' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-400'
              }`}>
                {isSubmitted ? '已完成' : '填寫中'}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm border-t border-gray-50 pt-2">
              <div className="flex items-center gap-2 text-gray-700">
                <div className={`w-2 h-2 rounded-full ${isAssessed ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <span>教師評估</span>
                {formData.sign_teacher_name && (
                  <>
                    <span className="font-bold text-xs">[{formData.sign_teacher_name}]</span>
                    <span className="bg-gray-100 px-2 py-0.5 rounded text-xs text-gray-600">{formData.sign_teacher_date}</span>
                  </>
                )}
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                isAssessed ? 'bg-green-100 text-green-700' : 
                (isSubmitted && !isAssessed) ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'
              }`}>
                {isAssessed ? '已完成' : (isSubmitted ? '待評估' : '--')}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm border-t border-gray-50 pt-2">
              <div className="flex items-center gap-2 text-gray-700">
                <div className={`w-2 h-2 rounded-full ${isApproved ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <span>負責人審核</span>
                {formData.sign_admin_name && (
                  <>
                    <span className="font-bold text-xs">[{formData.sign_admin_name}]</span>
                    <span className="bg-gray-100 px-2 py-0.5 rounded text-xs text-gray-600">{formData.sign_admin_date}</span>
                  </>
                )}
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                isApproved ? 'bg-green-100 text-green-700' : 
                (isAssessed && !isApproved) ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-400'
              }`}>
                {isApproved ? '完成' : (isAssessed ? '待審核' : '--')}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (loading) return <div className="p-8 text-center text-gray-500 flex justify-center"><Loader2 className="animate-spin mr-2"/> 載入表單中...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in slide-in-from-right-4">
      
      <div className="flex items-center gap-2 mb-4">
        <button 
          onClick={() => setView('menu')}
          className="flex items-center gap-1 text-gray-500 hover:text-indigo-600 font-bold text-sm bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" /> 返回列表
        </button>
        <span className="text-gray-300">|</span>
        <span className="text-gray-700 font-medium">{studentName} 的評估表</span>
      </div>

      <div className={`p-4 rounded-lg flex justify-between items-center ${
        status === 'approved' ? 'bg-green-50 border border-green-200 text-green-800' :
        status === 'assessed' ? 'bg-purple-50 border border-purple-200 text-purple-800' :
        status === 'submitted' ? 'bg-blue-50 border border-blue-200 text-blue-800' :
        'bg-gray-50 border border-gray-200 text-gray-700'
      }`}>
        <div className="flex items-center gap-2">
           {status === 'approved' ? <Lock className="w-5 h-5"/> : <Unlock className="w-5 h-5"/>}
           <span className="font-bold">
             狀態：
             {status === 'draft' && '草稿 (學生填寫中)'}
             {status === 'submitted' && '已提交 (待教師評估)'}
             {status === 'assessed' && '已評估 (待負責人審核)'}
             {status === 'approved' && '已核准 (結案)'}
           </span>
        </div>
        {lastUpdated && <span className="text-xs opacity-70">最後更新：{lastUpdated.toLocaleString()}</span>}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="bg-indigo-600 px-6 py-4">
          <h2 className="text-xl font-bold text-white">{PRE_TRAINING_FORM.form_title}</h2>
          <p className="text-indigo-100 text-sm mt-1">版本：{PRE_TRAINING_FORM.version}</p>
        </div>

        <div className="p-6 md:p-8 space-y-10">
          {PRE_TRAINING_FORM.sections.map(section => {
            const isSectionLocked = section.access_control === 'teacher_admin' && isStudent;

            return (
              <div key={section.id} className="border-b border-gray-100 pb-8 last:border-0 last:pb-0">
                <h3 className="text-lg font-bold text-gray-800 mb-1">{section.title}</h3>
                {section.description && <p className="text-sm text-gray-500 mb-6">{section.description}</p>}

                {isSectionLocked && (
                  <div className="bg-gray-100 text-gray-500 p-3 rounded mb-4 text-sm flex items-center gap-2">
                    <Lock className="w-4 h-4" /> 此區域僅限指導藥師或教學負責人填寫
                  </div>
                )}

                {section.fields && !section.is_dynamic_list && (
                  <div className="grid grid-cols-1 gap-6">
                    {section.fields.map(field => {
                      if (field.type === 'group') {
                        return (
                          <div key={field.id} className="bg-gray-50 p-4 rounded-lg">
                            <label className="font-bold text-gray-700 block mb-3">{field.label}</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {field.sub_fields.map(sub => (
                                <div key={sub.id} className={sub.type === 'checkbox' ? 'md:col-span-2' : ''}>
                                  <label className="text-xs font-bold text-gray-500 mb-1 block">{sub.label}</label>
                                  {renderField(
                                    sub, section.id, 
                                    formData[section.id]?.[`${field.id}_${sub.id}`], 
                                    (fid, val) => handleChange(section.id, `${field.id}_${fid}`, val),
                                    isSectionLocked
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      }
                      
                      return (
                        <div key={field.id} style={{ display: field.width ? 'inline-block' : 'block', width: field.width ? field.width : '100%', paddingRight: '1rem' }}>
                          <label className="block text-sm font-bold text-gray-700 mb-2">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                          </label>
                          {renderField(
                            field, section.id, 
                            formData[section.id]?.[field.id], 
                            (fid, val) => handleChange(section.id, fid, val),
                            isSectionLocked
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {section.is_dynamic_list && (
                  <div className="space-y-4">
                    {(formData[section.id]?.list || []).map((item, idx) => (
                      <div key={idx} className="relative p-4 border border-gray-200 rounded-lg bg-gray-50 grid grid-cols-1 md:grid-cols-12 gap-4">
                        {section.fields.map(field => (
                          <div key={field.id} className={`md:col-span-${field.col_span || 12} col-span-12`}>
                            <label className="text-xs font-bold text-gray-500 mb-1 block">{field.label}</label>
                            {renderField(
                              field, section.id, item[field.id], 
                              (fid, val) => handleDynamicListChange(section.id, idx, fid, val),
                              isSectionLocked
                            )}
                          </div>
                        ))}
                        {!isGlobalReadOnly && !isSectionLocked && (
                          <button onClick={() => removeDynamicItem(section.id, idx)} className="absolute top-2 right-2 text-gray-400 hover:text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    {!isGlobalReadOnly && !isSectionLocked && (
                      <button onClick={() => addDynamicItem(section.id)} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-indigo-500 hover:text-indigo-600 font-bold flex items-center justify-center gap-2 transition-colors">
                        <Plus className="w-5 h-5" /> {section.add_button_text}
                      </button>
                    )}
                  </div>
                )}

                {section.sub_sections && (
                  <div className="space-y-8">
                    {section.sub_sections.map((subSec, idx) => (
                      <div key={idx} className="bg-white border border-gray-200 rounded-lg p-5">
                        <h4 className="font-bold text-indigo-700 mb-4 pb-2 border-b border-gray-100">{subSec.title}</h4>
                        
                        {subSec.fields && (
                          <div className="space-y-4">
                            {subSec.fields.map(field => (
                              <div key={field.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                <label className="text-sm font-bold text-gray-700 min-w-[80px]">{field.label}:</label>
                                <div className="flex-1">
                                  {renderField(
                                    field, section.id, 
                                    formData[section.id]?.[field.id], 
                                    (fid, val) => handleChange(section.id, fid, val),
                                    isSectionLocked
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {subSec.layout === 'table' && (
                           <div className="overflow-x-auto">
                             <table className="w-full text-sm text-left">
                               <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
                                 <tr>{subSec.columns.map(col => <th key={col} className="p-3">{col}</th>)}</tr>
                               </thead>
                               <tbody className="divide-y divide-gray-100">
                                 {subSec.rows.map(row => (
                                   <tr key={row.id}>
                                     <td className="p-3 font-medium text-gray-800">{row.unit}</td>
                                     <td className="p-3">
                                       <div className="flex flex-wrap gap-2">
                                         {row.assessment.options.map(opt => (
                                            <label key={opt} className="flex items-center gap-1 cursor-pointer">
                                              <input type="radio" name={`${row.id}_assess`} value={opt} checked={formData[section.id]?.[`${row.id}_assess`] === opt} onChange={e => handleChange(section.id, `${row.id}_assess`, e.target.value)} disabled={isGlobalReadOnly || isSectionLocked} className="text-indigo-600" />
                                              <span>{opt}</span>
                                            </label>
                                         ))}
                                       </div>
                                     </td>
                                     <td className="p-3">
                                        <div className="flex flex-col gap-2">
                                          {row.planning.options.map((opt, i) => (
                                            <label key={i} className="flex items-center gap-2 cursor-pointer">
                                              <input type="radio" name={`${row.id}_plan`} value={opt.label} checked={formData[section.id]?.[`${row.id}_plan`] === opt.label} onChange={e => handleChange(section.id, `${row.id}_plan`, e.target.value)} disabled={isGlobalReadOnly || isSectionLocked} className="text-indigo-600" />
                                              <span>{opt.label}</span>
                                              {opt.input_type === 'number' && (
                                                <input type="number" className="w-16 border-b border-gray-300 text-center focus:border-indigo-500 outline-none p-0 disabled:bg-transparent" disabled={isGlobalReadOnly || isSectionLocked || formData[section.id]?.[`${row.id}_plan`] !== opt.label} value={formData[section.id]?.[`${row.id}_plan_custom`] || ''} onChange={e => handleChange(section.id, `${row.id}_plan_custom`, e.target.value)} />
                                              )}
                                            </label>
                                          ))}
                                        </div>
                                     </td>
                                   </tr>
                                 ))}
                               </tbody>
                             </table>
                           </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* --- 底部簽核與操作區 --- */}
        <div className="bg-gray-50 border-t border-gray-200">
          
          {/* 1. 教師簽核區 (Submitted 狀態 + 教師/管理員) */}
          {status === 'submitted' && (isTeacher || isAdmin) && (
            <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
              <h4 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
                <User className="w-4 h-4" /> 教師評估簽核
              </h4>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-blue-600 mb-1">評估教師姓名</label>
                  <input 
                    type="text" 
                    value={signOffData.teacherName}
                    disabled={true} // ★★★ 唯讀設定
                    className="w-full px-3 py-2 border rounded-md bg-gray-100 cursor-not-allowed" // 灰色背景
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-blue-600 mb-1">評估日期</label>
                  <input 
                    type="date" 
                    value={signOffData.teacherDate}
                    onChange={e => setSignOffData({...signOffData, teacherDate: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 2. 負責人審核區 (Assessed 狀態 + Admin) */}
          {status === 'assessed' && isAdmin && (
            <div className="px-6 py-4 bg-purple-50 border-b border-purple-100">
              <h4 className="font-bold text-purple-800 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> 負責人審核簽核
              </h4>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-purple-600 mb-1">審核負責人姓名</label>
                  <input 
                    type="text" 
                    value={signOffData.adminName}
                    disabled={true} // ★★★ 唯讀設定
                    className="w-full px-3 py-2 border rounded-md bg-gray-100 cursor-not-allowed"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-purple-600 mb-1">審核日期</label>
                  <input 
                    type="date" 
                    value={signOffData.adminDate}
                    onChange={e => setSignOffData({...signOffData, adminDate: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 操作按鈕 */}
          <div className="px-6 py-4 flex justify-end gap-3">
            {/* 草稿儲存 */}
            {!isGlobalReadOnly && (
              <button onClick={() => handleSave(status)} disabled={saving} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium flex items-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} 儲存進度
              </button>
            )}

            {/* 學生送出 */}
            {status === 'draft' && isStudent && (
              <button onClick={() => { if(window.confirm('確認送出？送出後將無法修改。')) handleSave('submitted'); }} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center gap-2">
                <CheckCircle className="w-4 h-4"/> 提交評估
              </button>
            )}

            {/* 教師送出 (新增狀態: assessed) */}
            {status === 'submitted' && (isTeacher || isAdmin) && (
              <button onClick={() => { if(window.confirm('確認評估完成？將送交負責人審核。')) handleSave('assessed'); }} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
                <CheckCircle className="w-4 h-4"/> 完成評估
              </button>
            )}

            {/* 負責人核准 */}
            {status === 'assessed' && isAdmin && (
              <div className="flex gap-2">
                <button onClick={() => handleSave('submitted')} className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium">退回教師</button>
                <button onClick={() => { if(window.confirm('確認核准並結案？')) handleSave('approved'); }} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2">
                  <CheckCircle className="w-4 h-4"/> 核准結案
                </button>
              </div>
            )}

            {status === 'approved' && (
              <span className="text-green-600 font-bold flex items-center gap-2">
                <CheckCircle className="w-5 h-5"/> 本表單已核准結案
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreTrainingAssessment;
