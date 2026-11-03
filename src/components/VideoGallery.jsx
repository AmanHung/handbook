import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase.js';
import { Search, Play, Film, ExternalLink, X } from 'lucide-react';
import {
  VIDEO_TOPICS, getVideoSeries, getVideoTopic, compareVideos, getVideoEmbedUrl,
} from '../utils/videoLibrary';

const VideoGallery = () => {
  const [topic, setTopic] = useState('all');
  const [series, setSeries] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [videoError, setVideoError] = useState('');
  const [playingId, setPlayingId] = useState('');

  useEffect(() => onSnapshot(collection(db, 'training_videos'), snapshot => {
    setVideos(snapshot.docs.map(item => ({ ...item.data(), id: item.id })));
    setLoading(false);
    setVideoError('');
  }, () => {
    setVideoError('影片讀取失敗，請確認網路或登入狀態後重新整理。');
    setLoading(false);
  }), []);

  const visibleTopics = VIDEO_TOPICS.filter(item => videos.some(video => getVideoTopic(video) === item.id));
  const topicVideos = videos.filter(video => topic === 'all' || getVideoTopic(video) === topic);
  const seriesNames = [...new Set(topicVideos.map(getVideoSeries))].sort((a, b) => a.localeCompare(b, 'zh-Hant'));
  const filtered = videos.filter(video => {
    const text = [video.title, video.description, getVideoSeries(video), ...(video.keywords || [])].join(' ').toLowerCase();
    return (topic === 'all' || getVideoTopic(video) === topic)
      && (series === 'all' || getVideoSeries(video) === series)
      && (!keyword.trim() || text.includes(keyword.trim().toLowerCase()));
  });
  const grouped = visibleTopics.map(item => ({ ...item,
    videos: filtered.filter(video => getVideoTopic(video) === item.id).sort((a, b) =>
      getVideoSeries(a).localeCompare(getVideoSeries(b), 'zh-Hant') || compareVideos(a, b)),
  })).filter(item => item.videos.length > 0);
  const clearFilters = () => { setTopic('all'); setSeries('all'); setKeyword(''); setPlayingId(''); };

  return (
    <div className="space-y-5 px-4 py-5 md:p-6 bg-white md:rounded-2xl shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-2xl font-black text-slate-800 flex items-center gap-2"><Film className="text-purple-600" />影音教學專區</h2>
          <p className="mt-2 text-sm text-slate-500">依主題或系列尋找影片，也可直接搜尋關鍵字。</p></div>
        <span className="rounded-full bg-purple-50 px-4 py-2 text-sm font-bold text-purple-700">共 {videos.length} 部影片</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2" aria-label="影片主題">
        {[{ id: 'all', title: '全部影片', description: '瀏覽完整教材庫' }, ...visibleTopics].map(item => (
          <button key={item.id} type="button" aria-pressed={topic === item.id}
            onClick={() => { setTopic(item.id); setSeries('all'); setPlayingId(''); }}
            className={`text-left rounded-xl border p-3 transition-colors ${topic === item.id ? 'bg-purple-600 text-white border-purple-600' : 'border-slate-200 text-slate-700 hover:border-purple-300 bg-white'}`}>
            <span className="flex justify-between gap-2 font-bold">{item.title}<span>{item.id === 'all' ? videos.length : videos.filter(video => getVideoTopic(video) === item.id).length}</span></span>
            <span className={`block text-xs mt-1 ${topic === item.id ? 'text-purple-100' : 'text-slate-500'}`}>{item.description}</span>
          </button>
        ))}
      </div>
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <label className="relative flex-1"><span className="sr-only">搜尋教學影片</span><Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
            <input aria-label="搜尋教學影片" value={keyword} onChange={event => setKeyword(event.target.value)} placeholder="搜尋影片、操作步驟或關鍵字…" className="w-full pl-10 pr-3 py-3 border border-slate-200 rounded-lg text-sm" /></label>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="影片系列">
          {['all', ...seriesNames].map(name => <button key={name} type="button" aria-pressed={series === name} onClick={() => { setSeries(name); setPlayingId(''); }}
            className={`rounded-full px-3 py-1.5 text-xs font-bold border ${series === name ? 'bg-purple-100 border-purple-300 text-purple-800' : 'bg-white border-slate-200 text-slate-600'}`}>
            {name === 'all' ? '全部系列' : name}（{name === 'all' ? topicVideos.length : topicVideos.filter(video => getVideoSeries(video) === name).length}）</button>)}
        </div>
      </div>
      {videoError && <div role="alert" className="text-red-700 bg-red-50 p-4 rounded-lg">{videoError}</div>}
      <div className="flex items-center justify-between gap-2 text-sm"><span role="status" className="text-slate-500">{loading ? '影片載入中…' : `顯示 ${filtered.length}／${videos.length} 部影片`}</span><button type="button" onClick={clearFilters} className="flex items-center gap-1 text-purple-700 font-bold"><X className="w-4 h-4" />清除篩選</button></div>
      {!loading && !videoError && filtered.length === 0 && <p className="py-12 text-center text-slate-500 rounded-xl border border-dashed">找不到符合條件的影片，請調整搜尋或清除篩選。</p>}
      {grouped.map(group => <section key={group.id} aria-label={group.title}>
        <h3 className="font-bold text-lg text-slate-800 mb-3">{group.title}<span className="ml-2 text-sm text-slate-400">{group.videos.length} 部</span></h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {group.videos.map(video => {
            const embedUrl = getVideoEmbedUrl(video.url);
            return <article key={video.id} className="rounded-xl overflow-hidden border border-slate-200 flex flex-col bg-white">
              <div className="aspect-video bg-slate-900 text-white">
                {playingId === video.id && embedUrl ? <iframe src={embedUrl} title={video.title} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                  : embedUrl ? <button type="button" aria-label={`播放：${video.title}`} onClick={() => setPlayingId(video.id)} className="w-full h-full flex flex-col items-center justify-center gap-2 hover:bg-purple-950"><span className="rounded-full bg-white/15 p-4"><Play className="w-7 h-7" /></span><span className="text-sm">點選播放</span></button>
                    : <a href={video.url} target="_blank" rel="noopener noreferrer" className="w-full h-full flex flex-col items-center justify-center gap-2"><ExternalLink className="w-8 h-8" /><span className="text-sm">開啟影片／播放清單</span></a>}
              </div>
              <div className="p-4 flex-1 flex flex-col gap-3">
                <span className="text-xs text-purple-700 font-bold">{getVideoSeries(video)}</span>
                <h4 className="font-bold text-slate-800 leading-relaxed">{video.title}</h4>
                {video.description && <p className="text-sm text-slate-500 line-clamp-3">{video.description}</p>}
                <div className="mt-auto border-t border-slate-100 pt-3 space-y-2">
                  <a href={video.url} target="_blank" rel="noopener noreferrer" className="inline-flex text-xs text-slate-500 items-center gap-1"><ExternalLink className="w-3.5 h-3.5" />開啟原始連結</a>
                </div>
              </div>
            </article>;
          })}
        </div>
      </section>)}
    </div>
  );
};

export default VideoGallery;
