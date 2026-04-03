import React, { useState, useEffect } from 'react';
import { 
  Search, 
  FileText, 
  Phone, 
  ExternalLink,
  BookOpen,
  X,
  Paperclip,
  Image as ImageIcon,
  User,
  Clock,
  Edit,   // ★ 新增 Edit 圖示
  Save,   // ★ 新增 Save 圖示
  Trash2,
  Loader2
} from 'lucide-react';
import { db, auth } from '../firebase'; // ★ 引入 auth 以抓取共編者身分
import { collection, onSnapshot, query, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'; // ★ 引入 updateDoc
import { EXTENSION_DATA, sopData as localSopData } from '../data/sopData';

// 預設常用關鍵字
const DEFAULT_KEYWORDS = ['門診', '住院', '行政', '臨床', '管制藥', '盤點', '急診'];

// 關鍵字螢光筆小元件
const HighlightText = ({ text, highlight }) => {
  if (!highlight || !text) return <>{text}</>;
  const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escapedHighlight})`, 'gi'));
  
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === highlight.toLowerCase() ? (
          <mark key={i} className="bg-yellow-300 text-yellow-900 font-bold px-1 rounded shadow-sm">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
};

// 智慧圖片解析器 (支援 Google Drive 圖片直接顯示)
const processImageUrl = (url) => {
  if (!url) return { isImage: false, src: '' };
  
  const lowerUrl = url.toLowerCase();
  
  // 1. 判斷是否為結尾有 .jpg, .png 等的標準圖片網址，或 Firebase 圖片
  const isStandardImage = lowerUrl.match(/\.(jpeg|jpg|gif|png|webp|bmp)($|\?)/) || 
                          (lowerUrl.includes('firebasestorage') && lowerUrl.includes('alt=media'));
  
  // 2. 判斷是否為各種格式的 Google Drive 連結
  const driveMatch1 = url.match(/drive\.google\.com\/file\/d\/([^\/]+)/); // /file/d/ID/view
  const driveMatch2 = url.match(/drive\.google\.com\/open\?id=([^&]+)/);   // /open?id=ID
  const driveMatch3 = url.match(/drive\.google\.com\/uc\?.*id=([^&]+)/);   // /uc?id=ID
  
  const fileId = (driveMatch1 && driveMatch1[1]) || 
                 (driveMatch2 && driveMatch2[1]) || 
                 (driveMatch3 && driveMatch3[1]);

  if (isStandardImage) {
    return { isImage: true, src: url };
  } else if (fileId) {
    // 改用 thumbnail API，並將解析度拉高到 w1200 (1200px寬)，保證清晰且不會破圖
    return { isImage: true, src: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200` };
  }

  return { isImage: false, src: url };
};

// 內文圖片解析器 (Markdown: ![說明](網址))
const renderContentWithImages = (text, highlight) => {
  if (!text) return null;
  
  const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = imgRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.substring(lastIndex, match.index) });
    }
    // 透過智慧解析器處理 Markdown 裡的網址
    const imgInfo = processImageUrl(match[2]);
    parts.push({ type: 'image', alt: match[1], url: imgInfo.isImage ? imgInfo.src : match[2] });
    lastIndex = imgRegex.lastIndex;
  }
  
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.substring(lastIndex) });
  }

  return (
    <div className="space-y-4">
      {parts.map((part, index) => {
        if (part.type === 'text') {
          return <span key={index}><HighlightText text={part.content} highlight={highlight} /></span>;
        } else if (part.type === 'image') {
          return (
            <div key={index} className="my-6">
              <img 
                src={part.url} 
                alt={part.alt} 
                className="max-w-full h-auto rounded-lg shadow-md border border-gray-200"
                loading="lazy"
              />
              {part.alt && <p className="text-sm text-gray-500 text-center mt-2">{part.alt}</p>}
            </div>
          );
        }
        return null;
      })}
    </div>
  );
};

