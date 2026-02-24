// src/data/OSCE_Config.js

export const OSCE_TOPICS = [
  {
    id: 'osce_01',
    title: '醫療人員藥品諮詢',
    description: '客觀結構化臨床技能評量 (OSCE) - 醫療人員藥品諮詢站'
  }
];

export const OSCE_ITEMS = [
  { id: 'item_01', label: '1. 自我介紹(說出藥師身份及姓名)' },
  { id: 'item_02', label: '2. 確認提問者身份（ICU 護理師）' },
  { id: 'item_03', label: '3. 簡述Simdax作用機轉（增加心收縮力/鈣增敏作用）' },
  { id: 'item_04', label: '4. 說明Simdax配置方式' },
  { id: 'item_05', label: '5. 說明建議投與速率（一般 infusion rate 約 0.05–0.2 mcg/kg/min）與多久施打一次' },
  { id: 'item_06', label: '6. 解釋主要監測指標（BP、HR、尿量、電解質）' },
  { id: 'item_07', label: '7. 說明禁忌或注意事項（如SBP<90勿使用）' },
  { id: 'item_08', label: '8. 說明常見副作用（如低血壓、頭痛、心律不整）' },
  { id: 'item_09', label: '9. 說明可考慮不給 loading dose，以降低低血壓風險' },
  { id: 'item_10', label: '10. 正確說明 Simdax 停藥後藥效可持續約 7–9 天（因活性代謝物 OR-1896）' },
  { id: 'item_11', label: '11. 能提供進一步協助方式（可再聯絡藥師或查院內資訊）' },
  { id: 'item_12', label: '12. 禮貌結束對話' },
  { id: 'item_13', label: '13. 表達流暢、語調平穩' },
  { id: 'item_14', label: '14. 溝通態度積極親切' },
  { id: 'item_15', label: '15. 回應護理師問題準確度' }
];

export const OSCE_FEEDBACK_OPTIONS = {
  attitude: [
    '溫和有禮', '漫不經心', '穩重', '緊張', '態度自然', 
    '停頓；空白', '慢條思理', '說話聲音小，不清晰', '語調平穩清晰', '語調高亢'
  ],
  skills: [
    '熟練順暢', '不熟練', '評估完整詳細', '多處遺漏', '解說清楚', '未能清楚地向護理師解說'
  ]
};

export const getOSCEResult = (totalScore) => {
  if (totalScore < 45) {
    return { label: '未通過 (重新訓練後一週後重測)', color: 'bg-red-100 text-red-700 border-red-200' };
  } else if (totalScore <= 69) {
    return { label: '尚可', color: 'bg-orange-100 text-orange-700 border-orange-200' };
  } else {
    return { label: '優良', color: 'bg-green-100 text-green-700 border-green-200' };
  }
};
