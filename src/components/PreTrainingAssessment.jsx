import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { PRE_TRAINING_FORM } from '../data/preTrainingForm';
import { 
  Save, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Lock, 
  Unlock,
  Plus,
  Trash2,
  FileText,
  ArrowLeft,
  ChevronRight
} from 'lucide-react';

const PreTrainingAssessment = ({ studentEmail, studentName, userRole, currentUserEmail }) => {
  // 視圖狀態：'menu' (選單) | 'form' (表單內容)
  const [view, setView] = useState('menu');
  
  const [formData, setFormData] = useState({});
  const [status, setStatus] = useState('draft'); // draft, submitted, approved
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const isAdmin = userRole === 'admin';
  const isTeacher = userRole === 'teacher';
  // 唯讀判斷：已核准 OR (已提交 且 不是管理員)
  const isReadOnly = status === 'approved' || (status === 'submitted' && !isAdmin);

  useEffect(() => {
    // 當進入表單模式且有學生Email時才讀取
    if (view === 'form' && studentEmail) {
      loadFormData();
    }
  }, [view, studentEmail]);

  const loadFormData = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, 'training_assessments', `${studentEmail}_pre_training`);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setFormData(data.formData || {});
        setStatus(data.status || 'draft');
        setLastUpdated(data.updatedAt?.toDate() || null);
      } else {
        setFormData({});
        setStatus('draft');
      }
    } catch (error) {
      console.error("讀取表單失敗", error);
    }
    setLoading(false);
  };

  const handleSave = async (newStatus) => {
    setSaving(true);
    try {
      const docRef = doc(db, 'training_assessments', `${studentEmail}_pre_training`);
      
      const payload = {
        studentEmail,
        studentName,
        formData,
        status: newStatus || status,
        updatedBy: currentUserEmail,
        updatedAt: new Date(),
        ...(newStatus === 'submitted' && { submittedBy: currentUserEmail, submittedAt: new Date() }),
        ...(newStatus === 'approved' && { approvedBy: currentUserEmail, approvedAt: new Date() })
      };

      await setDoc(docRef, payload, { merge: true });
      
      setStatus(newStatus || status);
      setLastUpdated(new Date());
      alert(newStatus === 'approved' ? '已完成審核！' : '儲存成功！');
      
    } catch (error) {
      console.error("儲存失敗", error);
      alert("儲存失敗");
    }
    setSaving(false);
  };

  const handleChange = (sectionId, fieldId, value) => {
    if (isReadOnly) return;
    setFormData(prev => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        [fieldId]: value
      }
    }));
  };

  const handleDynamicListChange = (sectionId, index, fieldId, value) => {
    if (isReadOnly) return;
    const currentList = formData[sectionId]?.list || [];
    const newList = [...currentList];
    if (!newList[index]) newList[index] = {};
    newList[index][fieldId] = value;
    
    setFormData(prev => ({
      ...prev,
      [sectionId]: { ...prev[sectionId], list: newList }
    }));
  };

  const addDynamicItem = (sectionId) => {
    if (isReadOnly) return;
    const currentList = formData[sectionId]?.list || [];
    setFormData(prev => ({
      ...prev,
      [sectionId]: { ...prev[sectionId], list: [...currentList, {}] }
    }));
  };

  const removeDynamicItem = (sectionId, index) => {
    if (isReadOnly) return;
    const currentList = formData[sectionId]?.list || [];
    const newList = currentList.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      [sectionId]: { ...prev[sectionId], list: newList }
    }));
  };

  const renderField = (field, sectionId, value, onChangeHandler) => {
    const disabled = isReadOnly;
    // 支援從 JSON 傳入的寬度，如果沒有則預設 100%
    const widthStyle = field.width ? { width: field.width } : { width: '100%' };

    switch (field.type) {
      case 'text':
      case 'number': // 支援數字輸入
        return (
          <input
            type={field.type}
            style={widthStyle} // 套用寬度
            className="px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-gray-100"
            value={value || ''}
            onChange={e => onChangeHandler(field.id, e.target.value)}
            disabled={disabled}
            placeholder={field.placeholder}
          />
        );
      case 'month': // 保留支援，雖然這次需求改用 number
        return (
          <input
            type="month"
            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-gray-100"
            value={value || ''}
            onChange={e => onChangeHandler(field.id, e.target.value)}
            disabled={disabled}
          />
        );
      case 'textarea':
        return (
          <textarea
            style={widthStyle}
            className="px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-gray-100"
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
      default:
        return null;
    }
  };

  // -------------------------------------------------------------------------
  // 畫面 1: 選單列表 (Menu View)
  // -------------------------------------------------------------------------
  if (view === 'menu') {
    return (
      <div className="max-w-4xl mx-auto animate-in fade-in">
        <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-600" />
          可用的評估表單
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 按鈕 1: 學前評估 */}
          <button 
            onClick={() => setView('form')}
            className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm hover:shadow-md hover:border-indigo-300 transition-all text-left group"
          >
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold text-gray-800 text-lg group-hover:text-indigo-600 transition-colors">
                  新進藥師學前評估表
                </h4>
                <p className="text-sm text-gray-500 mt-2">
                  適用對象：新進 PGY 學員<br/>
                  內容包含：背景調查、工作經歷、學習歷程調查
                </p>
              </div>
              <div className="bg-gray-100 p-2 rounded-full group-hover:bg-indigo-100 transition-colors">
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600" />
              </div>
            </div>
          </button>

          {/* 未來可在此新增更多按鈕，例如：月評核、DOPS... */}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // 畫面 2: 表單內容 (Form View)
  // -------------------------------------------------------------------------
  
  if (loading) return <div className="p-8 text-center text-gray-500 flex justify-center"><Loader2 className="animate-spin mr-2"/> 載入表單中...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-in slide-in-from-right-4">
      
      {/* 頂部導航列 */}
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

      {/* 狀態列 */}
      <div className={`p-4 rounded-lg flex justify-between items-center ${
        status === 'approved' ? 'bg-green-50 border border-green-200 text-green-800' :
        status === 'submitted' ? 'bg-orange-50 border border-orange-200 text-orange-800' :
        'bg-gray-50 border border-gray-200 text-gray-700'
      }`}>
        <div className="flex items-center gap-2">
           {status === 'approved' ? <Lock className="w-5 h-5"/> : <Unlock className="w-5 h-5"/>}
           <span className="font-bold">
             狀態：{status === 'draft' ? '草稿 (教師填寫中)' : status === 'submitted' ? '已提交 (等待教學負責人審核)' : '已核准 (結案)'}
           </span>
        </div>
        {lastUpdated && <span className="text-xs opacity-70">最後更新：{lastUpdated.toLocaleString()}</span>}
      </div>

      {/* 表單內容 */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="bg-indigo-600 px-6 py-4">
          <h2 className="text-xl font-bold text-white">{PRE_TRAINING_FORM.form_title}</h2>
          <p className="text-indigo-100 text-sm mt-1">版本：{PRE_TRAINING_FORM.version}</p>
        </div>

        <div className="p-6 md:p-8 space-y-10">
          {PRE_TRAINING_FORM.sections.map(section => (
            <div key={section.id} className="border-b border-gray-100 pb-8 last:border-0 last:pb-0">
              <h3 className="text-lg font-bold text-gray-800 mb-1">{section.title}</h3>
              {section.description && <p className="text-sm text-gray-500 mb-6">{section.description}</p>}

              {/* A. 一般區塊 */}
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
                                  sub, 
                                  section.id, 
                                  formData[section.id]?.[`${field.id}_${sub.id}`], 
                                  (fid, val) => handleChange(section.id, `${field.id}_${fid}`, val)
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    }
                    
                    // 處理並排顯示 (如果欄位有設定寬度)
                    return (
                      <div key={field.id} style={{ display: field.width ? 'inline-block' : 'block', width: field.width ? field.width : '100%', paddingRight: '1rem' }}>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          {field.label} {field.required && <span className="text-red-500">*</span>}
                        </label>
                        {renderField(
                          field, 
                          section.id, 
                          formData[section.id]?.[field.id], 
                          (fid, val) => handleChange(section.id, fid, val)
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* B. 動態列表 */}
              {section.is_dynamic_list && (
                <div className="space-y-4">
                  {(formData[section.id]?.list || []).map((item, idx) => (
                    <div key={idx} className="relative p-4 border border-gray-200 rounded-lg bg-gray-50 grid grid-cols-1 md:grid-cols-12 gap-4">
                      {section.fields.map(field => (
                        <div key={field.id} className={field.type === 'textarea' ? 'md:col-span-6' : 'md:col-span-3'}>
                          <label className="text-xs font-bold text-gray-500 mb-1 block">{field.label}</label>
                          {renderField(
                            field, 
                            section.id, 
                            item[field.id], 
                            (fid, val) => handleDynamicListChange(section.id, idx, fid, val)
                          )}
                        </div>
                      ))}
                      {!isReadOnly && (
                        <button 
                          onClick={() => removeDynamicItem(section.id, idx)}
                          className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {!isReadOnly && (
                    <button
                      onClick={() => addDynamicItem(section.id)}
                      className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-indigo-500 hover:text-indigo-600 font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                      <Plus className="w-5 h-5" /> {section.add_button_text}
                    </button>
                  )}
                </div>
              )}

              {/* C. 子區塊 (評核與規劃) */}
              {section.sub_sections && (
                <div className="space-y-8">
                  {section.sub_sections.map((subSec, idx) => (
                    <div key={idx} className="bg-white border border-gray-200 rounded-lg p-5">
                      <h4 className="font-bold text-indigo-700 mb-4 pb-2 border-b border-gray-100">{subSec.title}</h4>
                      
                      {/* C-1. 一般欄位 */}
                      {subSec.fields && (
                        <div className="space-y-4">
                          {subSec.fields.map(field => (
                            <div key={field.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                              <label className="text-sm font-bold text-gray-700 min-w-[80px]">{field.label}:</label>
                              <div className="flex-1">
                                {renderField(
                                  field, 
                                  section.id, 
                                  formData[section.id]?.[field.id], 
                                  (fid, val) => handleChange(section.id, fid, val)
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* C-2. 表格 (訓練規劃) */}
                      {subSec.layout === 'table' && (
                         <div className="overflow-x-auto">
                           <table className="w-full text-sm text-left">
                             <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
                               <tr>
                                 {subSec.columns.map(col => <th key={col} className="p-3">{col}</th>)}
                               </tr>
                             </thead>
                             <tbody className="divide-y divide-gray-100">
                               {subSec.rows.map(row => (
                                 <tr key={row.id}>
                                   <td className="p-3 font-medium text-gray-800">{row.unit}</td>
                                   
                                   <td className="p-3">
                                     <div className="flex flex-wrap gap-2">
                                       {row.assessment.options.map(opt => (
                                          <label key={opt} className="flex items-center gap-1 cursor-pointer">
                                            <input 
                                              type="radio"
                                              name={`${row.id}_assess`}
                                              value={opt}
                                              checked={formData[section.id]?.[`${row.id}_assess`] === opt}
                                              onChange={e => handleChange(section.id, `${row.id}_assess`, e.target.value)}
                                              disabled={isReadOnly}
                                              className="text-indigo-600"
                                            />
                                            <span>{opt}</span>
                                          </label>
                                       ))}
                                     </div>
                                   </td>
                                   
                                   <td className="p-3">
                                      <div className="flex flex-col gap-2">
                                        {row.planning.options.map((opt, i) => (
                                          <label key={i} className="flex items-center gap-2 cursor-pointer">
                                            <input 
                                              type="radio"
                                              name={`${row.id}_plan`}
                                              value={opt.label}
                                              checked={formData[section.id]?.[`${row.id}_plan`] === opt.label}
                                              onChange={e => handleChange(section.id, `${row.id}_plan`, e.target.value)}
                                              disabled={isReadOnly}
                                              className="text-indigo-600"
                                            />
                                            <span>{opt.label}</span>
                                            {opt.input_type === 'number' && (
                                              <input 
                                                type="number"
                                                className="w-16 border-b border-gray-300 text-center focus:border-indigo-500 outline-none p-0 disabled:bg-transparent"
                                                disabled={isReadOnly || formData[section.id]?.[`${row.id}_plan`] !== opt.label}
                                                value={formData[section.id]?.[`${row.id}_plan_custom`] || ''}
                                                onChange={e => handleChange(section.id, `${row.id}_plan_custom`, e.target.value)}
                                              />
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
          ))}
        </div>

        {/* 底部按鈕 */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          {!isReadOnly && (
             <button
               onClick={() => handleSave('draft')}
               disabled={saving}
               className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium flex items-center gap-2"
             >
               {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
               儲存草稿
             </button>
          )}

          {status === 'draft' && !isAdmin && (
            <button
               onClick={() => {
                 if(window.confirm('提交後將無法再修改，確認送出給教學負責人審核？')) {
                   handleSave('submitted');
                 }
               }}
               disabled={saving}
               className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium flex items-center gap-2"
             >
               <CheckCircle className="w-4 h-4"/>
               提交審核
             </button>
          )}

          {status === 'submitted' && isAdmin && (
             <div className="flex gap-2">
                <button
                 onClick={() => handleSave('draft')} 
                 className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium"
               >
                 退回修改
               </button>
               <button
                 onClick={() => {
                    if(window.confirm('確認資料無誤並核准？核准後將無法變更。')) {
                      handleSave('approved');
                    }
                 }}
                 disabled={saving}
                 className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2"
               >
                 <CheckCircle className="w-4 h-4"/>
                 核准並結案
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
  );
};

export default PreTrainingAssessment;
