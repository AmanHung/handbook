import React, { useEffect, useMemo, useState } from 'react';
import {
  arrayRemove, arrayUnion, collection, doc, onSnapshot, setDoc, writeBatch,
} from 'firebase/firestore';
import { BookOpen, Check, Film, Link2, Loader2, Save, Search, Sparkles } from 'lucide-react';
import { db } from '../firebase';
import { getEditorAuditFields } from '../utils/editorIdentity';
import { getTrainingGroupSopIds } from '../data/trainingSopLinks';

const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbw3-nakNBi0t3W3_-XtQmztYqq9qAj0ZOaGpXKZG41eZfhYjNfIM5xuVXwzSLa1_X3hfA/exec';

const buildTrainingTargets = (items) => {
  const groups = new Map();
  (items || []).forEach(item => {
    const key = `${item.category_id}::${item.title}`;
    if (!groups.has(key)) {
      groups.set(key, {
        id: item.id,
        title: item.title || '未命名訓練項目',
        categoryId: item.category_id,
        categoryName: item.category_name,
        items: [],
      });
    }
    groups.get(key).items.push(item);
  });
  return [...groups.values()].filter(target => target.title !== '未命名訓練項目');
};

const normalizeText = (value) => (value || '')
  .toLowerCase()
  .replace(/[\s、，。／/（）()：:・\-─_]/g, '');

const getVideoSequence = (title) => {
  const match = (title || '').match(/[-－](\d{1,2})/);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
};

const compareVideos = (a, b) => getVideoSequence(a.title) - getVideoSequence(b.title)
  || (a.title || '').localeCompare(b.title || '', 'zh-Hant', { numeric: true });

const getRecommendedVideoIds = (target, videos) => {
  if (!target) return [];
  const targetTitle = normalizeText(target.title);
  const targetCategory = normalizeText(target.categoryName);
  const targetDetails = normalizeText(target.items.map(item => item.sub_item || '').join(' '));

  return (videos || [])
    .filter(video => {
      const videoTitle = normalizeText(video.title);
      const videoCategory = normalizeText(video.category);
      if (!videoTitle) return false;
      return (videoCategory && targetCategory
          && (videoCategory.includes(targetCategory) || targetCategory.includes(videoCategory)))
        || targetTitle.includes(videoTitle)
        || videoTitle.includes(targetTitle)
        || targetDetails.includes(videoTitle);
    })
    .map(video => video.id);
};

