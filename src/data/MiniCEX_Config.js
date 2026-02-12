// src/data/MiniCEX_Config.js

export const MINICEX_TOPICS = [
  {
    id: 'minicex_01',
    title: '門診病人藥品諮詢',
    description: '針對門診病人進行藥物諮詢與衛教之臨床演練評量'
  }
];

export const COMPLEXITY_OPTIONS = {
  medication: [
    { value: 'low', label: '低 (少於5項)' },
    { value: 'medium', label: '中 (5~10項)' },
    { value: 'high', label: '高 (多於10項)' }
  ],
  disease: [
    { value: 'low', label: '低 (主診斷少於3項)' },
    { value: 'medium', label: '中 (4~6項)' },
    { value: 'high', label: '高 (多於6項)' }
  ]
};

export const EVALUATION_ITEMS = [
  { id: 'item_1', label: '1. 檢閱藥歷 (Reviewing)' },
  { id: 'item_2', label: '2. 醫療面談 (Interviewing)' },
  { id: 'item_3', label: '3. 諮商衛教 (Counseling)' },
  { id: 'item_4', label: '4. 人道專業 (Humanism)' },
  { id: 'item_5', label: '5. 組織效率 (Organization)' },
  { id: 'item_6', label: '6. 臨床判斷 (Clinical Judgment)' },
  { id: 'item_7', label: '7. 整體評估 (Overall Competence)' }
];

export const SCORE_RANGES = [
  { min: 1, max: 3, label: '低於期待', color: 'bg-red-50 text-red-700 border-red-200' },
  { min: 4, max: 6, label: '合乎期待', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { min: 7, max: 9, label: '超乎期待', color: 'bg-green-50 text-green-700 border-green-200' }
];

export const getScoreStyle = (score) => {
  if (!score) return '';
  if (score <= 3) return SCORE_RANGES[0].color;
  if (score <= 6) return SCORE_RANGES[1].color;
  return SCORE_RANGES[2].color;
};
