// src/data/KSA_Config.js

export const KSA_PHASES = [
  { id: 1, label: '第1次 (學前評估)' },
  { id: 2, label: '第2次 (半年)' },
  { id: 3, label: '第3次 (一年)' },
  { id: 4, label: '第4次 (一年半)' },
  { id: 5, label: '第5次 (兩年)' }
];

export const KSA_DOMAINS = [
  {
    id: 'knowledge',
    title: '專業知識 (Knowledge)',
    items: [
      { id: 'k1', label: '臨床判斷' },
      { id: 'k2', label: '治療準則' },
      { id: 'k3', label: '文獻應用' },
      { id: 'k4', label: '學術研究' }
    ]
  },
  {
    id: 'skills',
    title: '專業技能 (Skills)',
    items: [
      { id: 's1', label: '藥物衛教' },
      { id: 's2', label: '處方評估' },
      { id: 's3', label: '調劑作業' },
      { id: 's4', label: '臨床藥事' }
    ]
  },
  {
    id: 'attitude',
    title: '專業態度 (Attitude)',
    items: [
      { id: 'a1', label: '溝通尊重' },
      { id: 'a2', label: '照顧負責' },
      { id: 'a3', label: '團隊合作' },
      { id: 'a4', label: '學習熱忱' }
    ]
  }
];

// 分數定義
export const SCORING_RANGES = {
  improvement: { min: 1, max: 3, label: '有待加強', color: 'bg-red-100 text-red-700' },
  expected: { min: 4, max: 6, label: '達到預期標準', color: 'bg-blue-100 text-blue-700' },
  excellent: { min: 7, max: 9, label: '表現優秀', color: 'bg-green-100 text-green-700' }
};

export const getScoreStyle = (score) => {
  if (!score) return 'bg-gray-50';
  if (score <= 3) return SCORING_RANGES.improvement.color;
  if (score <= 6) return SCORING_RANGES.expected.color;
  return SCORING_RANGES.excellent.color;
};
