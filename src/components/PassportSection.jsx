import React, { useState, useEffect, useCallback } from 'react';
import { 
  collection, doc, getDocs, onSnapshot, query, serverTimestamp, setDoc, where
} from 'firebase/firestore';
import { db } from '../firebase';
import { ExternalLink, Paperclip } from 'lucide-react';
import { getCategorySopIds, getTrainingGroupSopIds } from '../data/trainingSopLinks';
import { 
  CheckCircle2, AlertCircle, ChevronDown, ChevronLeft, ChevronRight, UserCheck,
  BookOpen, Calendar, Film, Loader2, PlayCircle, User, Save, X, List, FileText,
  Circle, Clock, ClipboardList, Activity, 
  GraduationCap, Layout, CheckSquare, ClipboardCheck, FileEdit, Stethoscope, 
  Award, HeartHandshake, Home, ArrowRight // [新] 引入關懷圖示
} from 'lucide-react';

// 引入子元件
import PreTrainingAssessment from './PreTrainingAssessment';
import EPAAssessment from './EPAAssessment';
import DOPSAssessment from './DOPSAssessment'; 
import MiniCEXAssessment from './MiniCEXAssessment';
import OSCEAssessment from './OSCEAssessment';
import KSAAssessment from './KSAAssessment';
import WrittenTestAssessment from './WrittenTestAssessment';
import FinalAssessment from './FinalAssessment';
import CareAssessment from './CareAssessment'; // [新] 引入關懷紀錄元件

// Google Apps Script API 網址
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbw3-nakNBi0t3W3_-XtQmztYqq9qAj0ZOaGpXKZG41eZfhYjNfIM5xuVXwzSLa1_X3hfA/exec"; 

