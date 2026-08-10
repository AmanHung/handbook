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
  Edit,
  Save,
  Trash2,
  Loader2,
  Upload,
  Link as LinkIcon // ★ 新增 Link 圖示
} from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, query, doc, getDoc, updateDoc } from 'firebase/firestore';
import { EXTENSION_DATA, sopData as localSopData } from '../data/sopData';
import { getEditorAuditFields } from '../utils/editorIdentity';

// ★★★ 請替換為您專案中實際的 GAS 網址 ★★★
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbw3-nakNBi0t3W3_-XtQmztYqq9qAj0ZOaGpXKZG41eZfhYjNfIM5xuVXwzSLa1_X3hfA/exec";

const DEFAULT_KEYWORDS = ['門診', '住院', '行政', '臨床', '管制藥', '盤點', '急診'];

const normalizeKeyword = (value) => String(value || '').trim().toLocaleLowerCase('zh-TW');

const hasExactKeyword = (sop, keyword) => {
  const normalizedKeyword = normalizeKeyword(keyword);
  return normalizedKeyword.length > 0
    && (sop.keywords || []).some(item => normalizeKeyword(item) === normalizedKeyword);
};

const HighlightText = ({ text, highlight }) => {
  if (!highlight || !text) return <>{text}</>;
  const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escapedHighlight})`, 'gi'));
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === highlight.toLowerCase() ? (
          <mark key={i} className="bg-yellow-300 text-yellow-900 font-bold px-1 rounded shadow-sm">{part}</mark>
        ) : (part)
      )}
    </>
  );
};

const processImageUrl = (url) => {
  if (!url) return { isImage: false, src: '' };
  const lowerUrl = url.toLowerCase();
  const isStandardImage = lowerUrl.match(/\.(jpeg|jpg|gif|png|webp|bmp)($|\?)/) || (lowerUrl.includes('firebasestorage') && lowerUrl.includes('alt=media'));
  const driveMatch1 = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  const driveMatch2 = url.match(/drive\.google\.com\/open\?id=([^&]+)/);   
  const driveMatch3 = url.match(/drive\.google\.com\/uc\?.*id=([^&]+)/);   
  const fileId = (driveMatch1 && driveMatch1[1]) || (driveMatch2 && driveMatch2[1]) || (driveMatch3 && driveMatch3[1]);

  if (isStandardImage) return { isImage: true, src: url };
  else if (fileId) return { isImage: true, src: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200` };

  return { isImage: false, src: url };
};

// ★★★ [升級] 內文解析器 (支援圖片 ![說明](網址) 與 多重超連結 [文字](網址)) ★★★
const renderMarkdownContent = (text, highlight) => {
  if (!text) return null;
  const regex = /(!?)\[([^\]]*)\]\(([^)]+)\)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.substring(lastIndex, match.index) });
    }
    const isImage = match[1] === '!';
    const textOrAlt = match[2];
    const url = match[3];

    if (isImage) {
      const imgInfo = processImageUrl(url);
      parts.push({ type: 'image', alt: textOrAlt, url: imgInfo.isImage ? imgInfo.src : url });
    } else {
      parts.push({ type: 'link', text: textOrAlt || url, url: url });
    }
    lastIndex = regex.lastIndex;
  }
  
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.substring(lastIndex) });
  }

  return (
    <div className="whitespace-pre-wrap leading-relaxed">
      {parts.map((part, index) => {
        if (part.type === 'text') {
          return <span key={index}><HighlightText text={part.content} highlight={highlight} /></span>;
        } else if (part.type === 'image') {
          return (
            <div key={index} className="my-6 block">
              <img src={part.url} alt={part.alt} className="max-w-full h-auto rounded-lg shadow-md border border-gray-200" loading="lazy" />
              {part.alt && <p className="text-sm text-gray-500 text-center mt-2">{part.alt}</p>}
            </div>
          );
        } else if (part.type === 'link') {
          // 渲染成漂亮的按鈕式超連結
          return (
            <a 
              key={index} 
              href={part.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-indigo-600 hover:text-indigo-800 underline font-bold inline-flex items-center gap-1 bg-indigo-50 px-1.5 py-0.5 rounded mx-1 align-baseline transition-colors"
            >
              {part.text} <ExternalLink className="w-3.5 h-3.5" />
            </a>
          );
        }
        return null;
      })}
    </div>
  );
};