// 時間格式轉換器
const formatDateTime = (timestamp) => {
  if (!timestamp) return '';
  try {
    const date = new Date(timestamp.seconds ? timestamp.seconds * 1000 : timestamp);
    return date.toLocaleString('zh-TW', { 
      year: 'numeric', month: '2-digit', day: '2-digit', 
      hour: '2-digit', minute: '2-digit', hour12: false 
    });
  } catch (e) {
    return '';
  }
};

const QuickLookup = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('sop'); 
  
  const [sops, setSops] = useState([]); // 從 Firebase 讀取
  const [keywords, setKeywords] = useState(DEFAULT_KEYWORDS);
  const [categories, setCategories] = useState([]); // [新增] 分類選項
  const [loading, setLoading] = useState(true);
  
  const [selectedSop, setSelectedSop] = useState(null);

  // ★★★ [新增] Wiki 共編相關 State ★★★
  const [isEditingSop, setIsEditingSop] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    category: '',
    content: '',
    attachmentUrl: ''
  });

  // 監聽 Firebase SOP 資料
  useEffect(() => {
    const q = query(collection(db, 'sop_articles'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const firebaseData = [];
      snapshot.forEach((doc) => {
        firebaseData.push({ id: doc.id, ...doc.data() });
      });

      // 如果 Firebase 有資料就顯示，沒有就退回本地模式 (但此功能需連線)
      setSops(firebaseData.length > 0 ? firebaseData : 
        (Array.isArray(localSopData) ? localSopData.map(item => ({ ...item, source: 'local', id: `local_${item.id}` })) : []));
      setLoading(false);
    }, (error) => {
      console.error("Firebase 連線失敗:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 監聽 Firebase 參數設定 (關鍵字與分類)
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, "site_settings", "sop_config");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.quickKeywords && Array.isArray(data.quickKeywords)) setKeywords(data.quickKeywords);
          if (data.categories && Array.isArray(data.categories)) setCategories(data.categories); // [新增] 抓取分類
        }
      } catch (e) { console.error("讀取設定失敗:", e); }
    };
    fetchSettings();
  }, []);

  const getCategoryStyle = (category) => {
    if (!category) return 'bg-gray-100 text-gray-600';
    const fixedColors = {
      '門診': 'bg-orange-100 text-orange-800', '藥品諮詢': 'bg-rose-100 text-rose-800',
      '急診': 'bg-red-100 text-red-800', '行政流程': 'bg-stone-100 text-stone-800',
      '臨床藥學': 'bg-amber-100 text-amber-800', '教學': 'bg-yellow-100 text-yellow-800',
      '管制藥': 'bg-pink-100 text-pink-800', '藥品': 'bg-lime-100 text-lime-800',
      '調劑規範': 'bg-emerald-100 text-emerald-800', '公文': 'bg-warmGray-100 text-warmGray-800',
    };
    if (fixedColors[category]) return fixedColors[category];
    const dynamicColors = ['bg-orange-200 text-orange-900', 'bg-amber-200 text-amber-900', 'bg-yellow-200 text-yellow-900', 'bg-rose-200 text-rose-900', 'bg-pink-200 text-pink-900', 'bg-red-200 text-red-900', 'bg-stone-200 text-stone-900', 'bg-lime-200 text-lime-900', 'bg-fuchsia-100 text-fuchsia-800', 'bg-violet-100 text-violet-800', 'bg-indigo-100 text-indigo-800', 'bg-teal-100 text-teal-800'];
    let hash = 0;
    for (let i = 0; i < category.length; i++) hash = category.charCodeAt(i) + ((hash << 5) - hash);
    const index = Math.abs(hash) % dynamicColors.length;
    return dynamicColors[index];
  };

  const searchLower = searchTerm.toLowerCase();

  const filteredExtensions = EXTENSION_DATA.filter(item => 
    (item.area && item.area.toLowerCase().includes(searchLower)) || 
    (item.ext && item.ext.toLowerCase().includes(searchLower)) || 
    (item.note && item.note.toLowerCase().includes(searchLower))
  );

  const filteredSops = sops
    .filter(sop => 
      (sop.title && sop.title.toLowerCase().includes(searchLower)) || 
      (sop.category && sop.category.toLowerCase().includes(searchLower)) ||
      (sop.content && sop.content.toLowerCase().includes(searchLower))
    )
    .sort((a, b) => (a.category || '').localeCompare(b.category || ''));

  // ★★★ [新增] Wiki 共編邏輯 ★★★
  
  // 1. 開啟編輯模式
  const handleStartEditSop = () => {
    if (!selectedSop) return;
    setEditForm({
      title: selectedSop.title || '',
      category: selectedSop.category || '',
      content: selectedSop.content || '',
      attachmentUrl: selectedSop.attachmentUrl || ''
    });
    setIsEditingSop(true);
  };

  // 2. 取消編輯
  const handleCancelEditSop = () => {
    setIsEditingSop(false);
  };

  // 3. 儲存 Wiki 編修 (即時生效)
  const handleSaveWikiSop = async (e) => {
    e.preventDefault();
    if (!selectedSop || selectedSop.source === 'local') return alert("本地試用資料不支援共編功能，請確認連線。");
    if (isSubmitting) return;

    // 基本安全檢查
    if (!editForm.title || !editForm.category) {
      alert("請確認標題與分類皆已填寫！");
      return;
    }

    setIsSubmitting(true);

    try {
      // 抓取當前共編者身分 (學員姓名)
      const currentUser = auth?.currentUser;
      const editorName = currentUser?.displayName || currentUser?.email || '學員(未具名)';

      const sopRef = doc(db, 'sop_articles', selectedSop.id);
      
      // 打包更新資料
      const updateData = {
        title: editForm.title,
        category: editForm.category,
        content: editForm.content,
        attachmentUrl: editForm.attachmentUrl,
        // ★ 自動紀錄更新人與伺服器時間
        updatedBy: editorName,
        updatedAt: serverTimestamp() 
      };

      // 執行 Firebase 更新
      await updateDoc(sopRef, updateData);

      // 同步更新當前 selectedSop 的狀態，讓畫面能即時反映修改
      setSelectedSop(prev => ({
        ...prev,
        ...updateData,
        // 因為 Firebase serverTimestamp() 在前端抓不到正確時間，這裡手動設一個當下時間
        updatedAt: new Date() 
      }));

      setIsEditingSop(false);
      alert("✅ SOP 已成功編修，Wiki 精神萬歲！");

    } catch (error) {
      console.error("SOP 共編失敗:", error);
      alert(`⚠️ 儲存失敗：${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. 編輯表單同步
  const handleFormChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  return (
    <div className="space-y-0 sm:space-y-6"> 
      
      {/* 搜尋區塊 */}
      <div className="bg-white p-4 md:p-6 md:rounded-xl md:shadow-sm md:border border-gray-100">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Search className="w-5 h-5 md:w-6 md:h-6 text-orange-500" />
          關鍵字與 Wiki 共編
        </h2>
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="請輸入關鍵字：內文、分機、SOP 名稱..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none text-base md:text-lg shadow-inner bg-gray-50 md:bg-white"
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-gray-500 flex items-center mr-1">常用：</span>
          {keywords.map((keyword, idx) => (
            <button
              key={`${keyword}-${idx}`}
              onClick={() => setSearchTerm(keyword)}
              className="px-3 py-1 bg-orange-50 hover:bg-orange-100 text-orange-700 hover:text-orange-900 rounded-full text-xs transition-colors border border-orange-100"
            >
              {keyword}
            </button>
          ))}
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="px-3 py-1 bg-gray-100 text-gray-500 hover:bg-gray-200 rounded-full text-xs transition-colors border border-gray-200 ml-auto"
            >
              清除
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white md:rounded-t-xl px-0 md:px-2 pt-2 sticky top-16 z-40 shadow-sm md:shadow-none">
        <button
          onClick={() => setActiveTab('sop')}
          className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all relative top-[1px] md:rounded-t-lg ${
            activeTab === 'sop' 
              ? 'text-orange-600 bg-orange-50 border-b-2 border-orange-500 md:border-b-0 md:border-x md:border-t md:border-orange-100' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <BookOpen className="w-4 h-4" /> SOP 文件 ({filteredSops.length})
        </button>
        <button
          onClick={() => setActiveTab('extension')}
          className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all relative top-[1px] md:rounded-t-lg ${
            activeTab === 'extension' 
              ? 'text-green-600 bg-green-50 border-b-2 border-green-500 md:border-b-0 md:border-x md:border-t md:border-green-100' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Phone className="w-4 h-4" /> 常用分機 ({filteredExtensions.length})
        </button>
      </div>

      {/* Content Area */}
      <div className="min-h-[300px] bg-gray-50 p-2 md:bg-transparent md:p-0">
        {activeTab === 'sop' && (
          <div className="space-y-4 animate-fade-in">
            {loading ? (
              <p className="text-gray-500 text-center py-4">資料同步中...</p>
            ) : filteredSops.length === 0 ? (
              <div className="text-center py-12 text-gray-400 bg-white rounded-lg border border-dashed border-gray-200">
                無符合文件
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
                {filteredSops.map((sop) => {
                  const imgInfo = processImageUrl(sop.attachmentUrl);
                  
                  return (
                    <div
                      key={sop.id}
                      onClick={() => {
                        setSelectedSop(sop); // 不論有沒有內容都打開 Modal，由 Modal 決定閱讀或編輯
                      }}
                      className="group relative bg-white p-4 md:p-5 rounded-lg md:rounded-xl shadow-sm md:border border-gray-100 hover:border-orange-300 hover:shadow-md transition-all cursor-pointer overflow-hidden text-left"
                    >
                      <div className={`absolute top-0 left-0 px-3 py-1 text-xs font-bold rounded-br-lg ${getCategoryStyle(sop.category)}`}>
                        {sop.category || '未分類'}
                      </div>

                      <div className="mt-6 flex items-start justify-between">
                        <h4 className="font-bold text-gray-800 text-lg group-hover:text-orange-600 leading-snug line-clamp-2">
                          <HighlightText text={sop.title} highlight={searchTerm} />
                        </h4>
                        <div className="flex-shrink-0 ml-3 text-gray-400 group-hover:text-orange-500">
                          {sop.content || imgInfo.isImage ? <BookOpen className="w-5 h-5" /> : <ExternalLink className="w-5 h-5" />}
                        </div>
                      </div>

                      {/* 在卡片上也顯示更新時間 */}
                      <div className="mt-3 flex flex-wrap items-center justify-between text-xs text-gray-400 h-5">
                        <span className="truncate">
                           {sop.updatedAt && `更新於: ${formatDateTime(sop.updatedAt).split(' ')[0]}`}
                        </span>
                        
                        {sop.attachmentUrl && (
                          <span className="flex items-center gap-1 text-orange-600 font-medium bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100 ml-auto flex-shrink-0">
                            {imgInfo.isImage ? <ImageIcon className="w-3 h-3" /> : <Paperclip className="w-3 h-3" />} 
                            {imgInfo.isImage ? '包含圖片' : '包含附件'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 分機區域不變 */}
        {activeTab === 'extension' && (
          <div className="space-y-4 animate-fade-in">
            {filteredExtensions.length === 0 ? (
              <div className="text-center py-12 text-gray-400 bg-white rounded-lg border border-dashed border-gray-200">
                無符合分機
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 md:gap-3">
                {filteredExtensions.map((item, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm flex flex-col justify-center text-center hover:border-green-400 transition-colors">
                    <span className="text-gray-500 text-xs mb-1 font-medium">
                      <HighlightText text={item.area} highlight={searchTerm} />
                    </span>
                    <span className="text-xl font-mono font-bold text-green-700 tracking-wider">
                      <HighlightText text={item.ext} highlight={searchTerm} />
                    </span>
                    {item.note && (
                      <span className="text-[10px] text-gray-400 mt-1 bg-gray-50 px-1 rounded inline-block mx-auto">
                        <HighlightText text={item.note} highlight={searchTerm} />
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ★★★ Wiki 協作 Modal (閱讀/編輯 雙模式) ★★★ */}
      {selectedSop && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => { if (!isEditingSop) setSelectedSop(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in text-left" onClick={e => e.stopPropagation()}>
            
            {/* Modal Header (共用) */}
            <div className="p-5 border-b border-gray-100 flex justify-between items-start bg-gray-50/50 flex-shrink-0">
              
              {!isEditingSop ? (
                // 1. 閱讀模式 Header
                <>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 leading-tight">
                      <HighlightText text={selectedSop.title} highlight={searchTerm} />
                    </h3>
                    {(selectedSop.updatedBy || selectedSop.updatedAt) && (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5 text-xs font-medium text-gray-500">
                        {selectedSop.updatedBy && (
                          <span className="flex items-center gap-1 bg-gray-200/50 px-2 py-0.5 rounded text-gray-600">
                            <User className="w-3 h-3 text-indigo-500" />
                            Wiki 共編者：{selectedSop.updatedBy}
                          </span>
                        )}
                        {selectedSop.updatedAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-orange-400" />
                            更新：{formatDateTime(selectedSop.updatedAt)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    {selectedSop.source !== 'local' && ( // 非本地資料才可編輯
                      <button 
                        onClick={handleStartEditSop} 
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-sm font-bold transition-colors shadow-inner"
                      >
                        <Edit className="w-4 h-4"/> ✏️ 編輯文件
                      </button>
                    )}
                    <button onClick={() => setSelectedSop(null)} className="p-1.5 rounded-full hover:bg-gray-200 text-gray-500 transition-colors">
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </>
              ) : (
                // 2. 編輯模式 Header
                <>
                  <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <Edit className="w-5 h-5 text-indigo-600" />
                    Wiki 共編中：<span className="font-normal text-gray-600">{selectedSop.title}</span>
                  </h3>
                  <div className="flex items-center gap-2">
                    <button onClick={handleCancelEditSop} disabled={isSubmitting} className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-sm font-bold transition-colors">
                      取消
                    </button>
                    <button onClick={handleSaveWikiSop} disabled={isSubmitting} className="px-5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold flex items-center gap-1.5 transition-colors shadow-lg disabled:opacity-60">
                      {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin"/> 儲存中...</> : <><Save className="w-4 h-4" /> 確認儲存 (Wiki 即時生效)</>}
                    </button>
                  </div>
                </>
              )}
            </div>
            
            {/* Modal Body */}
            <div className="flex-1 p-6 sm:p-8 overflow-y-auto whitespace-pre-wrap leading-relaxed text-gray-700 text-lg">
              
              {!isEditingSop ? (
                // 1. 閱讀模式內容 (自動解析文字、螢光筆、Markdown圖片)
                <>
                  {selectedSop.content ? (
                    renderContentWithImages(selectedSop.content, searchTerm)
                  ) : (
                    !processImageUrl(selectedSop.attachmentUrl).isImage && <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">（此 SOP 暫無內文摘要，可能僅有附件或請點擊 Wiki 編輯補充）</div>
                  )}

                  {/* 附件預覽圖片 */}
                  {selectedSop.attachmentUrl && processImageUrl(selectedSop.attachmentUrl).isImage && (
                    <div className="mt-10 border-t border-gray-100 pt-8">
                      <p className="text-sm font-bold text-gray-500 mb-5 flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                        <ImageIcon className="w-4 h-4 text-gray-400"/> 附件/圖片網址自動預覽
                      </p>
                      <img 
                        src={processImageUrl(selectedSop.attachmentUrl).src} 
                        alt="SOP 圖片" 
                        className="w-full h-auto rounded-xl shadow-lg border border-gray-200"
                        loading="lazy"
                      />
                    </div>
                  )}
                </>
              ) : (
                // 2. ★★★ [新增] Wiki 編輯模式表單 ★★★
                <form className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">SOP 標題名稱</label>
                      <input 
                        type="text" 
                        name="title"
                        value={editForm.title}
                        onChange={handleFormChange}
                        className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-300 outline-none font-bold text-gray-800"
                        placeholder="請輸入精確的 SOP 標題"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">文件分類標籤</label>
                      <select 
                        name="category"
                        value={editForm.category}
                        onChange={handleFormChange}
                        className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-300 outline-none bg-white font-medium"
                        required
                      >
                        <option value="" disabled>請選擇分類</option>
                        {categories.map((cat, idx) => (
                          <option key={idx} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5 flex items-center justify-between">
                        SOP 詳細內文摘要與編修
                        <span className="font-normal text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">支援 Markdown 圖片語法 ![說明](網址)</span>
                    </label>
                    <textarea 
                      name="content"
                      value={editForm.content}
                      onChange={handleFormChange}
                      rows="14"
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-300 outline-none font-mono text-sm leading-relaxed bg-gray-50 placeholder:text-gray-400"
                      placeholder="請輸入 SOP 的詳細步驟、規範或補充資訊。\n\n如需插入圖片，可使用：![圖片描述](貼上圖片網址)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5 flex items-center gap-2">
                        <Paperclip className="w-4 h-4 text-gray-400"/>
                        附件連結 或 圖片網址 (選填)
                    </label>
                    <input 
                      type="url" 
                      name="attachmentUrl"
                      value={editForm.attachmentUrl}
                      onChange={handleFormChange}
                      className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-300 outline-none text-sm text-gray-600 font-medium"
                      placeholder="例：貼上 Google Drive 分享連結、jpg/png 圖片網址、PDF 連結"
                    />
                    <p className="text-xs text-gray-400 mt-1.5 ml-1">若貼上的是圖片連結，系統會在閱讀模式中自動呈現圖片預覽。</p>
                  </div>
                </form>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center flex-shrink-0">
                {!isEditingSop ? (
                    // 1. 閱讀模式 Footer
                    <>
                        <span className={`text-xs px-2.5 py-1 rounded font-bold ${getCategoryStyle(selectedSop.category)}`}>
                            {selectedSop.category || '未分類'}
                        </span>
                        
                        <div className="flex gap-2.5">
                            {selectedSop.attachmentUrl && (
                                <a href={selectedSop.attachmentUrl} target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 bg-orange-50 border border-orange-200 text-orange-700 rounded-xl text-sm hover:bg-orange-100 transition-colors flex items-center gap-2 font-bold shadow-sm shadow-orange-100">
                                    {processImageUrl(selectedSop.attachmentUrl).isImage ? <ImageIcon className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />} 
                                    開啟 / 下載{processImageUrl(selectedSop.attachmentUrl).isImage ? '原圖' : '附件'}
                                </a>
                            )}
                            <button onClick={() => setSelectedSop(null)} className="px-5 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-xl text-sm font-bold transition-colors">
                                關閉
                            </button>
                        </div>
                    </>
                ) : (
                    // 2. 編輯模式 Footer (安全提示)
                    <div className="flex-1 text-center text-sm text-gray-500 font-medium bg-indigo-50/50 p-2 rounded-lg border border-indigo-100">
                        提醒您：共編內容將會動態更新至資料庫，且標記您為最新編輯者，請審慎編輯，Wiki 精神萬歲！
                    </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickLookup;