const TrainingSopLinkManager = ({ user, sops, videos }) => {
  const [targets, setTargets] = useState([]);
  const [linksByTargetId, setLinksByTargetId] = useState({});
  const [selectedTargetId, setSelectedTargetId] = useState('');
  const [selectedSopIds, setSelectedSopIds] = useState([]);
  const [selectedVideoIds, setSelectedVideoIds] = useState([]);
  const [resourceType, setResourceType] = useState('sop');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchTargets = async () => {
      try {
        const response = await fetch(`${GAS_API_URL}?type=getData&studentEmail=${encodeURIComponent(user?.email || '')}`);
        const data = await response.json();
        const nextTargets = buildTrainingTargets(data.items || []);
        setTargets(nextTargets);
        if (nextTargets.length > 0) setSelectedTargetId(nextTargets[0].id);
      } catch (error) {
        console.error('讀取訓練項目失敗：', error);
        setMessage('無法讀取訓練項目，請稍後再試。');
      } finally {
        setLoading(false);
      }
    };
    fetchTargets();
  }, [user?.email]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'training_sop_links'), snapshot => {
      const nextLinks = {};
      snapshot.forEach(linkDoc => {
        nextLinks[linkDoc.id] = { id: linkDoc.id, ...linkDoc.data() };
      });
      setLinksByTargetId(nextLinks);
    });
    return () => unsubscribe();
  }, []);

  const selectedTarget = targets.find(target => target.id === selectedTargetId);
  const savedLink = linksByTargetId[selectedTargetId];

  useEffect(() => {
    setSelectedSopIds(savedLink?.sopIds || []);
    setSelectedVideoIds((videos || [])
      .filter(video => (video.trainingItemIds || []).includes(selectedTargetId))
      .sort(compareVideos)
      .map(video => video.id));
    setMessage('');
  }, [selectedTargetId, savedLink, videos]);

  const recommendedSopIds = useMemo(() => {
    if (!selectedTarget) return [];
    const sopsById = Object.fromEntries((sops || []).map(sop => [sop.id, sop]));
    const fixedRecommendations = getTrainingGroupSopIds(selectedTarget.title, selectedTarget.items, sopsById);
    const categoryRecommendations = selectedTarget.categoryId === 'DI' && selectedTarget.title.includes('藥品諮詢')
      ? sops.filter(sop => sop.category === '藥品諮詢').map(sop => sop.id)
      : [];
    return [...new Set([...fixedRecommendations, ...categoryRecommendations])];
  }, [selectedTarget, sops]);

  const recommendedVideoIds = useMemo(
    () => getRecommendedVideoIds(selectedTarget, videos),
    [selectedTarget, videos]
  );

  const videoCategories = useMemo(
    () => [...new Set((videos || []).map(video => video.category || '未分類'))]
      .sort((a, b) => a.localeCompare(b, 'zh-Hant')),
    [videos]
  );

  const filteredResources = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    const resources = resourceType === 'sop' ? sops : videos;
    return [...(resources || [])]
      .filter(resource => !keyword
        || (resource.title || '').toLowerCase().includes(keyword)
        || (resource.category || '').toLowerCase().includes(keyword))
      .sort((a, b) => (a.category || '').localeCompare(b.category || '', 'zh-Hant')
        || (resourceType === 'video'
          ? compareVideos(a, b)
          : (a.title || '').localeCompare(b.title || '', 'zh-Hant')));
  }, [resourceType, searchTerm, sops, videos]);

  const toggleResource = (resourceId) => {
    const setter = resourceType === 'sop' ? setSelectedSopIds : setSelectedVideoIds;
    setter(current => current.includes(resourceId)
      ? current.filter(id => id !== resourceId)
      : [...current, resourceId]);
  };

  const saveLinks = async () => {
    if (!selectedTarget) return;
    setSaving(true);
    setMessage('');
    try {
      const selectedIds = resourceType === 'sop' ? selectedSopIds : selectedVideoIds;
      if (resourceType === 'sop') {
        await setDoc(doc(db, 'training_sop_links', selectedTarget.id), {
          trainingItemId: selectedTarget.id,
          trainingTitle: selectedTarget.title,
          categoryId: selectedTarget.categoryId,
          categoryName: selectedTarget.categoryName,
          sopIds: selectedIds,
          ...getEditorAuditFields(),
        }, { merge: true });
      } else {
        const selectedSet = new Set(selectedIds);
        const changedVideos = (videos || []).filter(video => {
          const wasSelected = (video.trainingItemIds || []).includes(selectedTarget.id);
          return wasSelected !== selectedSet.has(video.id);
        });
        if (changedVideos.length > 0) {
          const batch = writeBatch(db);
          changedVideos.forEach(video => {
            const shouldLink = selectedSet.has(video.id);
            batch.update(doc(db, 'training_videos', video.id), {
              trainingItemIds: shouldLink
                ? arrayUnion(selectedTarget.id)
                : arrayRemove(selectedTarget.id),
              ...getEditorAuditFields(),
            });
          });
          await batch.commit();
        }
      }
      setMessage(`已儲存 ${selectedIds.length} 份${resourceType === 'sop' ? ' SOP' : '教學影片'}連結。`);
    } catch (error) {
      console.error('儲存訓練資源連結失敗：', error);
      setMessage(`儲存失敗：${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-16 flex justify-center text-gray-500"><Loader2 className="w-6 h-6 animate-spin mr-2" />讀取訓練項目…</div>;
  }

  return (
    <div className="bg-white md:rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 md:p-6 border-b border-gray-100 bg-indigo-50">
        <h2 className="font-bold text-indigo-900 flex items-center gap-2"><Link2 className="w-5 h-5" />訓練項目與學習資源連結管理</h2>
        <p className="text-sm text-indigo-700 mt-1">連結以固定訓練項目 ID、SOP 文件 ID 與影片 ID 儲存，標題修改後仍然有效。</p>
      </div>

      <div className="p-4 md:p-6 space-y-5">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">1．選擇訓練項目</label>
          <select value={selectedTargetId} onChange={event => setSelectedTargetId(event.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-3 bg-white font-bold text-gray-800">
            {targets.map(target => (
              <option key={target.id} value={target.id}>{target.categoryName}｜{target.title}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">固定識別碼：{selectedTargetId || '—'}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => { setResourceType('sop'); setSearchTerm(''); setMessage(''); }}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold ${resourceType === 'sop' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500'}`}
          >
            <BookOpen className="w-4 h-4" /> SOP 文件
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs">{selectedSopIds.length}</span>
          </button>
          <button
            type="button"
            onClick={() => { setResourceType('video'); setSearchTerm(''); setMessage(''); }}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold ${resourceType === 'video' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500'}`}
          >
            <Film className="w-4 h-4" /> 教學影片
            <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs">{selectedVideoIds.length}</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <label className="text-sm font-bold text-gray-700">2．勾選相關{resourceType === 'sop' ? ' SOP' : '教學影片'}</label>
          <button
            type="button"
            onClick={() => resourceType === 'sop'
              ? setSelectedSopIds(recommendedSopIds)
              : setSelectedVideoIds(recommendedVideoIds)}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm font-bold"
          >
            <Sparkles className="w-4 h-4" />套用系統推薦（{resourceType === 'sop' ? recommendedSopIds.length : recommendedVideoIds.length}）
          </button>
        </div>

        {resourceType === 'video' && videoCategories.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-bold text-gray-500">快速加入整個影片系列</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {videoCategories.map(category => {
                const categoryVideoIds = (videos || [])
                  .filter(video => (video.category || '未分類') === category)
                  .sort(compareVideos)
                  .map(video => video.id);
                const allSelected = categoryVideoIds.length > 0
                  && categoryVideoIds.every(id => selectedVideoIds.includes(id));
                return (
                  <button
                    type="button"
                    key={category}
                    onClick={() => setSelectedVideoIds(current => allSelected
                      ? current.filter(id => !categoryVideoIds.includes(id))
                      : [...new Set([...current, ...categoryVideoIds])])}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${allSelected ? 'border-purple-600 bg-purple-600 text-white' : 'border-purple-200 bg-purple-50 text-purple-700'}`}
                  >
                    {category}（{categoryVideoIds.length}）
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
          <input value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder={`搜尋${resourceType === 'sop' ? ' SOP' : '影片'}標題或分類…`} className="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl" />
        </div>

        <div className="border border-gray-200 rounded-xl max-h-[28rem] overflow-y-auto divide-y divide-gray-100">
          {filteredResources.map(resource => {
            const selectedIds = resourceType === 'sop' ? selectedSopIds : selectedVideoIds;
            const recommendedIds = resourceType === 'sop' ? recommendedSopIds : recommendedVideoIds;
            const checked = selectedIds.includes(resource.id);
            const recommended = recommendedIds.includes(resource.id);
            return (
              <label key={resource.id} className={`flex items-start gap-3 p-3 cursor-pointer ${checked ? (resourceType === 'sop' ? 'bg-indigo-50' : 'bg-purple-50') : 'hover:bg-gray-50'}`}>
                <input type="checkbox" checked={checked} onChange={() => toggleResource(resource.id)} className={`mt-1 w-4 h-4 ${resourceType === 'sop' ? 'accent-indigo-600' : 'accent-purple-600'}`} />
                <span className="flex-1 min-w-0">
                  <span className="font-bold text-sm text-gray-800 block">{resource.title}</span>
                  <span className="text-xs text-gray-500">{resource.category || '未分類'}｜{resourceType === 'sop' ? '文件' : '影片'} ID：{resource.id}</span>
                </span>
                {recommended && <span className="text-[11px] bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-bold">推薦</span>}
              </label>
            );
          })}
          {filteredResources.length === 0 && (
            <p className="p-8 text-center text-sm text-gray-400">找不到符合條件的{resourceType === 'sop' ? ' SOP' : '教學影片'}。</p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <p className="text-sm text-gray-600">
            已選擇 <strong className={resourceType === 'sop' ? 'text-indigo-700' : 'text-purple-700'}>{resourceType === 'sop' ? selectedSopIds.length : selectedVideoIds.length}</strong> 份；
            {resourceType === 'sop' ? '未勾選文件時，護照會顯示「尚無相關 SOP」。' : '影片推薦僅供參考，仍須由管理者確認後儲存。'}
          </p>
          <button type="button" onClick={saveLinks} disabled={saving} className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-white font-bold disabled:opacity-50 ${resourceType === 'sop' ? 'bg-indigo-600' : 'bg-purple-600'}`}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            儲存連結
          </button>
        </div>
        {message && <div className={`p-3 rounded-lg text-sm font-bold ${message.startsWith('已儲存') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}><Check className="w-4 h-4 inline mr-1" />{message}</div>}
      </div>
    </div>
  );
};

export default TrainingSopLinkManager;