const formatDateTime = (timestamp) => {
  if (!timestamp) return '';
  try {
    const date = new Date(timestamp.seconds ? timestamp.seconds * 1000 : timestamp);
    return date.toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  } catch (e) { return ''; }
};

const QuickLookup = ({ canEdit = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeQuickKeyword, setActiveQuickKeyword] = useState('');
  const [activeTab, setActiveTab] = useState('sop'); 
  
  const [sops, setSops] = useState([]);
  const [keywords, setKeywords] = useState(DEFAULT_KEYWORDS);
  const [categories, setCategories] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  const [selectedSop, setSelectedSop] = useState(null);

  // Wiki 共編相關 State
  const [isEditingSop, setIsEditingSop] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false); 
  const [editForm, setEditForm] = useState({ title: '', category: '', content: '', attachmentUrl: '' });

  useEffect(() => {
    const q = query(collection(db, 'sop_articles'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const firebaseData = [];
      snapshot.forEach((doc) => firebaseData.push({ id: doc.id, ...doc.data() }));
      setSops(firebaseData.length > 0 ? firebaseData : (Array.isArray(localSopData) ? localSopData.map(item => ({ ...item, source: 'local', id: `local_${item.id}` })) : []));
      setLoading(false);
    }, (error) => { console.error("Firebase 連線失敗:", error); setLoading(false); });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, "site_settings", "sop_config");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.quickKeywords && Array.isArray(data.quickKeywords)) setKeywords(data.quickKeywords);
          if (data.categories && Array.isArray(data.categories)) setCategories(data.categories);
        }
      } catch (e) { console.error("讀取設定失敗:", e); }
    };
    fetchSettings();
  }, []);

  const getCategoryStyle = (category) => {
    if (!category) return 'bg-gray-100 text-gray-600';
    const fixedColors = { '門診': 'bg-orange-100 text-orange-800', '藥品諮詢': 'bg-rose-100 text-rose-800', '急診': 'bg-red-100 text-red-800', '行政流程': 'bg-stone-100 text-stone-800', '臨床藥學': 'bg-amber-100 text-amber-800', '教學': 'bg-yellow-100 text-yellow-800', '管制藥': 'bg-pink-100 text-pink-800', '藥品': 'bg-lime-100 text-lime-800', '調劑規範': 'bg-emerald-100 text-emerald-800', '公文': 'bg-warmGray-100 text-warmGray-800' };
    if (fixedColors[category]) return fixedColors[category];
    const dynamicColors = ['bg-orange-200 text-orange-900', 'bg-amber-200 text-amber-900', 'bg-yellow-200 text-yellow-900', 'bg-rose-200 text-rose-900', 'bg-pink-200 text-pink-900', 'bg-red-200 text-red-900', 'bg-stone-200 text-stone-900', 'bg-lime-200 text-lime-900', 'bg-fuchsia-100 text-fuchsia-800', 'bg-violet-100 text-violet-800', 'bg-indigo-100 text-indigo-800', 'bg-teal-100 text-teal-800'];
    let hash = 0;
    for (let i = 0; i < category.length; i++) hash = category.charCodeAt(i) + ((hash << 5) - hash);
    return dynamicColors[Math.abs(hash) % dynamicColors.length];
  };

  const searchLower = normalizeKeyword(searchTerm);
  const filteredExtensions = EXTENSION_DATA.filter(item => 
    (item.area && item.area.toLowerCase().includes(searchLower)) || 
    (item.ext && item.ext.toLowerCase().includes(searchLower)) || 
    (item.note && item.note.toLowerCase().includes(searchLower))
  );

  const matchesFreeText = (sop) => !searchLower
    || normalizeKeyword(sop.title).includes(searchLower)
    || normalizeKeyword(sop.category).includes(searchLower)
    || normalizeKeyword(sop.content).includes(searchLower)
    || (sop.keywords || []).some(keyword => normalizeKeyword(keyword).includes(searchLower));

  const getSearchRank = (sop) => {
    if (!searchLower) return 4;
    if (hasExactKeyword(sop, searchTerm)) return 0;
    if (normalizeKeyword(sop.title).includes(searchLower)) return 1;
    if (normalizeKeyword(sop.category).includes(searchLower)) return 2;
    return 3;
  };

  const filteredSops = sops
    .filter(sop => activeQuickKeyword ? hasExactKeyword(sop, activeQuickKeyword) : matchesFreeText(sop))
    .sort((a, b) => getSearchRank(a) - getSearchRank(b)
      || (a.category || '').localeCompare(b.category || '', 'zh-Hant')
      || (a.title || '').localeCompare(b.title || '', 'zh-Hant'));

  const quickKeywordCounts = Object.fromEntries(
    keywords.map(keyword => [keyword, sops.filter(sop => hasExactKeyword(sop, keyword)).length])
  );

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setActiveQuickKeyword('');
  };

  const handleQuickKeywordClick = (keyword) => {
    if (quickKeywordCounts[keyword] === 0) return;
    setActiveTab('sop');
    setActiveQuickKeyword(keyword);
    setSearchTerm(keyword);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setActiveQuickKeyword('');
  };

  const handleStartEditSop = () => {
    if (!canEdit) return;
    if (!selectedSop) return;
    setEditForm({
      title: selectedSop.title || '', category: selectedSop.category || '', content: selectedSop.content || '', attachmentUrl: selectedSop.attachmentUrl || ''
    });
    setIsEditingSop(true);
  };

  const handleCancelEditSop = () => setIsEditingSop(false);

  const handleSaveWikiSop = async (e) => {
    e.preventDefault();
    if (!canEdit) return alert("訪客模式僅供瀏覽，請登入後再編輯文件。");
    if (!selectedSop || selectedSop.source === 'local') return alert("本地試用資料不支援共編功能，請確認連線。");
    if (isSubmitting) return;
    if (!editForm.title || !editForm.category) return alert("請確認標題與分類皆已填寫！");

    setIsSubmitting(true);
    try {
      const sopRef = doc(db, 'sop_articles', selectedSop.id);
      
      const updateData = {
        title: editForm.title, category: editForm.category, content: editForm.content, attachmentUrl: editForm.attachmentUrl,
        ...getEditorAuditFields()
      };

      await updateDoc(sopRef, updateData);
      setSelectedSop(prev => ({ ...prev, ...updateData, updatedAt: new Date() }));
      setIsEditingSop(false);
    } catch (error) {
      alert(`⚠️ 儲存失敗：${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormChange = (e) => setEditForm({ ...editForm, [e.target.name]: e.target.value });

  const handleFileUpload = async (e, targetField) => {
    if (!canEdit) return alert("訪客模式不支援檔案上傳。");
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("檔案太大！為了傳輸穩定，請上傳 5MB 以下的檔案/圖片。");
      return;
    }

    setIsUploadingFiles(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const response = await fetch(GAS_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'upload_to_drive', fileName: file.name, mimeType: file.type, base64: reader.result })
        });
        const result = await response.json();
        if (result.status === 'success') {
          const driveUrl = result.url;
          if (targetField === 'attachmentUrl') {
             setEditForm(prev => ({ ...prev, attachmentUrl: driveUrl }));
          } else if (targetField === 'content') {
             const isImg = file.type.startsWith('image/');
             // ★ 上傳檔案後，自動產生對應的語法 (圖片為 ![]()，檔案為 []())
             const mdText = isImg ? `\n![${file.name}](${driveUrl})\n` : `\n[下載附件：${file.name}](${driveUrl})\n`;
             setEditForm(prev => ({ ...prev, content: prev.content + mdText }));
          }
        } else {
          alert("上傳失敗：" + result.message);
        }
      } catch (error) {
        alert("上傳發生錯誤，請檢查網路！");
      } finally {
        setIsUploadingFiles(false);
        e.target.value = ''; 
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-0 sm:space-y-6"> 
      
      {/* 搜尋區塊 */}
      <div className="bg-white p-4 md:p-6 md:rounded-xl md:shadow-sm md:border border-gray-100">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Search className="w-5 h-5 md:w-6 md:h-6 text-orange-500" /> 關鍵字與 Wiki 共編
        </h2>
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text" placeholder="請輸入關鍵字：內文、分機、SOP 名稱..."
            value={searchTerm} onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none text-base md:text-lg shadow-inner bg-gray-50 md:bg-white"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-gray-500 flex items-center mr-1">常用：</span>
          {keywords.map((keyword, idx) => {
            const count = quickKeywordCounts[keyword] || 0;
            const isActive = activeQuickKeyword === keyword;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleQuickKeywordClick(keyword)}
                disabled={count === 0}
                title={count === 0 ? '目前沒有文件使用此標籤' : `${count} 份文件`}
                className={`px-3 py-1 rounded-full text-xs transition-colors border inline-flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-orange-600 text-white border-orange-600'
                    : count === 0
                      ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'bg-orange-50 hover:bg-orange-100 text-orange-700 hover:text-orange-900 border-orange-100'
                }`}
              >
                {keyword}
                <span className={`px-1.5 rounded-full text-[10px] ${isActive ? 'bg-white/20' : 'bg-white'}`}>{count}</span>
              </button>
            );
          })}
          {searchTerm && <button onClick={clearSearch} className="px-3 py-1 bg-gray-100 text-gray-500 hover:bg-gray-200 rounded-full text-xs transition-colors border border-gray-200 ml-auto">清除</button>}
        </div>
        {activeQuickKeyword && (
          <p className="text-xs text-orange-700 mt-3">
            目前使用精確標籤篩選：{activeQuickKeyword}。如要搜尋全文，請直接修改上方搜尋文字。
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white md:rounded-t-xl px-0 md:px-2 pt-2 sticky top-16 z-40 shadow-sm md:shadow-none">
        <button onClick={() => setActiveTab('sop')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all relative top-[1px] md:rounded-t-lg ${activeTab === 'sop' ? 'text-orange-600 bg-orange-50 border-b-2 border-orange-500 md:border-b-0 md:border-x md:border-t md:border-orange-100' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
          <BookOpen className="w-4 h-4" /> SOP 文件 ({filteredSops.length})
        </button>
        <button onClick={() => setActiveTab('extension')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all relative top-[1px] md:rounded-t-lg ${activeTab === 'extension' ? 'text-green-600 bg-green-50 border-b-2 border-green-500 md:border-b-0 md:border-x md:border-t md:border-green-100' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
          <Phone className="w-4 h-4" /> 常用分機 ({filteredExtensions.length})
        </button>
      </div>

      {/* Content Area */}
      <div className="min-h-[300px] bg-gray-50 p-2 md:bg-transparent md:p-0">
        {activeTab === 'sop' && (
          <div className="space-y-4 animate-fade-in">
            {loading ? ( <p className="text-gray-500 text-center py-4">資料同步中...</p> ) : filteredSops.length === 0 ? ( <div className="text-center py-12 text-gray-400 bg-white rounded-lg border border-dashed border-gray-200">無符合文件</div> ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
                {filteredSops.map((sop) => {
                  const imgInfo = processImageUrl(sop.attachmentUrl);
                  return (
                    <div key={sop.id} onClick={() => setSelectedSop(sop)} className="group relative bg-white p-4 md:p-5 rounded-lg md:rounded-xl shadow-sm md:border border-gray-100 hover:border-orange-300 hover:shadow-md transition-all cursor-pointer overflow-hidden text-left">
                      <div className={`absolute top-0 left-0 px-3 py-1 text-xs font-bold rounded-br-lg ${getCategoryStyle(sop.category)}`}>{sop.category || '未分類'}</div>
                      <div className="mt-6 flex items-start justify-between">
                        <h4 className="font-bold text-gray-800 text-lg group-hover:text-orange-600 leading-snug line-clamp-2">
                          <HighlightText text={sop.title} highlight={searchTerm} />
                        </h4>
                        <div className="flex-shrink-0 ml-3 text-gray-400 group-hover:text-orange-500">
                          {sop.content || imgInfo.isImage ? <BookOpen className="w-5 h-5" /> : <ExternalLink className="w-5 h-5" />}
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between text-xs text-gray-400 h-5">
                        <span className="truncate">{sop.updatedAt && `更新於: ${formatDateTime(sop.updatedAt).split(' ')[0]}`}</span>
                        {sop.attachmentUrl && (
                          <span className="flex items-center gap-1 text-orange-600 font-medium bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100 ml-auto flex-shrink-0">
                            {imgInfo.isImage ? <ImageIcon className="w-3 h-3" /> : <Paperclip className="w-3 h-3" />} {imgInfo.isImage ? '包含圖片' : '包含附件'}
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

        {activeTab === 'extension' && (
          <div className="space-y-4 animate-fade-in">
            {filteredExtensions.length === 0 ? ( <div className="text-center py-12 text-gray-400 bg-white rounded-lg border border-dashed border-gray-200">無符合分機</div> ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 md:gap-3">
                {filteredExtensions.map((item, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm flex flex-col justify-center text-center hover:border-green-400 transition-colors">
                    <span className="text-gray-500 text-xs mb-1 font-medium"><HighlightText text={item.area} highlight={searchTerm} /></span>
                    <span className="text-xl font-mono font-bold text-green-700 tracking-wider"><HighlightText text={item.ext} highlight={searchTerm} /></span>
                    {item.note && <span className="text-[10px] text-gray-400 mt-1 bg-gray-50 px-1 rounded inline-block mx-auto"><HighlightText text={item.note} highlight={searchTerm} /></span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ★★★ Wiki 協作 Modal ★★★ */}
      {selectedSop && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => { if (!isEditingSop) setSelectedSop(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in text-left" onClick={e => e.stopPropagation()}>
            
            <div className="p-5 border-b border-gray-100 flex justify-between items-start bg-gray-50/50 flex-shrink-0">
              {!isEditingSop ? (
                <>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 leading-tight"><HighlightText text={selectedSop.title} highlight={searchTerm} /></h3>
                    {(selectedSop.updatedByName || selectedSop.updatedBy || selectedSop.updatedAt) && (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5 text-xs font-medium text-gray-500">
                        {(selectedSop.updatedByName || selectedSop.updatedBy) && <span className="flex items-center gap-1 bg-gray-200/50 px-2 py-0.5 rounded text-gray-600"><User className="w-3 h-3 text-indigo-500" /> Wiki 共編者：{selectedSop.updatedByName || selectedSop.updatedBy}{selectedSop.updatedByEmail ? `（${selectedSop.updatedByEmail}）` : ''}</span>}
                        {selectedSop.updatedAt && <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-orange-400" /> 更新：{formatDateTime(selectedSop.updatedAt)}</span>}
                      </div>
                    )}
                    {selectedSop.sourceSystem === 'pharmacy-bot' && (
                      <div className="mt-2 text-xs font-bold text-teal-700 bg-teal-50 border border-teal-100 rounded-md px-2.5 py-1 inline-flex items-center gap-1">
                        由 LINE 資訊中心公告轉入
                        {selectedSop.sourceRecordId ? `｜來源編號：${selectedSop.sourceRecordId}` : ''}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    {canEdit && selectedSop.source !== 'local' && (
                      <button onClick={handleStartEditSop} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-sm font-bold transition-colors shadow-inner"><Edit className="w-4 h-4"/> ✏️ 編輯文件</button>
                    )}
                    <button onClick={() => setSelectedSop(null)} className="p-1.5 rounded-full hover:bg-gray-200 text-gray-500 transition-colors"><X className="w-6 h-6" /></button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Edit className="w-5 h-5 text-indigo-600" /> Wiki 共編中：<span className="font-normal text-gray-600">{selectedSop.title}</span></h3>
                  <div className="flex items-center gap-2">
                    <button onClick={handleCancelEditSop} disabled={isSubmitting || isUploadingFiles} className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-sm font-bold transition-colors">取消</button>
                    <button onClick={handleSaveWikiSop} disabled={isSubmitting || isUploadingFiles} className="px-5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold flex items-center gap-1.5 transition-colors shadow-lg disabled:opacity-60">
                      {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin"/> 儲存中...</> : <><Save className="w-4 h-4" /> 確認儲存</>}
                    </button>
                  </div>
                </>
              )}
            </div>
            
            <div className="flex-1 p-6 sm:p-8 overflow-y-auto text-gray-700 text-lg">
              {!isEditingSop ? (
                <>
                  {/* ★ 渲染帶有 Markdown 解析的內容 */}
                  {selectedSop.content ? renderMarkdownContent(selectedSop.content, searchTerm) : (!processImageUrl(selectedSop.attachmentUrl).isImage && <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">（此 SOP 暫無內文摘要，可能僅有附件或請點擊 Wiki 編輯補充）</div>)}
                  {selectedSop.attachmentUrl && processImageUrl(selectedSop.attachmentUrl).isImage && (
                    <div className="mt-10 border-t border-gray-100 pt-8">
                      <p className="text-sm font-bold text-gray-500 mb-5 flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100"><ImageIcon className="w-4 h-4 text-gray-400"/> 附件/圖片網址自動預覽</p>
                      <img src={processImageUrl(selectedSop.attachmentUrl).src} alt="SOP 圖片" className="w-full h-auto rounded-xl shadow-lg border border-gray-200" loading="lazy" />
                    </div>
                  )}
                </>
              ) : (
                <form className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">SOP 標題名稱</label>
                      <input type="text" name="title" value={editForm.title} onChange={handleFormChange} className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-300 outline-none font-bold text-gray-800" placeholder="請輸入精確的 SOP 標題" required />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">文件分類標籤</label>
                      <select name="category" value={editForm.category} onChange={handleFormChange} className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-300 outline-none bg-white font-medium" required>
                        <option value="" disabled>請選擇分類</option>
                        {categories.map((cat, idx) => <option key={idx} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    {/* ★ 內文上方加入「加入網址」按鈕 */}
                    <div className="flex flex-wrap items-center justify-between mb-1.5 gap-2">
                      <label className="block text-sm font-bold text-gray-700">
                          SOP 詳細內文摘要與編修
                      </label>
                      <div className="flex gap-2">
                        <button 
                          type="button"
                          onClick={() => {
                            const url = window.prompt("請貼上你要加入的網址 (例如：https://google.com)：");
                            if (url) {
                              const text = window.prompt("請輸入這個網址的顯示文字 (例如：點擊前往系統)：") || "連結";
                              setEditForm(prev => ({ ...prev, content: prev.content + ` [${text}](${url}) ` }));
                            }
                          }}
                          className="cursor-pointer px-3 py-1.5 rounded text-xs font-bold transition-colors flex items-center gap-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100"
                        >
                          <LinkIcon className="w-3 h-3" /> 加入網址
                        </button>
                        <label className={`cursor-pointer px-3 py-1.5 rounded text-xs font-bold transition-colors flex items-center gap-1.5 ${isUploadingFiles ? 'bg-gray-100 text-gray-400' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'}`}>
                            {isUploadingFiles ? <Loader2 className="w-3 h-3 animate-spin"/> : <Upload className="w-3 h-3"/>}
                            {isUploadingFiles ? '上傳中...' : '上傳檔案至內文'}
                            <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'content')} disabled={isUploadingFiles}/>
                        </label>
                      </div>
                    </div>
                    <textarea name="content" value={editForm.content} onChange={handleFormChange} rows="14" className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-300 outline-none font-mono text-sm leading-relaxed bg-gray-50 placeholder:text-gray-400" placeholder="請輸入 SOP 的詳細步驟、規範或補充資訊...\n(點擊右上角按鈕可直接上傳圖片檔案，或加入網址)"/>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-sm font-bold text-gray-700 flex items-center gap-2"><Paperclip className="w-4 h-4 text-gray-400"/> 附件連結 或 圖片網址 (選填)</label>
                      <label className={`cursor-pointer px-3 py-1.5 rounded text-xs font-bold transition-colors flex items-center gap-1.5 ${isUploadingFiles ? 'bg-gray-100 text-gray-400' : 'bg-orange-100 text-orange-700 hover:bg-orange-200'}`}>
                          {isUploadingFiles ? <Loader2 className="w-3 h-3 animate-spin"/> : <Upload className="w-3 h-3"/>}
                          {isUploadingFiles ? '上傳中...' : '直接上傳附件'}
                          <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'attachmentUrl')} disabled={isUploadingFiles}/>
                      </label>
                    </div>
                    <input type="url" name="attachmentUrl" value={editForm.attachmentUrl} onChange={handleFormChange} className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-300 outline-none text-sm text-gray-600 font-medium" placeholder="亦可手動貼上 Google Drive 分享連結、圖片網址、PDF 連結" />
                  </div>
                </form>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center flex-shrink-0">
                {!isEditingSop ? (
                    <>
                        <span className={`text-xs px-2.5 py-1 rounded font-bold ${getCategoryStyle(selectedSop.category)}`}>{selectedSop.category || '未分類'}</span>
                        <div className="flex gap-2.5">
                            {selectedSop.attachmentUrl && (
                                <a href={selectedSop.attachmentUrl} target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 bg-orange-50 border border-orange-200 text-orange-700 rounded-xl text-sm hover:bg-orange-100 transition-colors flex items-center gap-2 font-bold shadow-sm shadow-orange-100">
                                    {processImageUrl(selectedSop.attachmentUrl).isImage ? <ImageIcon className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />} 開啟 / 下載{processImageUrl(selectedSop.attachmentUrl).isImage ? '原圖' : '附件'}
                                </a>
                            )}
                            <button onClick={() => setSelectedSop(null)} className="px-5 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-xl text-sm font-bold transition-colors">關閉</button>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 text-center text-sm text-gray-500 font-medium bg-indigo-50/50 p-2 rounded-lg border border-indigo-100">
                        提示：可利用右上角按鈕快速上傳檔案或插入多個網址。
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
