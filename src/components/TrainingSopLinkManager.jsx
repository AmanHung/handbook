import React, { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { Check, Link2, Loader2, Save, Search, Sparkles } from 'lucide-react';
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

const TrainingSopLinkManager = ({ user, sops }) => {
  const [targets, setTargets] = useState([]);
  const [linksByTargetId, setLinksByTargetId] = useState({});
  const [selectedTargetId, setSelectedTargetId] = useState('');
  const [selectedSopIds, setSelectedSopIds] = useState([]);
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
    setMessage('');
  }, [selectedTargetId, savedLink]);

  const recommendedSopIds = useMemo(() => {
    if (!selectedTarget) return [];
    const sopsById = Object.fromEntries((sops || []).map(sop => [sop.id, sop]));
    const fixedRecommendations = getTrainingGroupSopIds(selectedTarget.title, selectedTarget.items, sopsById);
    const categoryRecommendations = selectedTarget.categoryId === 'DI' && selectedTarget.title.includes('藥品諮詢')
      ? sops.filter(sop => sop.category === '藥品諮詢').map(sop => sop.id)
      : [];
    return [...new Set([...fixedRecommendations, ...categoryRecommendations])];
  }, [selectedTarget, sops]);

  const filteredSops = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return [...(sops || [])]
      .filter(sop => !keyword
        || (sop.title || '').toLowerCase().includes(keyword)
        || (sop.category || '').toLowerCase().includes(keyword))
      .sort((a, b) => (a.category || '').localeCompare(b.category || '', 'zh-Hant')
        || (a.title || '').localeCompare(b.title || '', 'zh-Hant'));
  }, [sops, searchTerm]);

  const toggleSop = (sopId) => {
    setSelectedSopIds(current => current.includes(sopId)
      ? current.filter(id => id !== sopId)
      : [...current, sopId]);
  };

  const saveLinks = async () => {
    if (!selectedTarget) return;
    setSaving(true);
    setMessage('');
    try {
      await setDoc(doc(db, 'training_sop_links', selectedTarget.id), {
        trainingItemId: selectedTarget.id,
        trainingTitle: selectedTarget.title,
        categoryId: selectedTarget.categoryId,
        categoryName: selectedTarget.categoryName,
        sopIds: selectedSopIds,
        ...getEditorAuditFields(),
      });
      setMessage(`已儲存 ${selectedSopIds.length} 份 SOP 連結。`);
    } catch (error) {
      console.error('儲存 SOP 連結失敗：', error);
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
        <h2 className="font-bold text-indigo-900 flex items-center gap-2"><Link2 className="w-5 h-5" />訓練項目與 SOP 連結管理</h2>
        <p className="text-sm text-indigo-700 mt-1">連結以固定訓練項目 ID 與 SOP 文件 ID 儲存，標題修改後仍然有效。</p>
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

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <label className="text-sm font-bold text-gray-700">2．勾選相關 SOP</label>
          <button type="button" onClick={() => setSelectedSopIds(recommendedSopIds)} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm font-bold">
            <Sparkles className="w-4 h-4" />套用系統推薦（{recommendedSopIds.length}）
          </button>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
          <input value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="搜尋 SOP 標題或分類…" className="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl" />
        </div>

        <div className="border border-gray-200 rounded-xl max-h-[28rem] overflow-y-auto divide-y divide-gray-100">
          {filteredSops.map(sop => {
            const checked = selectedSopIds.includes(sop.id);
            const recommended = recommendedSopIds.includes(sop.id);
            return (
              <label key={sop.id} className={`flex items-start gap-3 p-3 cursor-pointer ${checked ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}>
                <input type="checkbox" checked={checked} onChange={() => toggleSop(sop.id)} className="mt-1 w-4 h-4 accent-indigo-600" />
                <span className="flex-1 min-w-0">
                  <span className="font-bold text-sm text-gray-800 block">{sop.title}</span>
                  <span className="text-xs text-gray-500">{sop.category || '未分類'}｜文件 ID：{sop.id}</span>
                </span>
                {recommended && <span className="text-[11px] bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-bold">推薦</span>}
              </label>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <p className="text-sm text-gray-600">已選擇 <strong className="text-indigo-700">{selectedSopIds.length}</strong> 份；未勾選任何文件時，護照會顯示「尚無相關 SOP」。</p>
          <button type="button" onClick={saveLinks} disabled={saving} className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 text-white font-bold disabled:opacity-50">
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
