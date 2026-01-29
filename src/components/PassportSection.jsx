import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  CheckCircle, 
  Circle, 
  Award, 
  BarChart2, 
  Download, 
  User, 
  UserCheck, 
  MessageSquare,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Users,
  ShieldAlert
} from 'lucide-react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer,
  Tooltip as RechartsTooltip
} from 'recharts';
import * as XLSX from 'xlsx';
import { db } from '../firebase';
import { collection, doc, setDoc, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { trainingCategories } from '../data/trainingData';

// 評分定義
const RATING_LEVELS = {
  1: { label: "需加強", color: "text-red-500" },
  2: { label: "部分完成", color: "text-orange-500" },
  3: { label: "可獨立執行", color: "text-yellow-600" },
  4: { label: "熟練", color: "text-green-600" },
  5: { label: "可指導他人", color: "text-blue-600" }
};

const PassportSection = ({ user, userRole }) => {
  // 狀態管理
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard | list
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null); // 當前正在評核的項目
  const [records, setRecords] = useState({}); // 學習紀錄
  
  // 教師專用狀態
  const [studentList, setStudentList] = useState([]); // 學生名單
  const [selectedStudent, setSelectedStudent] = useState(null); // 目前正在查看的學生
  
  // 評核表單暫存狀態
  const [formData, setFormData] = useState({
    studentRating: 3,
    studentComment: '',
    teacherRating: 3,
    teacherComment: '',
    status: 'pending'
  });

  // 1. 初始化邏輯：決定「目標學生 (Target User)」是誰
  const targetUser = userRole === 'student' ? user : selectedStudent;
  const isTeacherMode = userRole === 'teacher';

  // 2. 教師功能：抓取使用者名單 (修改為抓取所有用戶，方便單人測試)
  useEffect(() => {
    if (userRole === 'teacher') {
      const fetchStudents = async () => {
        //原本是 where('role', '==', 'student')，為了測試方便，改成抓所有使用者
        const q = query(collection(db, 'users')); 
        const querySnapshot = await getDocs(q);
        const students = [];
        querySnapshot.forEach((doc) => {
          students.push({ uid: doc.id, ...doc.data() });
        });
        setStudentList(students);
      };
      fetchStudents();
    }
  }, [userRole]);

  // 3. 監聽 Firebase 資料
  useEffect(() => {
    if (!targetUser) {
      setRecords({});
      return;
    }

    const q = collection(db, 'users', targetUser.uid, 'learning_records');
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newRecords = {};
      snapshot.forEach((doc) => {
        newRecords[doc.id] = doc.data();
      });
      setRecords(newRecords);
    });

    return () => unsubscribe();
  }, [targetUser]);

  // 4. 計算圖表數據
  const calculateStats = () => {
    const radarData = trainingCategories.map(cat => {
      const items = cat.items;
      let totalScore = 0;
      let count = 0;
      
      items.forEach(item => {
        const record = records[item.id];
        if (record && record.teacherRating) {
          totalScore += record.teacherRating;
        }
        count++;
      });

      return {
        subject: cat.title.substring(0, 4), // 簡化標題
        A: count > 0 ? (totalScore / count).toFixed(1) : 0, // 平均分
        fullMark: 5
      };
    });

    const totalItems = trainingCategories.reduce((acc, cat) => acc + cat.items.length, 0);
    const completedItems = Object.values(records).filter(r => r.status === 'completed').length;
    const progress = Math.round((completedItems / totalItems) * 100);

    return { radarData, progress, completedItems, totalItems };
  };

  const stats = calculateStats();

  // ★ 安全性驗證測試函式 (Security Test)
  const runSecurityTest = async () => {
    const testItem = trainingCategories[0].items[0];
    const recordRef = doc(db, 'users', user.uid, 'learning_records', testItem.id);

    const confirmTest = window.confirm(
      `【權限攻擊模擬】\n\n` +
      `目前身分：${userRole === 'student' ? 'PGY 學員' : '指導藥師'}\n` +
      `測試目標：嘗試強制修改 [${testItem.title}] 的「教師評分」為 5 分。\n\n` +
      `預期結果：\n` +
      `- 如果你是學員：應該失敗 (顯示 Permission Denied)\n` +
      `- 如果你是藥師：應該成功\n\n` +
      `要開始測試嗎？`
    );

    if (!confirmTest) return;

    try {
      await setDoc(recordRef, {
        itemId: testItem.id,
        itemTitle: testItem.title,
        teacherRating: 5,
        teacherComment: "駭客強制修改!!",
        status: 'completed',
        lastUpdated: new Date().toISOString()
      }, { merge: true });

      alert("❌ 寫入成功！\n\n如果你現在是「藥師」，這是正常的。\n如果你是「學員」，代表權限規則可能未正確發布。");
    } catch (error) {
      if (error.code === 'permission-denied') {
        alert("✅ 權限防護成功！\n\nFirebase 成功攔截了違規寫入請求。\n錯誤代碼: permission-denied");
      } else {
        alert("⚠️ 發生其他錯誤:\n" + error.message);
      }
    }
  };

  // 5. 處理評核提交
  const handleSubmitEvaluation = async (e) => {
    e.preventDefault();
    if (!targetUser || !selectedItem) return;

    const recordRef = doc(db, 'users', targetUser.uid, 'learning_records', selectedItem.id);
    
    let updateData = {
      itemId: selectedItem.id,
      itemTitle: selectedItem.title,
      categoryId: trainingCategories.find(c => c.items.some(i => i.id === selectedItem.id))?.id,
      lastUpdated: new Date().toISOString()
    };

    if (isTeacherMode) {
      updateData = {
        ...updateData,
        teacherRating: Number(formData.teacherRating),
        teacherComment: formData.teacherComment,
        status: 'completed',
        teacherId: user.uid,
        teacherName: user.displayName || '指導藥師'
      };
    } else {
      updateData = {
        ...updateData,
        studentRating: Number(formData.studentRating),
        studentComment: formData.studentComment,
        status: records[selectedItem.id]?.status === 'completed' ? 'completed' : 'submitted'
      };
    }

    try {
      await setDoc(recordRef, updateData, { merge: true });
      setSelectedItem(null);
    } catch (error) {
      console.error("Error updating document: ", error);
      alert("儲存失敗: " + error.message);
    }
  };

  // 6. 匯出 Excel
  const handleExport = () => {
    if (!targetUser) return;
    const exportData = [];
    
    trainingCategories.forEach(cat => {
      cat.items.forEach(item => {
        const record = records[item.id] || {};
        exportData.push({
          '類別': cat.title,
          '項目': item.title,
          '狀態': record.status === 'completed' ? '已認證' : (record.status === 'submitted' ? '待審核' : '未完成'),
          '學員自評': record.studentRating || '-',
          '學員心得': record.studentComment || '-',
          '教師評分': record.teacherRating || '-',
          '教師回饋': record.teacherComment || '-',
          '最後更新': record.lastUpdated ? new Date(record.lastUpdated).toLocaleDateString() : '-'
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "學習護照紀錄");
    XLSX.writeFile(wb, `${targetUser.displayName || 'User'}_學習護照_${new Date().toLocaleDateString()}.xlsx`);
  };

  // 7. 開啟評核視窗
  const openEvaluationModal = (item) => {
    const record = records[item.id] || {};
    setFormData({
      studentRating: record.studentRating || 3,
      studentComment: record.studentComment || '',
      teacherRating: record.teacherRating || 3,
      teacherComment: record.teacherComment || '',
      status: record.status || 'pending'
    });
    setSelectedItem(item);
  };

  // 如果是老師且尚未選擇學生，顯示學生列表
  if (userRole === 'teacher' && !selectedStudent) {
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            指導藥師 - 學員管理中心
          </h2>
          <p className="text-gray-500 mb-6">請選擇一位學員以查看其學習護照進度或進行評核。</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {studentList.length > 0 ? (
              studentList.map(student => (
                <button
                  key={student.uid}
                  onClick={() => setSelectedStudent(student)}
                  className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:border-indigo-500 hover:shadow-md transition-all text-left group"
                >
                  <img 
                    src={student.photoURL || `https://ui-avatars.com/api/?name=${student.displayName}`} 
                    alt={student.displayName}
                    className="w-12 h-12 rounded-full bg-gray-100" 
                  />
                  <div>
                    <h3 className="font-bold text-gray-800 group-hover:text-indigo-600">{student.displayName || student.email}</h3>
                    <p className="text-sm text-gray-500">點擊查看進度</p>
                    {/* 標示是否為當前使用者 */}
                    {student.uid === user.uid && <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">我自己</span>}
                  </div>
                </button>
              ))
            ) : (
              <div className="col-span-full py-8 text-center text-gray-400 bg-gray-50 rounded-lg">
                目前尚無學員資料
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* --- Header & 返回按鈕 --- */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {userRole === 'teacher' && (
              <button 
                onClick={() => setSelectedStudent(null)}
                className="text-sm text-indigo-600 hover:underline mr-2"
              >
                ← 返回學員列表
              </button>
            )}
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Award className="w-6 h-6 text-indigo-600" />
              {targetUser?.displayName} 的學習護照
            </h2>
          </div>
          <p className="text-gray-500 text-sm">
             目前進度：{stats.completedItems} / {stats.totalItems} 項目 ({stats.progress}%)
             {userRole === 'teacher' && <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full">教師檢視模式</span>}
          </p>
        </div>

        <div className="flex gap-2">
            {!isTeacherMode && (
                <button
                    onClick={runSecurityTest}
                    className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-md text-sm font-medium hover:bg-red-100 flex items-center gap-1"
                    title="點擊測試資料庫權限規則是否生效"
                >
                    <ShieldAlert className="w-4 h-4" />
                    權限攻擊測試
                </button>
            )}

            <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg border border-gray-200">
            <span className="text-sm font-medium text-gray-600">當前身分：</span>
            <span className={`px-3 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 ${isTeacherMode ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'}`}>
                {isTeacherMode ? <UserCheck className="w-4 h-4" /> : <User className="w-4 h-4" />}
                {isTeacherMode ? '指導藥師' : 'PGY 學員'}
            </span>
            </div>
        </div>
      </div>

      {/* --- 主功能 Tab --- */}
      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`pb-3 px-4 text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <BarChart2 className="w-4 h-4 inline mr-2" />
          能力分析儀表板
        </button>
        <button
          onClick={() => setActiveTab('list')}
          className={`pb-3 px-4 text-sm font-medium transition-colors ${activeTab === 'list' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <BookOpen className="w-4 h-4 inline mr-2" />
          學習項目列表
        </button>
      </div>

      {/* --- Tab 1: 儀表板 --- */}
      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 雷達圖 */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 min-h-[400px] flex flex-col items-center justify-center">
            <h3 className="text-lg font-bold text-gray-700 mb-4 self-start w-full border-b pb-2">核心能力雷達圖</h3>
            <div className="w-full h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={stats.radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" />
                  <PolarRadiusAxis angle={30} domain={[0, 5]} />
                  <Radar name="能力評分" dataKey="A" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.6} />
                  <RechartsTooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-gray-400 mt-2">* 數據來源：教師評核分數平均值</p>
          </div>

          {/* 統計與匯出 */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-700 mb-4 border-b pb-2">整體訓練進度</h3>
              <div className="mb-6">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">總完成率</span>
                  <span className="text-sm font-medium text-indigo-600">{stats.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${stats.progress}%` }}></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-600 mb-1">已完成項目</p>
                  <p className="text-3xl font-bold text-blue-800">{stats.completedItems}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">剩餘項目</p>
                  <p className="text-3xl font-bold text-gray-800">{stats.totalItems - stats.completedItems}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-700 mb-4 border-b pb-2">資料管理</h3>
              <button 
                onClick={handleExport}
                className="w-full py-3 px-4 bg-gray-800 hover:bg-gray-900 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="w-5 h-5" />
                匯出完整學習履歷 (Excel)
              </button>
              <p className="text-xs text-gray-500 mt-3 text-center">
                可匯出包含自評、教師評分與雙向回饋的完整報表。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* --- Tab 2: 列表 --- */}
      {activeTab === 'list' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          {trainingCategories.map((category) => (
            <div key={category.id} className="border-b border-gray-100 last:border-0">
              {/* Category Header */}
              <button
                onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-gray-800">{category.title}</h3>
                  <span className="text-xs px-2 py-1 bg-white border border-gray-200 rounded-full text-gray-500">
                    {category.items.length} 項目
                  </span>
                </div>
                {expandedCategory === category.id ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
              </button>

              {/* Items List */}
              {expandedCategory === category.id && (
                <div className="divide-y divide-gray-100">
                  {category.items.map((item) => {
                    const record = records[item.id] || {};
                    const isCompleted = record.status === 'completed';
                    const isSubmitted = record.status === 'submitted';
                    
                    return (
                      <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white hover:bg-indigo-50/30 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className={`mt-1 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                            isCompleted ? 'text-green-500' : (isSubmitted ? 'text-orange-400' : 'text-gray-300')
                          }`}>
                            {isCompleted ? <CheckCircle className="w-full h-full" /> : <Circle className="w-full h-full" />}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{item.title}</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {/* 狀態標籤 */}
                              {record.status === 'completed' && (
                                <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-100">
                                  已認證 ({record.teacherRating}分)
                                </span>
                              )}
                              {record.status === 'submitted' && (
                                <span className="text-xs text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-100 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" /> 待審核
                                </span>
                              )}
                              {!record.status && (
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">未開始</span>
                              )}
                              
                              {/* 雙向回饋指示 */}
                              {(record.studentComment || record.teacherComment) && (
                                <span className="text-xs text-indigo-600 flex items-center gap-1">
                                  <MessageSquare className="w-3 h-3" /> 有留言
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => openEvaluationModal(item)}
                          className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors whitespace-nowrap ${
                            isCompleted 
                              ? 'border-gray-200 text-gray-600 hover:bg-gray-50' 
                              : (isTeacherMode && isSubmitted 
                                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                                  : 'bg-indigo-600 text-white border-transparent hover:bg-indigo-700 shadow-sm')
                          }`}
                        >
                          {isTeacherMode ? (isSubmitted ? '立即審核' : '修改評分') : (isCompleted ? '查看紀錄' : '自我評量')}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* --- Evaluation Modal (評核視窗) --- */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedItem.title}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {isTeacherMode ? '教師評核模式' : '學員自我評量模式'}
                </p>
              </div>
              <button 
                onClick={() => setSelectedItem(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmitEvaluation} className="p-6 space-y-8">
              {/* 1. 學員自評區塊 */}
              <div className={`space-y-4 p-4 rounded-lg border ${isTeacherMode ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-100'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <User className={`w-5 h-5 ${isTeacherMode ? 'text-gray-400' : 'text-blue-600'}`} />
                  <h4 className={`font-bold ${isTeacherMode ? 'text-gray-500' : 'text-blue-800'}`}>學員自我評量</h4>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">自我評分 (1-5)</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((score) => (
                      <button
                        key={`s-${score}`}
                        type="button"
                        disabled={isTeacherMode}
                        onClick={() => setFormData(prev => ({ ...prev, studentRating: score }))}
                        className={`w-10 h-10 rounded-full font-bold transition-all ${
                          formData.studentRating === score 
                            ? (isTeacherMode ? 'bg-gray-400 text-white' : 'bg-blue-600 text-white ring-2 ring-blue-200') 
                            : 'bg-white border border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {score}
                      </button>
                    ))}
                  </div>
                  <p className={`text-sm mt-2 ${RATING_LEVELS[formData.studentRating].color} font-medium`}>
                    {RATING_LEVELS[formData.studentRating].label}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">學習心得 / 遇到的困難</label>
                  <textarea
                    disabled={isTeacherMode}
                    value={formData.studentComment}
                    onChange={(e) => setFormData(prev => ({ ...prev, studentComment: e.target.value }))}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500 p-3"
                    rows="3"
                    placeholder="例如：對於抗生素的稀釋比例還不是很熟悉..."
                  />
                </div>
              </div>

              {/* 2. 教師評核區塊 */}
              {(isTeacherMode || records[selectedItem.id]?.teacherRating) && (
                <div className={`space-y-4 p-4 rounded-lg border ${!isTeacherMode ? 'bg-gray-50 border-gray-200' : 'bg-emerald-50 border-emerald-100'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <UserCheck className={`w-5 h-5 ${!isTeacherMode ? 'text-gray-400' : 'text-emerald-600'}`} />
                    <h4 className={`font-bold ${!isTeacherMode ? 'text-gray-500' : 'text-emerald-800'}`}>教師評核與回饋</h4>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">評核分數 (1-5)</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((score) => (
                        <button
                          key={`t-${score}`}
                          type="button"
                          disabled={!isTeacherMode}
                          onClick={() => setFormData(prev => ({ ...prev, teacherRating: score }))}
                          className={`w-10 h-10 rounded-full font-bold transition-all ${
                            formData.teacherRating === score 
                              ? (isTeacherMode ? 'bg-emerald-600 text-white ring-2 ring-emerald-200' : 'bg-gray-400 text-white') 
                              : 'bg-white border border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {score}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">指導建議</label>
                    <textarea
                      disabled={!isTeacherMode}
                      value={formData.teacherComment}
                      onChange={(e) => setFormData(prev => ({ ...prev, teacherComment: e.target.value }))}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 disabled:bg-gray-100 disabled:text-gray-500 p-3"
                      rows="3"
                      placeholder="給學員的具體建議..."
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2.5 rounded-lg text-white font-medium shadow-sm transition-all ${
                    isTeacherMode 
                      ? 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-emerald-200' 
                      : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-200'
                  }`}
                >
                  {isTeacherMode ? '確認通過' : '提交評量'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PassportSection;