const processSopImageUrl = (url) => {
  if (!url) return { isImage: false, src: '' };
  const lowerUrl = url.toLowerCase();
  const isStandardImage = lowerUrl.match(/\.(jpeg|jpg|gif|png|webp|bmp)($|\?)/)
    || (lowerUrl.includes('firebasestorage') && lowerUrl.includes('alt=media'));
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/)
    || url.match(/drive\.google\.com\/open\?id=([^&]+)/)
    || url.match(/drive\.google\.com\/uc\?.*id=([^&]+)/);
  const fileId = driveMatch?.[1];

  if (isStandardImage) return { isImage: true, src: url };
  if (fileId) {
    return {
      isImage: true,
      src: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`,
    };
  }
  return { isImage: false, src: url };
};

const renderSopContent = (text) => {
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
    const label = match[2];
    const url = match[3];
    const imageInfo = processSopImageUrl(url);
    parts.push(isImage
      ? { type: 'image', alt: label, url: imageInfo.isImage ? imageInfo.src : url }
      : { type: 'link', label: label || url, url });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.substring(lastIndex) });
  }

  return (
    <div className="whitespace-pre-wrap leading-relaxed text-gray-700">
      {parts.map((part, index) => {
        if (part.type === 'text') return <span key={index}>{part.content}</span>;
        if (part.type === 'image') {
          return (
            <figure key={index} className="my-5">
              <img src={part.url} alt={part.alt} className="max-w-full h-auto rounded-xl border border-gray-200 shadow-sm" loading="lazy" />
              {part.alt && <figcaption className="text-xs text-gray-500 text-center mt-2">{part.alt}</figcaption>}
            </figure>
          );
        }
        return (
          <a key={index} href={part.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 underline font-bold inline-flex items-center gap-1">
            {part.label}<ExternalLink className="w-3.5 h-3.5" />
          </a>
        );
      })}
    </div>
  );
};

const formatSopDate = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp.seconds ? timestamp.seconds * 1000 : timestamp);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('zh-TW');
};

const getSopVersion = (sop) => {
  const timestamp = sop?.updatedAt || sop?.createdAt;
  if (!timestamp) return 0;
  if (typeof timestamp.toMillis === 'function') return timestamp.toMillis();
  if (timestamp.seconds) return (timestamp.seconds * 1000) + Math.floor((timestamp.nanoseconds || 0) / 1000000);
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const getVideoEmbedUrl = (url) => {
  if (!url) return '';
  const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (youtubeMatch?.[1]) return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/)
    || url.match(/drive\.google\.com\/open\?id=([^&]+)/);
  if (driveMatch?.[1]) return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
  return '';
};

const getVideoSequence = (title) => {
  const match = (title || '').match(/[-－](\d{1,2})/);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
};

const compareVideos = (a, b) => getVideoSequence(a.title) - getVideoSequence(b.title)
  || (a.title || '').localeCompare(b.title || '', 'zh-Hant', { numeric: true });

const PassportSection = ({ user, userRole, userProfile }) => {
  const [students, setStudents] = useState([]);
  const isTeacherOrAdmin = ['teacher', 'admin'].includes(userRole);
  
  const [selectedStudentEmail, setSelectedStudentEmail] = useState(isTeacherOrAdmin ? '' : user?.email);
  const [selectedStudentName, setSelectedStudentName] = useState(user?.displayName);
  const [selectedStudentDate, setSelectedStudentDate] = useState('');

  // 導航狀態: todo(待辦事項), records(訓練紀錄), assessment(學習評估), outcome(學習成果)
  const [activeMainTab, setActiveMainTab] = useState('todo');
  const [assessmentType, setAssessmentType] = useState('pre_training'); 

  // 追蹤已經載入過的標籤 (達成秒切換)
  const [mountedTabs, setMountedTabs] = useState(['pre_training']);

  const [passportData, setPassportData] = useState({ items: [], records: {}, periods: {} });
  const [editPeriods, setEditPeriods] = useState({}); 
  const [loading, setLoading] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [showAllTrainingItems, setShowAllTrainingItems] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentEval, setCurrentEval] = useState({ itemId: '', itemName: '', status: 'pass', date: '', note: '' });
  const [submitting, setSubmitting] = useState(false);
  const [savingPeriod, setSavingPeriod] = useState(null);
  const [sopsById, setSopsById] = useState({});
  const [sopsLoaded, setSopsLoaded] = useState(false);
  const [sopLoading, setSopLoading] = useState(false);
  const [sopError, setSopError] = useState('');
  const [selectedSopIds, setSelectedSopIds] = useState([]);
  const [activeSopId, setActiveSopId] = useState('');
  const [isSopModalOpen, setIsSopModalOpen] = useState(false);
  const [configuredLinksByTargetId, setConfiguredLinksByTargetId] = useState({});
  const [sopReadReceipts, setSopReadReceipts] = useState({});
  const [savingReadReceipt, setSavingReadReceipt] = useState(false);
  const [videosById, setVideosById] = useState({});
  const [videosLoaded, setVideosLoaded] = useState(false);
  const [selectedVideoIds, setSelectedVideoIds] = useState([]);
  const [activeVideoId, setActiveVideoId] = useState('');
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  // 初始化學員名單
  useEffect(() => {
    if (isTeacherOrAdmin) {
      const fetchStudents = async () => {
        try {
          const q = query(collection(db, 'users'), where('role', '==', 'student'));
          const snap = await getDocs(q);
          const list = snap.docs.map(d => d.data());
          setStudents(list);

          if (list.length > 0) {
            const isCurrentEmailValid = list.some(s => s.email === selectedStudentEmail);
            if (!selectedStudentEmail || !isCurrentEmailValid) {
              setSelectedStudentEmail(list[0].email);
            }
          }
        } catch (error) {
          console.error("讀取學生名單失敗:", error);
        }
      };
      fetchStudents();
    }
  }, [userRole]);

  // 同步學員資訊
  useEffect(() => {
    if (isTeacherOrAdmin) {
      if (students.length > 0 && selectedStudentEmail) {
        const s = students.find(stud => stud.email === selectedStudentEmail);
        if (s) {
          setSelectedStudentName(s.displayName || s.email);
          setSelectedStudentDate(s.arrivalDate || '');
        }
      }
    } else {
      setSelectedStudentName(userProfile?.displayName || user.displayName);
      setSelectedStudentDate(userProfile?.arrivalDate || '');
    }
  }, [selectedStudentEmail, students, userRole, userProfile, user]);

  // 當切換學員時，重置已載入的標籤
  useEffect(() => {
    setMountedTabs([assessmentType]);
    setShowAllTrainingItems(false);
    setExpandedGroups({});
  }, [selectedStudentEmail]);

  // 讀取護照資料
  useEffect(() => {
    if (selectedStudentEmail && ['todo', 'records'].includes(activeMainTab)) {
      fetchPassportData(selectedStudentEmail);
    }
  }, [selectedStudentEmail, activeMainTab]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'training_sop_links'), snapshot => {
      const nextLinks = {};
      snapshot.forEach(linkDoc => {
        nextLinks[linkDoc.id] = { id: linkDoc.id, ...linkDoc.data() };
      });
      setConfiguredLinksByTargetId(nextLinks);
    }, error => console.error('讀取訓練 SOP 連結失敗：', error));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'training_videos'), snapshot => {
      const nextVideos = {};
      snapshot.forEach(videoDoc => {
        nextVideos[videoDoc.id] = { id: videoDoc.id, ...videoDoc.data() };
      });
      setVideosById(nextVideos);
      setVideosLoaded(true);
    }, error => {
      console.error('讀取相關教學影片失敗：', error);
      setVideosLoaded(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedStudentEmail) {
      setSopReadReceipts({});
      return undefined;
    }
    const receiptsQuery = query(
      collection(db, 'sop_read_receipts'),
      where('studentEmail', '==', selectedStudentEmail)
    );
    const unsubscribe = onSnapshot(receiptsQuery, snapshot => {
      const nextReceipts = {};
      snapshot.forEach(receiptDoc => {
        const receipt = { id: receiptDoc.id, ...receiptDoc.data() };
        nextReceipts[receipt.sopId] = receipt;
      });
      setSopReadReceipts(nextReceipts);
    }, error => console.error('讀取 SOP 閱讀紀錄失敗：', error));
    return () => unsubscribe();
  }, [selectedStudentEmail]);

  const fetchPassportData = async (email) => {
    setErrorMsg(null);
    if (!email) return;

    setLoading(true);
    try {
      const response = await fetch(`${GAS_API_URL}?type=getData&studentEmail=${email}`);
      const data = await response.json();
      if (data.status === 'error') throw new Error(data.message);

      setPassportData(data);
      setEditPeriods(data.periods || {});

      if (data.items && data.items.length > 0) {
        const firstCat = data.items[0].category_id;
        if (Object.keys(expandedGroups).length === 0) {
            setExpandedGroups(prev => ({ ...prev, [firstCat]: true }));
        }
      }
    } catch (error) {
      console.error("讀取失敗:", error);
      setErrorMsg("無法讀取護照資料，請確認網路或權限設定。");
    }
    setLoading(false);
  };

  const openEvaluateModal = (item) => {
    if (!isTeacherOrAdmin) return;
    const today = new Date().toISOString().split('T')[0];
    setCurrentEval({ itemId: item.id, itemName: item.sub_item || item.title, status: 'pass', date: today, note: '' });
    setIsModalOpen(true);
  };

  const handleSubmitEval = async () => {
    setSubmitting(true);
    const teacherDisplayName = userProfile?.displayName || user.displayName || user.email.split('@')[0];
    try {
      await fetch(GAS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          type: 'saveEval', studentEmail: selectedStudentEmail, itemId: currentEval.itemId,
          status: currentEval.status, assessDate: currentEval.date, teacherName: teacherDisplayName, note: currentEval.note
        })
      });
      await fetchPassportData(selectedStudentEmail);
      setIsModalOpen(false);
      alert("評核已儲存！");
    } catch (error) {
      alert("儲存失敗");
    }
    setSubmitting(false);
  };

  const handlePeriodChange = (catId, field, value) => {
    setEditPeriods(prev => ({ ...prev, [catId]: { ...prev[catId], [field]: value } }));
  };

  const handleSavePeriod = async (catId) => {
    setSavingPeriod(catId);
    const periodData = editPeriods[catId];
    try {
      await fetch(GAS_API_URL, {
        method: 'POST',
        body: JSON.stringify({
          type: 'savePeriod', studentEmail: selectedStudentEmail, categoryId: catId,
          startDate: periodData?.startDate || '', endDate: periodData?.endDate || '', updatedBy: userProfile?.displayName || user.displayName
        })
      });
      await fetchPassportData(selectedStudentEmail);
    } catch (error) {
      alert("日期儲存失敗");
    }
    setSavingPeriod(null);
  };

  const toggleGroup = (groupId, defaultExpanded = false) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !(prev[groupId] ?? defaultExpanded),
    }));
  };

  const loadSops = useCallback(async () => {
    if (sopsLoaded || sopLoading) return;
    setSopLoading(true);
    setSopError('');
    try {
      const snapshot = await getDocs(collection(db, 'sop_articles'));
      const nextSops = {};
      snapshot.forEach(sopDoc => {
        nextSops[sopDoc.id] = { id: sopDoc.id, ...sopDoc.data() };
      });
      setSopsById(nextSops);
      setSopsLoaded(true);
    } catch (error) {
      console.error('讀取相關 SOP 失敗：', error);
      setSopError('無法讀取相關 SOP，請稍後再試。');
    } finally {
      setSopLoading(false);
    }
  }, [sopsLoaded, sopLoading]);

  useEffect(() => {
    if (activeMainTab === 'records' && selectedStudentEmail) {
      loadSops();
    }
  }, [activeMainTab, selectedStudentEmail, loadSops]);

  const openRelatedSops = async (sopIds) => {
    if (sopIds.length === 0) return;
    setSelectedSopIds(sopIds);
    setActiveSopId(sopIds[0]);
    setIsSopModalOpen(true);
    await loadSops();
  };

  const openRelatedVideos = (videoIds) => {
    const availableVideoIds = videoIds.filter(videoId => videosById[videoId]);
    if (availableVideoIds.length === 0) return;
    setSelectedVideoIds(availableVideoIds);
    setActiveVideoId(availableVideoIds[0]);
    setIsVideoModalOpen(true);
  };

  const activeSopIndex = selectedSopIds.indexOf(activeSopId);
  const selectRelativeSop = (offset) => {
    const nextIndex = activeSopIndex + offset;
    if (nextIndex >= 0 && nextIndex < selectedSopIds.length) {
      setActiveSopId(selectedSopIds[nextIndex]);
    }
  };

  const activeVideoIndex = selectedVideoIds.indexOf(activeVideoId);
  const selectRelativeVideo = (offset) => {
    const nextIndex = activeVideoIndex + offset;
    if (nextIndex >= 0 && nextIndex < selectedVideoIds.length) {
      setActiveVideoId(selectedVideoIds[nextIndex]);
    }
  };

  const handleAssessmentTabClick = (tab) => {
    setAssessmentType(tab);
    if (!mountedTabs.includes(tab)) {
      setMountedTabs(prev => [...prev, tab]);
    }
  };

  const groupedItems = (passportData.items || []).reduce((acc, item) => {
    if (!acc[item.category_id]) acc[item.category_id] = { id: item.category_id, title: item.category_name, items: [] };
    acc[item.category_id].items.push(item);
    return acc;
  }, {});

  const trainingGroups = Object.values(groupedItems);
  const isPendingTrainingItem = (item) => passportData.records[item.id]?.status !== 'pass';
  const pendingTrainingCount = (passportData.items || []).filter(isPendingTrainingItem).length;
  const completedTrainingCount = Math.max((passportData.items || []).length - pendingTrainingCount, 0);
  const trainingProgress = passportData.items?.length
    ? Math.round((completedTrainingCount / passportData.items.length) * 100)
    : 0;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const getDaysUntil = (dateString) => {
    if (!dateString) return null;
    const deadline = new Date(`${dateString}T00:00:00`);
    if (Number.isNaN(deadline.getTime())) return null;
    return Math.ceil((deadline.getTime() - todayStart.getTime()) / MS_PER_DAY);
  };
  const todoItems = (passportData.items || [])
    .filter(isPendingTrainingItem)
    .map(item => {
      const record = passportData.records[item.id] || {};
      const endDate = passportData.periods[item.category_id]?.endDate || '';
      const daysUntilDue = getDaysUntil(endDate);
      const urgency = record.status === 'improve'
        ? 0
        : daysUntilDue !== null && daysUntilDue < 0
          ? 1
          : daysUntilDue !== null && daysUntilDue <= 14
            ? 2
            : 3;
      return { ...item, record, endDate, daysUntilDue, urgency };
    })
    .sort((a, b) => a.urgency - b.urgency
      || (a.daysUntilDue ?? Number.MAX_SAFE_INTEGER) - (b.daysUntilDue ?? Number.MAX_SAFE_INTEGER)
      || String(a.category_name || '').localeCompare(String(b.category_name || ''), 'zh-Hant')
      || String(a.sub_item || a.title || '').localeCompare(String(b.sub_item || b.title || ''), 'zh-Hant'));
  const improveTrainingCount = todoItems.filter(item => item.record.status === 'improve').length;
  const overdueTrainingCount = todoItems.filter(item => item.daysUntilDue !== null && item.daysUntilDue < 0).length;
  const dueSoonTrainingCount = todoItems.filter(item => item.daysUntilDue !== null && item.daysUntilDue >= 0 && item.daysUntilDue <= 14).length;
  const todoPreviewItems = todoItems.slice(0, 8);
  const visibleTrainingGroups = showAllTrainingItems
    ? trainingGroups
    : trainingGroups
      .map(group => ({ ...group, items: group.items.filter(isPendingTrainingItem) }))
      .filter(group => group.items.length > 0);

  const toggleTrainingRecordView = () => {
    if (showAllTrainingItems) {
      setShowAllTrainingItems(false);
      return;
    }

    setShowAllTrainingItems(true);
    setExpandedGroups(Object.fromEntries(trainingGroups.map(group => [group.id, true])));
  };

  const openTrainingRecord = (item) => {
    setShowAllTrainingItems(false);
    setExpandedGroups(prev => ({ ...prev, [item.category_id]: true }));
    setActiveMainTab('records');
  };

  const getTodoPresentation = (item) => {
    if (item.record.status === 'improve') {
      return {
        label: '需再加強',
        detail: item.record.note || '請依教師回饋完成補強後再次評核。',
        badgeClass: 'bg-orange-100 text-orange-700',
        borderClass: 'border-orange-200',
      };
    }
    if (item.daysUntilDue !== null && item.daysUntilDue < 0) {
      return {
        label: '已逾期',
        detail: `原訂 ${item.endDate} 前完成，已逾期 ${Math.abs(item.daysUntilDue)} 天。`,
        badgeClass: 'bg-red-100 text-red-700',
        borderClass: 'border-red-200',
      };
    }
    if (item.daysUntilDue !== null && item.daysUntilDue <= 14) {
      return {
        label: item.daysUntilDue === 0 ? '今日到期' : '即將到期',
        detail: item.daysUntilDue === 0
          ? '預定今天完成。'
          : `預定 ${item.endDate} 前完成，剩餘 ${item.daysUntilDue} 天。`,
        badgeClass: 'bg-amber-100 text-amber-700',
        borderClass: 'border-amber-200',
      };
    }
    return {
      label: isTeacherOrAdmin ? '待教師評核' : '訓練尚未評核',
      detail: item.endDate ? `預定 ${item.endDate} 前完成。` : '尚未設定完成期限。',
      badgeClass: 'bg-gray-100 text-gray-600',
      borderClass: 'border-gray-200',
    };
  };

  const resolveTrainingSopIds = (targetId, fallbackSopIds) => {
    const configuredLink = configuredLinksByTargetId[targetId];
    return configuredLink ? (configuredLink.sopIds || []) : fallbackSopIds;
  };

  const resolveTrainingVideoIds = (targetId) => Object.values(videosById)
    .filter(video => (video.trainingItemIds || []).includes(targetId))
    .sort(compareVideos)
    .map(video => video.id);

  const getSopReadState = (sopId) => {
    const receipt = sopReadReceipts[sopId];
    if (!receipt) return 'unread';
    return Number(receipt.sopVersion || 0) < getSopVersion(sopsById[sopId]) ? 'updated' : 'read';
  };

  const getSopGroupReadState = (sopIds) => {
    if (!sopIds.length) return 'none';
    const states = sopIds.map(getSopReadState);
    if (states.includes('updated')) return 'updated';
    if (states.every(state => state === 'read')) return 'read';
    return 'unread';
  };

  const renderReadStatus = (sopIds) => {
    const state = getSopGroupReadState(sopIds);
    if (state === 'read') return <span className="text-[11px] font-bold text-green-700 bg-green-100 px-2 py-1 rounded-full">已閱讀</span>;
    if (state === 'updated') return <span className="text-[11px] font-bold text-orange-700 bg-orange-100 px-2 py-1 rounded-full">SOP 更新後需重新確認</span>;
    if (state === 'unread') return null;
    return null;
  };

  const confirmActiveSopRead = async () => {
    const activeSop = sopsById[activeSopId];
    if (!activeSop || userRole !== 'student' || user?.email !== selectedStudentEmail) return;
    setSavingReadReceipt(true);
    try {
      const receiptId = `${encodeURIComponent(user.email)}__${activeSopId}`;
      await setDoc(doc(db, 'sop_read_receipts', receiptId), {
        studentEmail: user.email,
        studentName: selectedStudentName || user.displayName || user.email,
        studentUid: user.uid,
        sopId: activeSopId,
        sopTitleSnapshot: activeSop.title || '',
        sopVersion: getSopVersion(activeSop),
        confirmedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('儲存 SOP 閱讀確認失敗：', error);
      alert(`閱讀確認儲存失敗：${error.message}`);
    } finally {
      setSavingReadReceipt(false);
    }
  };

  const renderItemRow = (item, isMainItem = false) => {
    const record = passportData.records[item.id] || {};
    const status = record.status; 
    const relatedSopIds = isMainItem
      ? resolveTrainingSopIds(item.id, getTrainingGroupSopIds(item.title, [item], sopsById))
      : [];
    const relatedVideoIds = isMainItem ? resolveTrainingVideoIds(item.id) : [];
    return (
      <div key={item.id} className={`p-3 pl-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-gray-50 border-b border-gray-50 last:border-0 ${isMainItem ? 'bg-white' : ''}`}>
        <div className="flex-1">
          <p className={`text-sm flex items-start gap-2 ${isMainItem ? 'font-bold text-gray-700' : 'font-medium text-gray-800'}`}>
            <span className="mt-1">{isMainItem ? <FileText className="w-4 h-4 text-gray-500" /> : <Circle className="w-2 h-2 text-gray-300 fill-gray-300 mt-1" />}</span>
            {item.sub_item || item.title}
          </p>
          {record.teacher && (
            <p className="text-xs text-green-600 mt-1 ml-6 flex items-center gap-1">
              <UserCheck className="w-3 h-3" /> {record.teacher} ({new Date(record.date).toLocaleDateString()})
              {record.note && <span className="text-gray-400"> - {record.note}</span>}
            </p>
          )}
          {isMainItem && (relatedSopIds.length > 0 || relatedVideoIds.length > 0 || sopsLoaded) ? (
            <div className="mt-2 ml-6 flex flex-wrap items-center gap-2">
              {relatedSopIds.length > 0 ? (
                <>
                  <button
                    type="button"
                    data-training-item-id={item.id}
                    onClick={() => openRelatedSops(relatedSopIds)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100 text-xs font-bold transition-colors"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    相關 SOP
                    <span className="bg-white/80 px-1.5 rounded-full">{relatedSopIds.length}</span>
                  </button>
                  {renderReadStatus(relatedSopIds)}
                </>
              ) : (
                <span className="text-xs font-bold text-gray-400">尚無相關 SOP</span>
              )}
              {videosLoaded && relatedVideoIds.length > 0 && (
                <button
                  type="button"
                  data-training-video-item-id={item.id}
                  onClick={() => openRelatedVideos(relatedVideoIds)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-100 text-xs font-bold transition-colors"
                >
                  <PlayCircle className="w-3.5 h-3.5" />
                  相關影片
                  <span className="bg-white/80 px-1.5 rounded-full">{relatedVideoIds.length}</span>
                </button>
              )}
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-2 ml-6 sm:ml-0">
          {status === 'pass' && <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> 教師評核通過</span>}
          {status === 'improve' && <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3" /> 需再加強</span>}
          {!status && <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-xs font-bold">訓練尚未評核</span>}
          {isTeacherOrAdmin && (
            <button onClick={() => openEvaluateModal(item)} className="px-3 py-1 border border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-md text-xs font-bold transition-colors">
              {status ? '重評' : '評核'}
            </button>
          )}
        </div>
      </div>
    );
  };

  const getSecondLevelSopIds = (items) => {
    const itemGroups = {};
    items.forEach(item => {
      if (!itemGroups[item.title]) itemGroups[item.title] = [];
      itemGroups[item.title].push(item);
    });

    return [...new Set(Object.entries(itemGroups).flatMap(([mainTitle, subItems]) =>
      resolveTrainingSopIds(
        subItems[0].id,
        getTrainingGroupSopIds(mainTitle, subItems, sopsById)
      )
    ))];
  };

  const renderGroupContent = (items) => {
    const groups = {};
    const groupOrder = []; 
    items.forEach(item => {
      if (!groups[item.title]) { groups[item.title] = []; groupOrder.push(item.title); }
      groups[item.title].push(item);
    });
    return groupOrder.map((mainTitle, idx) => {
      const subItems = groups[mainTitle];
      const isGroup = subItems.length > 1 || (subItems[0] && subItems[0].sub_item);
      const groupSopIds = isGroup
        ? resolveTrainingSopIds(
            subItems[0].id,
            getTrainingGroupSopIds(mainTitle, subItems, sopsById)
          )
        : [];
      const groupVideoIds = isGroup ? resolveTrainingVideoIds(subItems[0].id) : [];
      return (
        <div key={idx} className="mb-4 last:mb-0 border border-gray-100 rounded-lg overflow-hidden shadow-sm">
          {isGroup && (
            <div className="bg-gray-100 px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="font-bold text-gray-700 text-sm flex items-center gap-2">
                <List className="w-4 h-4 text-gray-500" />
                {mainTitle}
              </div>
              {groupSopIds.length > 0 || groupVideoIds.length > 0 ? (
                <div className="self-start sm:self-auto flex flex-wrap items-center gap-2">
                  {groupSopIds.length > 0 ? (
                    <>
                      <button
                        type="button"
                        data-training-group-title={mainTitle}
                        onClick={() => openRelatedSops(groupSopIds)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100 text-xs font-bold transition-colors"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        相關 SOP
                        <span className="bg-white/80 px-1.5 rounded-full">{groupSopIds.length}</span>
                      </button>
                      {renderReadStatus(groupSopIds)}
                    </>
                  ) : (
                    <span className="text-xs font-bold text-gray-400">尚無相關 SOP</span>
                  )}
                  {videosLoaded && groupVideoIds.length > 0 && (
                    <button
                      type="button"
                      data-training-video-group-title={mainTitle}
                      onClick={() => openRelatedVideos(groupVideoIds)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-100 text-xs font-bold transition-colors"
                    >
                      <PlayCircle className="w-3.5 h-3.5" />
                      相關影片
                      <span className="bg-white/80 px-1.5 rounded-full">{groupVideoIds.length}</span>
                    </button>
                  )}
                </div>
              ) : sopsLoaded ? (
                <span className="self-start sm:self-auto text-xs font-bold text-gray-400">尚無相關 SOP</span>
              ) : null}
            </div>
          )}
          <div className="bg-white">{subItems.map(item => renderItemRow(item, !isGroup))}</div>
        </div>
      );
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 md:p-6 md:rounded-xl shadow-sm border border-gray-100">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-lg">
               <BookOpen className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-bold text-gray-800">新進人員學習護照</h2>
                <a 
                  href="https://drive.google.com/file/d/109SPzerKxndTUQXibbbn0cZE2P8FWvzJ/view?usp=drive_link"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 rounded-lg text-xs font-bold transition-colors shadow-sm"
                >
                  <FileText className="w-3.5 h-3.5" /> 二年期藥師訓練計畫
                </a>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {isTeacherOrAdmin ? '請選擇學員以檢視紀錄或評估' : '您的學習進度總覽'}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 items-end">
            {isTeacherOrAdmin ? (
              <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                <User className="w-4 h-4 text-gray-400" />
                <select 
                  value={selectedStudentEmail}
                  onChange={(e) => setSelectedStudentEmail(e.target.value)} 
                  className="bg-transparent text-sm font-bold text-gray-700 outline-none min-w-[150px]"
                >
                  {students.length > 0 ? (
                    students.map(s => <option key={s.email} value={s.email}>{s.displayName || s.email}</option>)
                  ) : <option disabled>載入中...</option>}
                </select>
              </div>
            ) : (
              <div className="px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-bold flex items-center gap-2">
                <User className="w-4 h-4" /> 學員：{selectedStudentName}
              </div>
            )}
            {selectedStudentDate && (
              <div className="px-4 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" /> 到職：{selectedStudentDate}
              </div>
            )}
          </div>
        </div>

        {/* 主選單 */}
        <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveMainTab('todo')}
            className={`flex-1 py-3 text-center font-bold text-sm sm:text-base flex items-center justify-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              activeMainTab === 'todo'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                : 'border-transparent text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Home className="w-5 h-5" /> 待辦事項
          </button>
          <button
            onClick={() => setActiveMainTab('records')}
            className={`flex-1 py-3 text-center font-bold text-sm sm:text-base flex items-center justify-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              activeMainTab === 'records' 
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' 
                : 'border-transparent text-gray-500 hover:bg-gray-50'
            }`}
          >
            <ClipboardList className="w-5 h-5" /> 訓練紀錄
          </button>
          <button
            onClick={() => setActiveMainTab('assessment')}
            className={`flex-1 py-3 text-center font-bold text-sm sm:text-base flex items-center justify-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              activeMainTab === 'assessment' 
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' 
                : 'border-transparent text-gray-500 hover:bg-gray-50'
            }`}
          >
            <GraduationCap className="w-5 h-5" /> 學習評估
          </button>
          <button
            onClick={() => setActiveMainTab('outcome')}
            className={`flex-1 py-3 text-center font-bold text-sm sm:text-base flex items-center justify-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
              activeMainTab === 'outcome' 
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' 
                : 'border-transparent text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Award className="w-5 h-5" /> 學習成果
          </button>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded text-red-700 text-sm font-bold flex items-center gap-2">
            <AlertCircle className="w-5 h-5" /> {errorMsg}
          </div>
        )}

        {/* 1. 待辦事項 */}
        {activeMainTab === 'todo' && (
          <div className="space-y-5 animate-in fade-in">
            {loading ? (
              <div className="text-center py-12 text-gray-400 flex flex-col items-center">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <p>正在整理學習待辦...</p>
              </div>
            ) : passportData.items?.length > 0 ? (
              <>
                <section className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white p-5 sm:p-6 shadow-lg shadow-indigo-100">
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
                    <div>
                      <p className="text-indigo-100 text-sm font-bold mb-1">
                        {isTeacherOrAdmin ? `${selectedStudentName || '學員'}的學習進度` : `${selectedStudentName || '您好'}，今天從這裡開始`}
                      </p>
                      <h3 className="text-2xl font-black">
                        {pendingTrainingCount > 0 ? `目前有 ${pendingTrainingCount} 項訓練待完成` : '所有訓練項目皆已完成'}
                      </h3>
                      <p className="text-sm text-indigo-100 mt-2">
                        已完成 {completedTrainingCount}／{passportData.items.length} 項，教材閱讀與教師評核分開記錄。
                      </p>
                    </div>
                    <div className="shrink-0 bg-white/15 border border-white/20 rounded-2xl px-5 py-3 text-center backdrop-blur-sm">
                      <p className="text-3xl font-black">{trainingProgress}%</p>
                      <p className="text-xs text-indigo-100">訓練完成率</p>
                    </div>
                  </div>
                  <div className="h-2.5 bg-white/20 rounded-full overflow-hidden mt-5">
                    <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${trainingProgress}%` }} />
                  </div>
                </section>

                <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <p className="text-xs font-bold text-gray-500">尚未評核</p>
                    <p className="text-2xl font-black text-gray-800 mt-1">{todoItems.filter(item => !item.record.status).length}</p>
                  </div>
                  <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                    <p className="text-xs font-bold text-orange-700">需再加強</p>
                    <p className="text-2xl font-black text-orange-800 mt-1">{improveTrainingCount}</p>
                  </div>
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                    <p className="text-xs font-bold text-red-700">已逾期</p>
                    <p className="text-2xl font-black text-red-800 mt-1">{overdueTrainingCount}</p>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-xs font-bold text-amber-700">14 天內到期</p>
                    <p className="text-2xl font-black text-amber-800 mt-1">{dueSoonTrainingCount}</p>
                  </div>
                </section>

                <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                  <div className="px-4 sm:px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="font-black text-gray-800 flex items-center gap-2">
                        <ClipboardCheck className="w-5 h-5 text-indigo-600" /> 優先待辦
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">依需再加強、逾期及到期日自動排序。</p>
                    </div>
                    {todoItems.length > todoPreviewItems.length && (
                      <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full">
                        顯示前 {todoPreviewItems.length} 項
                      </span>
                    )}
                  </div>

                  {todoPreviewItems.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                      {todoPreviewItems.map(item => {
                        const presentation = getTodoPresentation(item);
                        return (
                          <article key={item.id} className={`p-4 sm:p-5 border-l-4 ${presentation.borderClass}`}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                  <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${presentation.badgeClass}`}>
                                    {presentation.label}
                                  </span>
                                  <span className="text-xs text-gray-500">{item.category_name}</span>
                                </div>
                                <h4 className="font-bold text-gray-800 leading-snug">{item.sub_item || item.title}</h4>
                                {item.sub_item && <p className="text-xs text-gray-500 mt-1">{item.title}</p>}
                                <p className="text-xs text-gray-600 mt-2">{presentation.detail}</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {isTeacherOrAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => openEvaluateModal(item)}
                                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-xs font-bold transition-colors"
                                  >
                                    <UserCheck className="w-4 h-4" /> {item.record.status ? '重新評核' : '立即評核'}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => openTrainingRecord(item)}
                                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-bold transition-colors"
                                >
                                  查看訓練 <ArrowRight className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-green-700 bg-green-50">
                      <CheckCircle2 className="w-10 h-10 mx-auto mb-2" />
                      <p className="font-black">目前沒有待辦項目</p>
                      <p className="text-xs mt-1">所有訓練項目均已由教師評核通過。</p>
                    </div>
                  )}

                  {todoItems.length > 0 && (
                    <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
                      <button
                        type="button"
                        onClick={() => setActiveMainTab('records')}
                        className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-700 hover:text-indigo-900"
                      >
                        查看全部 {todoItems.length} 項待辦 <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </section>
              </>
            ) : (
              <div className="text-center py-10 text-gray-400 border border-dashed rounded-lg bg-gray-50">
                目前護照內容是空的
              </div>
            )}
          </div>
        )}

        {/* 2. 訓練紀錄 */}
        {activeMainTab === 'records' && (
          <div className="space-y-4 animate-in fade-in">
            {loading ? (
              <div className="text-center py-12 text-gray-400 flex flex-col items-center">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <p>正在同步雲端護照資料...</p>
              </div>
            ) : (
              trainingGroups.length > 0 ? (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                    <div>
                      <p className="text-sm font-bold text-indigo-800">
                        {showAllTrainingItems ? '完整訓練紀錄' : '待評核與未通過項目'}
                      </p>
                      <p className="text-xs text-indigo-600 mt-0.5">
                        尚有 {pendingTrainingCount} 項待完成，共 {passportData.items.length} 項訓練。
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={toggleTrainingRecordView}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white text-indigo-700 hover:bg-indigo-100 border border-indigo-200 text-sm font-bold transition-colors shadow-sm"
                    >
                      {showAllTrainingItems ? <CheckCircle2 className="w-4 h-4" /> : <List className="w-4 h-4" />}
                      {showAllTrainingItems ? '只看待評核' : '全部展開'}
                    </button>
                  </div>

                  {visibleTrainingGroups.length > 0 ? visibleTrainingGroups.map((group) => {
                  const completeGroup = groupedItems[group.id];
                  const isExpanded = expandedGroups[group.id] ?? !showAllTrainingItems;
                  const progress = completeGroup.items.length > 0 ? Math.round((completeGroup.items.filter(item => passportData.records[item.id]?.status === 'pass').length / completeGroup.items.length) * 100) : 0;
                  const serverPeriod = passportData.periods[group.id] || {};
                  const editPeriod = editPeriods[group.id] || serverPeriod;
                  const isSaving = savingPeriod === group.id;
                  const hasChanged = editPeriod.startDate !== serverPeriod.startDate || editPeriod.endDate !== serverPeriod.endDate;
                  const secondLevelSopIds = new Set(getSecondLevelSopIds(completeGroup.items));
                  const categorySopIds = getCategorySopIds(group.id, sopsById)
                    .filter(sopId => !secondLevelSopIds.has(sopId));

                  return (
                    <div key={group.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                      <div className="p-4 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <button onClick={() => toggleGroup(group.id, !showAllTrainingItems)} className="flex items-center gap-3 hover:text-indigo-600 transition-colors text-left flex-1">
                          {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                          <div>
                            <span className="font-bold text-gray-700 block sm:inline">{group.title}</span>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${progress === 100 ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>{progress}%</span>
                        </button>
                        
                        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                          {categorySopIds.length > 0 && (
                            <button
                              type="button"
                              data-training-category-id={group.id}
                              onClick={() => openRelatedSops(categorySopIds)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100 text-xs font-bold transition-colors"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              分類 SOP
                              <span className="bg-white/80 px-1.5 rounded-full">{categorySopIds.length}</span>
                            </button>
                          )}
                          <div className="flex items-center gap-2 text-xs sm:text-sm bg-white p-1.5 rounded-lg border border-gray-200 shadow-sm">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            {isTeacherOrAdmin ? (
                                <>
                                  <input type="date" className="bg-transparent w-24 sm:w-auto outline-none" value={editPeriod.startDate || ''} onChange={(e) => handlePeriodChange(group.id, 'startDate', e.target.value)} />
                                  <span className="text-gray-300">➜</span>
                                  <input type="date" className="bg-transparent w-24 sm:w-auto outline-none" value={editPeriod.endDate || ''} onChange={(e) => handlePeriodChange(group.id, 'endDate', e.target.value)} />
                                  {(hasChanged || isSaving) && <button onClick={() => handleSavePeriod(group.id)} disabled={isSaving} className="ml-1 p-1 rounded-full bg-indigo-100 text-indigo-600">{isSaving ? <Loader2 className="w-3 h-3 animate-spin"/> : <Save className="w-3 h-3"/>}</button>}
                                </>
                            ) : (
                                <span>{serverPeriod.startDate || '--'} ➜ {serverPeriod.endDate || '--'}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {isExpanded && <div className="bg-white p-3 border-t border-gray-100">{renderGroupContent(group.items)}</div>}
                    </div>
                  );
                  }) : (
                    <div className="text-center py-10 text-green-700 border border-dashed border-green-200 rounded-lg bg-green-50">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2" />
                      <p className="font-bold">目前沒有待評核或未通過的項目</p>
                      <p className="text-xs mt-1">可按「全部展開」查看完整訓練紀錄。</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-gray-400 border border-dashed rounded-lg bg-gray-50">📋 目前護照內容是空的</div>
              )
            )}
          </div>
        )}

        {/* 2. 學習評估 */}
        {activeMainTab === 'assessment' && (
          <div className="animate-in fade-in duration-300">
            {/* 子選單 - ★ 加入關懷紀錄 */}
            <div className="mb-6 overflow-x-auto pb-2 scrollbar-hide">
              <div className="flex items-center gap-3">
                <button onClick={() => handleAssessmentTabClick('pre_training')} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all border whitespace-nowrap ${assessmentType === 'pre_training' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                  <Layout className="w-4 h-4" /> 學前評估
                </button>
                <button onClick={() => handleAssessmentTabClick('epa')} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all border whitespace-nowrap ${assessmentType === 'epa' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                  <Activity className="w-4 h-4" /> EPA 評估
                </button>
                <button onClick={() => handleAssessmentTabClick('dops')} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all border whitespace-nowrap ${assessmentType === 'dops' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                  <CheckSquare className="w-4 h-4" /> DOPS 評估
                </button>
                <button onClick={() => handleAssessmentTabClick('minicex')} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all border whitespace-nowrap ${assessmentType === 'minicex' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                  <Stethoscope className="w-4 h-4" /> Mini-CEX
                </button>
                <button onClick={() => handleAssessmentTabClick('osce')} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all border whitespace-nowrap ${assessmentType === 'osce' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                  <ClipboardList className="w-4 h-4" /> OSCE 評估
                </button>
                <button onClick={() => handleAssessmentTabClick('ksa')} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all border whitespace-nowrap ${assessmentType === 'ksa' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                  <ClipboardCheck className="w-4 h-4" /> KSA 評估
                </button>
                <button onClick={() => handleAssessmentTabClick('written_test')} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all border whitespace-nowrap ${assessmentType === 'written_test' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                  <FileEdit className="w-4 h-4" /> 筆試測驗
                </button>
                {/* ★ [新增] 關懷紀錄按鈕 */}
                <button onClick={() => handleAssessmentTabClick('care')} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all border whitespace-nowrap ${assessmentType === 'care' ? 'bg-pink-600 text-white border-pink-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-pink-50 hover:text-pink-600 hover:border-pink-200'}`}>
                  <HeartHandshake className="w-4 h-4" /> 關懷紀錄
                </button>
              </div>
            </div>

            {/* 內容渲染 */}
            <div className="relative">
              <div className={assessmentType === 'pre_training' ? 'block animate-in fade-in' : 'hidden'}>
                {mountedTabs.includes('pre_training') && (
                  <PreTrainingAssessment studentEmail={selectedStudentEmail} studentName={selectedStudentName} userRole={userRole} currentUserEmail={user?.email} currentUserName={userProfile?.displayName || user?.displayName} gasApiUrl={GAS_API_URL} />
                )}
              </div>
              
              <div className={assessmentType === 'epa' ? 'block animate-in fade-in' : 'hidden'}>
                {mountedTabs.includes('epa') && (
                  <EPAAssessment studentEmail={selectedStudentEmail} studentName={selectedStudentName} isTeacher={isTeacherOrAdmin} userProfile={userProfile} currentUserEmail={user?.email} apiUrl={GAS_API_URL} />
                )}
              </div>

              <div className={assessmentType === 'dops' ? 'block animate-in fade-in' : 'hidden'}>
                {mountedTabs.includes('dops') && (
                  <DOPSAssessment studentEmail={selectedStudentEmail} studentName={selectedStudentName} userRole={userRole} currentUserEmail={user?.email} currentUserName={userProfile?.displayName || user?.displayName} gasApiUrl={GAS_API_URL} />
                )}
              </div>

              <div className={assessmentType === 'minicex' ? 'block animate-in fade-in' : 'hidden'}>
                {mountedTabs.includes('minicex') && (
                  <MiniCEXAssessment studentEmail={selectedStudentEmail} studentName={selectedStudentName} isTeacher={isTeacherOrAdmin} userProfile={userProfile} currentUserEmail={user?.email} apiUrl={GAS_API_URL} />
                )}
              </div>

              <div className={assessmentType === 'osce' ? 'block animate-in fade-in' : 'hidden'}>
                {mountedTabs.includes('osce') && (
                  <OSCEAssessment studentEmail={selectedStudentEmail} studentName={selectedStudentName} isTeacher={isTeacherOrAdmin} userProfile={userProfile} currentUserEmail={user?.email} apiUrl={GAS_API_URL} />
                )}
              </div>

              <div className={assessmentType === 'ksa' ? 'block animate-in fade-in' : 'hidden'}>
                {mountedTabs.includes('ksa') && (
                  <KSAAssessment studentEmail={selectedStudentEmail} studentName={selectedStudentName} isTeacher={isTeacherOrAdmin} userProfile={userProfile} apiUrl={GAS_API_URL} />
                )}
              </div>

              <div className={assessmentType === 'written_test' ? 'block animate-in fade-in' : 'hidden'}>
                {mountedTabs.includes('written_test') && (
                  <WrittenTestAssessment studentEmail={selectedStudentEmail} studentName={selectedStudentName} isTeacher={isTeacherOrAdmin} userProfile={userProfile} apiUrl={GAS_API_URL} />
                )}
              </div>

              {/* ★ [新增] 關懷紀錄元件渲染 */}
              <div className={assessmentType === 'care' ? 'block animate-in fade-in' : 'hidden'}>
                {mountedTabs.includes('care') && (
                  <CareAssessment 
                    studentEmail={selectedStudentEmail} 
                    studentName={selectedStudentName} 
                    isTeacher={isTeacherOrAdmin} 
                    userProfile={userProfile} 
                    apiUrl={GAS_API_URL} 
                  />
                )}
              </div>
            </div>

          </div>
        )}

        {/* 3. 學習成果 */}
        {activeMainTab === 'outcome' && (
          <div className="animate-in fade-in duration-300">
             <div className="bg-purple-50 p-4 rounded-lg mb-6 border border-purple-100 flex items-start gap-3">
               <Award className="w-6 h-6 text-purple-600 shrink-0 mt-1" />
               <div>
                 <h3 className="font-bold text-purple-800 text-lg">學習成果總結</h3>
                 <p className="text-sm text-purple-600">在此檢核學員是否完成所有必修項目，並進行完訓資格審核。</p>
               </div>
             </div>
             
             <FinalAssessment 
               studentEmail={selectedStudentEmail} 
               studentName={selectedStudentName} 
               isTeacher={isTeacherOrAdmin} 
               userProfile={userProfile} 
               apiUrl={GAS_API_URL} 
             />
          </div>
        )}

      </div>

      {/* Related SOP Modal */}
      {isSopModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 sm:p-6 bg-black/55 backdrop-blur-sm" onClick={() => setIsSopModalOpen(false)}>
          <div className="bg-white rounded-none sm:rounded-2xl shadow-2xl w-full max-w-5xl h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[92vh] overflow-hidden flex flex-col" onClick={event => event.stopPropagation()}>
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-indigo-50 flex justify-between items-start gap-4">
              <div>
                <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                  <BookOpen className="w-5 h-5" /> 相關 SOP
                </h3>
                <p className="text-xs text-indigo-600 mt-1">閱讀 SOP 後，仍須由教師依實際操作完成訓練評核。</p>
              </div>
              <button type="button" onClick={() => setIsSopModalOpen(false)} className="p-1.5 rounded-full hover:bg-white text-gray-500" aria-label="關閉相關 SOP">
                <X className="w-5 h-5" />
              </button>
            </div>

            {sopLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 text-gray-500">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
                正在載入 SOP…
              </div>
            ) : sopError ? (
              <div className="m-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{sopError}</div>
            ) : (
              <div className="flex-1 min-h-0 flex flex-col">
                {selectedSopIds.length > 1 && (
                  <div className="md:hidden px-4 py-3 border-b border-gray-100 bg-white">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <label htmlFor="mobile-sop-selector" className="text-xs font-bold text-gray-500">選擇 SOP 文件</label>
                      <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-full">
                        第 {activeSopIndex + 1}／{selectedSopIds.length} 份
                      </span>
                    </div>
                    <select
                      id="mobile-sop-selector"
                      value={activeSopId}
                      onChange={event => setActiveSopId(event.target.value)}
                      className="w-full px-3 py-2.5 border border-indigo-200 rounded-xl bg-indigo-50 text-indigo-900 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-300"
                    >
                      {selectedSopIds.map(sopId => (
                        <option key={sopId} value={sopId}>
                          {sopsById[sopId]?.title || 'SOP 文件載入中'}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex-1 min-h-0 flex">
                  {selectedSopIds.length > 1 && (
                    <aside className="hidden md:block w-72 border-r border-gray-100 p-3 bg-gray-50 overflow-y-auto">
                      <div className="flex flex-col gap-2">
                        {selectedSopIds.map(sopId => {
                          const sop = sopsById[sopId];
                          return (
                            <button
                              type="button"
                              key={sopId}
                              onClick={() => setActiveSopId(sopId)}
                              className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${activeSopId === sopId ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-200 text-gray-700 hover:border-indigo-300'}`}
                            >
                              {sop?.title || 'SOP 文件載入中'}
                            </button>
                          );
                        })}
                      </div>
                    </aside>
                  )}

                  <section className="flex-1 overflow-y-auto p-4 sm:p-6">
                    {(() => {
                      const activeSop = sopsById[activeSopId];
                      if (!activeSop) {
                        return <div className="text-center py-16 text-gray-400">找不到這份 SOP，請通知管理者檢查連結。</div>;
                      }
                      const attachment = processSopImageUrl(activeSop.attachmentUrl);
                      return (
                        <>
                          <div className="mb-5 pb-4 border-b border-gray-100">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full">{activeSop.category || '未分類'}</span>
                              {activeSop.updatedAt && <span className="text-xs text-gray-500">更新日期：{formatSopDate(activeSop.updatedAt)}</span>}
                              {(activeSop.updatedByName || activeSop.updatedBy) && <span className="text-xs text-gray-500">編修者：{activeSop.updatedByName || activeSop.updatedBy}</span>}
                            </div>
                            <h4 className="text-xl font-bold text-gray-900 leading-snug break-words">{activeSop.title}</h4>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              {renderReadStatus([activeSopId])}
                              {userRole === 'student' && user?.email === selectedStudentEmail && (
                                <button
                                  type="button"
                                  onClick={confirmActiveSopRead}
                                  disabled={savingReadReceipt}
                                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-bold disabled:opacity-50"
                                >
                                  {savingReadReceipt ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                  {getSopReadState(activeSopId) === 'updated' ? '重新確認已閱讀' : '我已閱讀並確認'}
                                </button>
                              )}
                            </div>
                          </div>

                          {activeSop.content
                            ? renderSopContent(activeSop.content)
                            : <div className="text-gray-400 py-8 text-center">這份 SOP 目前沒有文字內容。</div>}

                          {activeSop.attachmentUrl && attachment.isImage && (
                            <figure className="mt-6">
                              <img src={attachment.src} alt={`${activeSop.title} 附件`} className="max-w-full h-auto rounded-xl border border-gray-200 shadow-sm" loading="lazy" />
                            </figure>
                          )}

                          {activeSop.attachmentUrl && (
                            <a href={activeSop.attachmentUrl} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 bg-orange-50 border border-orange-200 text-orange-700 rounded-xl text-sm font-bold hover:bg-orange-100">
                              <Paperclip className="w-4 h-4" />
                              開啟或下載附件
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </>
                      );
                    })()}
                  </section>
                </div>

                {selectedSopIds.length > 1 && (
                  <div className="md:hidden shrink-0 px-4 py-3 border-t border-gray-100 bg-white flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => selectRelativeSop(-1)}
                      disabled={activeSopIndex <= 0}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold text-sm disabled:opacity-35 disabled:bg-gray-50"
                    >
                      <ChevronLeft className="w-4 h-4" /> 上一份
                    </button>
                    <button
                      type="button"
                      onClick={() => selectRelativeSop(1)}
                      disabled={activeSopIndex >= selectedSopIds.length - 1}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm disabled:opacity-35"
                    >
                      下一份 <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Related Video Series Modal */}
      {isVideoModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 sm:p-6 bg-black/55 backdrop-blur-sm" onClick={() => setIsVideoModalOpen(false)}>
          <div className="bg-white rounded-none sm:rounded-2xl shadow-2xl w-full max-w-5xl h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[92vh] overflow-hidden flex flex-col" onClick={event => event.stopPropagation()}>
            <div className="px-4 sm:px-6 py-4 border-b border-purple-100 bg-purple-50 flex justify-between items-start gap-4">
              <div>
                <h3 className="font-bold text-purple-900 flex items-center gap-2">
                  <Film className="w-5 h-5" /> 相關影片系列
                </h3>
                <p className="text-xs text-purple-700 mt-1">本訓練項目的影片集中於此，可依序觀看，不必逐一開啟多個連結。</p>
              </div>
              <button type="button" onClick={() => setIsVideoModalOpen(false)} className="p-1.5 rounded-full hover:bg-white text-gray-500" aria-label="關閉相關影片">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="md:hidden px-4 py-3 border-b border-gray-100 bg-white">
              <div className="flex items-center justify-between gap-3 mb-2">
                <label htmlFor="mobile-video-selector" className="text-xs font-bold text-gray-500">選擇教學影片</label>
                <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded-full">
                  第 {activeVideoIndex + 1}／{selectedVideoIds.length} 部
                </span>
              </div>
              <select
                id="mobile-video-selector"
                value={activeVideoId}
                onChange={event => setActiveVideoId(event.target.value)}
                className="w-full px-3 py-2.5 border border-purple-200 rounded-xl bg-purple-50 text-purple-900 font-bold text-sm outline-none focus:ring-2 focus:ring-purple-300"
              >
                {selectedVideoIds.map(videoId => (
                  <option key={videoId} value={videoId}>{videosById[videoId]?.title || '影片載入中'}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-h-0 flex">
              {selectedVideoIds.length > 1 && (
                <aside className="hidden md:block w-72 border-r border-gray-100 p-3 bg-gray-50 overflow-y-auto">
                  <p className="px-2 pb-2 text-xs font-bold text-gray-400">系列共 {selectedVideoIds.length} 部</p>
                  <div className="flex flex-col gap-2">
                    {selectedVideoIds.map((videoId, index) => {
                      const video = videosById[videoId];
                      return (
                        <button
                          type="button"
                          key={videoId}
                          onClick={() => setActiveVideoId(videoId)}
                          className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${activeVideoId === videoId ? 'bg-purple-600 border-purple-600 text-white' : 'bg-white border-gray-200 text-gray-700 hover:border-purple-300'}`}
                        >
                          <span className="block text-[11px] opacity-70 mb-1">第 {index + 1} 部</span>
                          {video?.title || '影片載入中'}
                        </button>
                      );
                    })}
                  </div>
                </aside>
              )}

              <section className="flex-1 overflow-y-auto p-4 sm:p-6">
                {(() => {
                  const activeVideo = videosById[activeVideoId];
                  if (!activeVideo) return <div className="text-center py-16 text-gray-400">找不到這部影片，請通知管理者檢查連結。</div>;
                  const embedUrl = getVideoEmbedUrl(activeVideo.url);
                  return (
                    <>
                      <div className="mb-4">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full">{activeVideo.category || '未分類'}</span>
                          <span className="text-xs text-gray-500">第 {activeVideoIndex + 1}／{selectedVideoIds.length} 部</span>
                        </div>
                        <h4 className="text-xl font-bold text-gray-900 leading-snug break-words">{activeVideo.title}</h4>
                        {activeVideo.description && <p className="mt-2 text-sm text-gray-600">{activeVideo.description}</p>}
                      </div>

                      {embedUrl ? (
                        <div className="w-full aspect-video rounded-xl overflow-hidden bg-black shadow-sm">
                          <iframe
                            src={embedUrl}
                            title={activeVideo.title}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      ) : (
                        <div className="rounded-xl border-2 border-dashed border-purple-200 bg-purple-50 p-8 text-center">
                          <Film className="w-12 h-12 mx-auto text-purple-300 mb-3" />
                          <p className="text-sm text-purple-800 font-bold">此影片需使用外部網站開啟。</p>
                        </div>
                      )}

                      <a href={activeVideo.url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700">
                        <ExternalLink className="w-4 h-4" /> 開啟原始影片
                      </a>
                    </>
                  );
                })()}
              </section>
            </div>

            {selectedVideoIds.length > 1 && (
              <div className="md:hidden shrink-0 px-4 py-3 border-t border-gray-100 bg-white flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => selectRelativeVideo(-1)}
                  disabled={activeVideoIndex <= 0}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold text-sm disabled:opacity-35 disabled:bg-gray-50"
                >
                  <ChevronLeft className="w-4 h-4" /> 上一部
                </button>
                <button
                  type="button"
                  onClick={() => selectRelativeVideo(1)}
                  disabled={activeVideoIndex >= selectedVideoIds.length - 1}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-sm disabled:opacity-35"
                >
                  下一部 <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Evaluate Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-gray-800">考核評分</h3>
              <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-4 space-y-4">
               <div><label className="block text-xs font-bold text-gray-500 mb-1">項目</label><p className="font-bold">{currentEval.itemName}</p></div>
               <div><label className="block text-xs font-bold text-gray-500 mb-1">日期</label><input type="date" value={currentEval.date} onChange={e => setCurrentEval({...currentEval, date: e.target.value})} className="w-full border rounded p-2"/></div>
               <div className="flex gap-2">
                 <button onClick={() => setCurrentEval({...currentEval, status: 'pass'})} className={`flex-1 py-2 rounded border font-bold ${currentEval.status==='pass'?'bg-green-100 text-green-700':'bg-white'}`}>合格</button>
                 <button onClick={() => setCurrentEval({...currentEval, status: 'improve'})} className={`flex-1 py-2 rounded border font-bold ${currentEval.status==='improve'?'bg-orange-100 text-orange-700':'bg-white'}`}>再加強</button>
               </div>
               <button onClick={handleSubmitEval} disabled={submitting} className="w-full py-2 bg-indigo-600 text-white rounded font-bold">{submitting ? '儲存中...' : '確認送出'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PassportSection;
