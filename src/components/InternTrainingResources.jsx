import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { BookOpen, CheckCircle2, ExternalLink, Loader2, PlayCircle, X } from 'lucide-react';
import { auth, db } from '../firebase';
import { getTrainingVideoIds, getVideoEmbedUrl } from '../utils/videoLibrary';
import { confirmInternSopRead, getSopVersion, subscribeInternSopReads } from '../services/internMaterials';
import SopDocumentContent from './SopDocumentContent';

const ResourceContext = createContext(null);
const safeLink = value => { try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; } };
export function InternResourcesProvider({ children, student, canConfirm, previewFixture }) {
  const preview = import.meta.env.DEV ? previewFixture : null;
  const [catalog, setCatalog] = useState({ sops: {}, links: {}, videos: {}, loaded: {}, errors: {} });
  const [receipts, setReceipts] = useState([]);
  const [viewer, setViewer] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (preview) return undefined;
    const stops = [['sops', 'sop_articles'], ['links', 'training_sop_links'], ['videos', 'training_videos']].map(([key, name]) => onSnapshot(collection(db, name), snapshot => setCatalog(current => ({ ...current, [key]: Object.fromEntries(snapshot.docs.map(record => [record.id, { ...record.data(), id: record.id }])), loaded: { ...current.loaded, [key]: true }, errors: { ...current.errors, [key]: false } })), () => setCatalog(current => ({ ...current, errors: { ...current.errors, [key]: true } }))));
    return () => stops.forEach(stop => stop());
  }, [Boolean(preview)]);
  useEffect(() => {
    if (preview || !student?.id) return undefined;
    setReceipts([]);
    return subscribeInternSopReads(db, student.id, setReceipts, () => setError('無法讀取教材閱讀確認，請稍後重試。'));
  }, [student?.id, Boolean(preview)]);
  const resources = preview ? { sops: Object.fromEntries((preview.sops || []).map(sop => [sop.id, sop])), videos: Object.fromEntries((preview.videos || []).map(video => [video.id, video])), links: preview.links || {}, loaded: { sops: true, videos: true, links: true }, errors: {} } : catalog;
  const reads = preview ? preview.internReadsByStudent?.[student?.id] || [] : receipts;
  const readBySop = Object.fromEntries(reads.map(receipt => [receipt.sopId, receipt]));
  const open = (type, ids) => { setViewer({ type, ids, active: ids[0] }); setError(''); };
  const confirm = async sop => {
    if (!canConfirm || saving) return;
    setSaving(true); setError('');
    try {
      if (preview) {
        if (!preview.onConfirmSopRead) throw new Error('此預覽未提供閱讀確認。');
        await preview.onConfirmSopRead(student.id, sop);
      } else await confirmInternSopRead(db, auth.currentUser, student.id, sop);
    } catch (failure) { setError(failure.message || '閱讀確認儲存失敗。'); }
    finally { setSaving(false); }
  };
  const value = useMemo(() => ({ ...resources, readBySop, open }), [resources.sops, resources.videos, resources.links, resources.loaded, resources.errors, reads]);
  const active = viewer && (viewer.type === 'sop' ? resources.sops : resources.videos)[viewer.active];
  const isRead = active && readBySop[active.id] && Number(readBySop[active.id].sopVersion || 0) >= getSopVersion(active);
  return <ResourceContext.Provider value={value}>{children}{viewer && <div className="fixed inset-0 z-[85] bg-black/55 flex items-center justify-center p-2 sm:p-6"><section role="dialog" aria-modal="true" aria-label={viewer.type === 'sop' ? '實習生相關 SOP' : '實習生相關影片'} className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[92vh] overflow-auto"><header className="sticky top-0 z-10 bg-indigo-50 border-b px-4 py-3 flex items-center justify-between gap-3"><div><h3 className="font-bold text-indigo-900">{viewer.type === 'sop' ? '相關 SOP' : '相關教學影片'}</h3><p className="text-xs text-indigo-700">閱讀教材與教師評核分開記錄。</p></div><button type="button" aria-label="關閉實習生教材" disabled={saving} onClick={() => setViewer(null)}><X size={22} /></button></header>{viewer.ids.length > 1 && <label className="block p-4 text-sm">選擇教材<select aria-label="選擇實習生教材" value={viewer.active} onChange={event => { setViewer(current => ({ ...current, active: event.target.value })); setError(''); }} className="ml-2 p-2 border rounded-lg max-w-full">{viewer.ids.map(id => <option key={id} value={id}>{(viewer.type === 'sop' ? resources.sops : resources.videos)[id]?.title || '教材已移除'}</option>)}</select></label>}<div className="p-4 sm:p-6 space-y-4">{!active ? <p>找不到這份教材，請通知管理者檢查連結。</p> : <><h4 className="font-bold text-lg text-gray-800">{active.title}</h4>{viewer.type === 'sop' ? <><SopDocumentContent text={active.content || active.description || ''} />{safeLink(active.attachmentUrl) && <a className="text-indigo-700 inline-flex items-center gap-1 underline" href={active.attachmentUrl} target="_blank" rel="noopener noreferrer">開啟附件<ExternalLink size={14} /></a>}<div className="border-t pt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-gray-600">{isRead ? '已確認閱讀目前版本。' : readBySop[active.id] ? 'SOP 已更新，請重新閱讀後確認。' : '尚未確認閱讀。'}</p>{canConfirm && <button type="button" disabled={saving || isRead} onClick={() => confirm(active)} className="inline-flex items-center gap-2 rounded-lg px-4 py-2 bg-indigo-600 text-white font-bold disabled:opacity-50">{saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}{isRead ? '已確認閱讀' : '確認已閱讀'}</button>}</div></> : <>{getVideoEmbedUrl(active.url) ? <iframe className="w-full aspect-video rounded-lg border" title={active.title} src={getVideoEmbedUrl(active.url)} allowFullScreen /> : <p className="text-sm text-gray-600">請開啟影片連結觀看。</p>}{safeLink(active.url) && <a className="inline-flex items-center gap-1 text-indigo-700 underline" href={active.url} target="_blank" rel="noopener noreferrer">開啟影片<ExternalLink size={14} /></a>}</>}</>}{error && <p role="alert" className="bg-red-50 text-red-700 rounded-lg p-3 text-sm">{error}</p>}</div></section></div>}</ResourceContext.Provider>;
}

