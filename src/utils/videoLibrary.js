export const TRAINING_API_URL = 'https://script.google.com/macros/s/AKfycbw3-nakNBi0t3W3_-XtQmztYqq9qAj0ZOaGpXKZG41eZfhYjNfIM5xuVXwzSLa1_X3hfA/exec';

export const VIDEO_TOPICS = [
  { id: 'equipment', title: '設備操作', description: '智慧藥櫃、包藥機與故障排除' },
  { id: 'dispensing', title: '調劑與藥品管理', description: '處方評估、管制藥品與智慧藥庫' },
  { id: 'preparation', title: '特殊製劑', description: '化療安全、潑灑處理與 TPN' },
  { id: 'clinical', title: '臨床照護', description: '抗生素、治療監測與藥事照護' },
  { id: 'counseling', title: '用藥衛教', description: '注射筆、吸入劑與藥品諮詢' },
  { id: 'chinese', title: '中藥訓練', description: '飲片辨識與中藥用藥安全' },
  { id: 'other', title: '其他課程', description: '其他主題與待分類影片' },
];

export const getVideoSeries = (video) => {
  if ((video.title || '').startsWith('管制藥品與注意事項')) return '管制藥品管理';
  if ((video.title || '').includes('中藥')) return '中藥訓練';
  return video.category?.trim() || '未分類';
};

export const getVideoTopic = (video) => {
  const series = getVideoSeries(video);
  if (/智慧藥櫃|分包機|包藥機|設備操作|故障排除/.test(series)) return 'equipment';
  if (/處方|調劑|管制藥品管理|智慧藥庫|藥品管理|系統操作/.test(series)) return 'dispensing';
  if (/特殊製劑|化療|無菌|TPN/i.test(series)) return 'preparation';
  if (/臨床|照護/.test(series)) return 'clinical';
  if (/諮詢|衛教/.test(series)) return 'counseling';
  if (/中藥/.test(series)) return 'chinese';
  return 'other';
};

const sequence = (title) => Number((title || '').match(/[-－](\d{1,2})/)?.[1] ?? Number.MAX_SAFE_INTEGER);
export const compareVideos = (a, b) => sequence(a.title) - sequence(b.title)
  || (a.title || '').localeCompare(b.title || '', 'zh-Hant', { numeric: true });

export const getVideoEmbedUrl = (value) => {
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol)) return '';
    const host = url.hostname.replace(/^(www\.|m\.)/, '');
    if (host === 'youtu.be' || host === 'youtube.com') {
      const id = host === 'youtu.be' ? url.pathname.slice(1)
        : url.searchParams.get('v') || url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1];
      if (/^[\w-]{11}$/.test(id || '')) return `https://www.youtube.com/embed/${id}`;
    }
    if (host === 'drive.google.com') {
      const id = url.pathname.match(/\/file\/d\/([\w-]+)/)?.[1] || url.searchParams.get('id');
      if (/^[\w-]+$/.test(id || '')) return `https://drive.google.com/file/d/${id}/preview`;
    }
  } catch { /* 外部連結沒有內嵌播放器。 */ }
  return '';
};

export const buildTrainingTargets = (items = []) => {
  const groups = new Map();
  items.filter(item => item.id && item.title?.trim()).forEach(item => {
    const key = `${item.category_id}::${item.title}`;
    if (!groups.has(key)) groups.set(key, {
      id: item.id, title: item.title, categoryId: item.category_id,
      categoryName: item.category_name, items: [],
    });
    groups.get(key).items.push(item);
  });
  return [...groups.values()];
};

export const fetchTrainingItems = async (signal) => {
  // 不指定學員，只取得共用訓練目錄；不保存學員評核紀錄。
  const response = await fetch(`${TRAINING_API_URL}?type=getData&studentEmail=`, { signal });
  if (!response.ok) throw new Error('無法讀取訓練目錄');
  const data = await response.json();
  if (data.status === 'error' || !Array.isArray(data.items)) throw new Error(data.message || '訓練目錄格式錯誤');
  return data.items;
};

export const getLinkedTrainingTargets = (video, targets) => targets.filter(target =>
  target.items.some(item => (video.trainingItemIds || []).includes(item.id)));

export const getTrainingVideoIds = (videos, itemIds) => {
  const ids = new Set(Array.isArray(itemIds) ? itemIds : [itemIds]);
  return videos.filter(video => (video.trainingItemIds || []).some(id => ids.has(id)))
    .sort(compareVideos).map(video => video.id);
};

export const auditVideoLinks = (videos, targets) => {
  const validIds = new Set(targets.flatMap(target => target.items.map(item => item.id)));
  return videos.map(video => ({
    video,
    targets: getLinkedTrainingTargets(video, targets),
    invalidIds: (video.trainingItemIds || []).filter(id => !validIds.has(id)),
  }));
};