export default function InternTrainingResources({ itemId }) {
  const resources = useContext(ResourceContext);
  if (!resources) return null;
  if (Object.values(resources.errors).some(Boolean)) return <p className="mt-2 ml-6 text-xs text-orange-700">教材暫時無法載入，請稍後重試。</p>;
  if (!['sops', 'links', 'videos'].every(key => resources.loaded[key])) return <p className="mt-2 ml-6 text-xs text-gray-400">教材載入中…</p>;
  const configured = resources.links[itemId]?.sopIds || [];
  const sopIds = configured.filter(id => resources.sops[id]);
  const videoIds = getTrainingVideoIds(Object.values(resources.videos), [itemId]);
  if (!sopIds.length && !videoIds.length && configured.length === sopIds.length) return null;
  const allRead = sopIds.length > 0 && sopIds.every(id => resources.readBySop[id] && Number(resources.readBySop[id].sopVersion || 0) >= getSopVersion(resources.sops[id]));
  return <div className="mt-2 ml-6 flex flex-wrap items-center gap-2">{sopIds.length ? <button type="button" onClick={() => resources.open('sop', sopIds)} className="inline-flex items-center gap-1.5 rounded-md border border-indigo-100 bg-indigo-50 text-indigo-700 px-2.5 py-1 text-xs font-bold"><BookOpen size={14} />相關 SOP（{sopIds.length}）</button> : null}{allRead && <span className="text-xs text-green-700 bg-green-100 rounded-full px-2 py-1">已閱讀</span>}{configured.length !== sopIds.length && <span className="text-xs text-orange-700">部分教材連結待確認</span>}{videoIds.length > 0 && <button type="button" onClick={() => resources.open('video', videoIds)} className="inline-flex items-center gap-1.5 rounded-md border border-purple-100 bg-purple-50 text-purple-700 px-2.5 py-1 text-xs font-bold"><PlayCircle size={14} />相關影片（{videoIds.length}）</button>}</div>;
}
