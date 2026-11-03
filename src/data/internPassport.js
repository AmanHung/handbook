// 依「藥劑科實習生訓練計畫11409.docx」逐項對應，不套用 PGY 評核門檻。
export const INTERN_PLAN_VERSION = '11409';
export const INTERN_PLAN_TITLE = '藥劑科實習生訓練計畫（114 年 9 月修訂）';

const makeItems = (prefix, titles, source = '附件 1') => titles.map((title, index) => ({
  id: `${prefix}_${String(index + 1).padStart(2, '0')}`, title, source,
}));

export const INTERN_DOMAINS = [
  { id: 'outpatient', title: '門、急診藥局', shortTitle: '門急診', duration: '4–8 週',
    description: '從認識藥品到處方評估，於指導藥師監督下學習調劑與交付。',
    items: makeItems('intern_opd', ['認識門急診作業流程', '全自動包藥機作業', '認識外用藥', '認識調劑台藥品', '口服及外用藥調劑', '兒科處方調劑', '藥品交付禮儀', '處方用藥評估', '認識特殊／管制藥品管理流程', '認識疫苗管理流程', '外用製劑及酒精稀釋配製', '科學中藥調劑']),
    supplements: makeItems('intern_opd_extra', ['藥局盤點流程及注意事項', '外用台藥物諮詢與實作', '5S 與效期稽核作業流程'], '正文・門急診實習項目'),
  },
  { id: 'inpatient', title: '住院藥局', shortTitle: '住院', duration: '4–8 週',
    description: '熟悉 UDD 作業、資訊系統與住院病人用藥評估。',
    items: makeItems('intern_ipd', ['認識 UDD 作業流程', 'UD 藥車調劑', '認識冷藏藥品', '認識資訊作業系統', '認識全自動包藥機作業系統', '首日量及臨時處方調劑', '兒科磨粉處方調劑', '合理用藥評估', '病人用藥指導', '認識常備藥管理與核發作業', '認識特殊／管制藥品管理流程']),
    supplements: makeItems('intern_ipd_extra', ['認識口服與針劑藥品', '問題處方討論', '病房常備藥品及急救車查核', '病房管制藥品服藥及退藥稽核'], '正文・住院實習項目'),
  },
  { id: 'inventory', title: '藥品管理', shortTitle: '藥庫', duration: '1–2 週',
    description: '連結採購、驗收、庫存與藥品品質管理。',
    items: makeItems('intern_inv', ['認識藥品庫存管理作業', '藥品採購、進貨及驗收', '藥品驗收與上架', '藥品效期管理', '藥品撥補作業流程', '認識藥品安全存量控管', '缺貨及緊急調藥之處理流程', '品質異常之藥品處理', '認識庫存管理作業資訊系統', '電腦庫存系統與醫令處方開立之關係', '藥事委員會作業及藥品異動處理原則']),
    supplements: makeItems('intern_inv_extra', ['藥品編碼與特殊藥品設限', '管制藥品儲存領用與醫藥單位管理'], '正文・藥品管理實習項目'),
  },
  { id: 'consultation', title: '藥物諮詢', shortTitle: '藥物諮詢', duration: '依排程安排',
    description: '練習可靠的資訊查詢、問題回覆及病人用藥指導。',
    items: makeItems('intern_di', ['病人用藥指導技巧', '藥物諮詢服務技巧', '藥物資訊蒐集與分析']), supplements: [],
  },
  { id: 'clinical', title: '臨床藥學及學術', shortTitle: '臨床學術', duration: '4 週',
    description: '以案例討論與文獻閱讀，培養評估及表達能力。',
    items: makeItems('intern_cli', ['藥物不良反應通報作業', '住院病人臨床訪視與藥物治療評估', '文獻檢索與整理', '專題報告準備及報告技巧']),
    supplements: makeItems('intern_cli_extra', ['臨床藥學服務基本概念', '電子期刊與藥物資料庫應用', '前台民眾用藥衛教', '機構訪視用藥服務或偏鄉巡迴醫療', '翻轉式教學 Case book 案例討論'], '正文・臨床藥學實習項目'),
  },
  { id: 'sterile', title: '特殊藥品調配', shortTitle: '特殊調配', duration: 'TPN、化療各 1 週',
    description: '認識無菌製劑及化療流程；化療調配以生理食鹽水模擬。',
    items: makeItems('intern_sp', ['全靜脈營養輸液（TPN）作業流程介紹', 'TPN 之無菌調配操作', 'PCA 之無菌調配操作', 'Penicillin skin test 調配作業', 'TPN 輸液之計算與評估', '認識化療室作業流程', '認識化療室設備及防護措施', '認識化療藥品', '化學治療藥品調配操作（生理食鹽水模擬）']),
    supplements: makeItems('intern_sp_extra', ['無菌調配設備與機器介紹', '化療處方評估'], '正文・特殊藥品調配實習項目'),
  },
];

export const INTERN_BASE_ITEMS = INTERN_DOMAINS.flatMap(domain => domain.items);
export const INTERN_ALL_ITEMS = INTERN_DOMAINS.flatMap(domain => [...domain.items, ...domain.supplements]);
export const getInternTrainingGroups = (latest, showAll = false) => INTERN_DOMAINS.map(domain => ({
  ...domain,
  visibleItems: [...domain.items, ...domain.supplements].filter(item => showAll || latest[`training:${item.id}`]?.payload.status !== 'pass'),
  progress: Math.round(domain.items.filter(item => latest[`training:${item.id}`]?.payload.status === 'pass').length / domain.items.length * 100),
})).filter(domain => domain.visibleItems.length > 0);
export const SPOT_TEST_ITEMS = ['全自動包藥機作業', '口服及外用藥調劑', '兒科處方調劑', '科學中藥調劑', 'UD 藥車調劑', '處方用藥評估', '病人用藥指導', '化學治療藥品調配操作', 'TPN 之無菌調配操作'];

const communicationItems = ['正確介紹自己並維持醫病角色', '引導病人正確及完整陳述', '病人病歷與藥物資訊查詢技巧', '能以病人慣用語言清楚溝通', '重點回答病人問題', '訪談順暢及有邏輯性', '提升病人瞭解疾病程度', '適當告知疾病及治療', '明瞭病人的不安及適時安撫', '使病人對藥師產生尊重與信任', '適宜地結束諮詢'];
export const INTERN_OSCE_STATIONS = [
  { id: 'phone', title: '民眾電話用藥諮詢', source: '附件 4-1', items: communicationItems },
  { id: 'dispensing', title: '門診處方調劑與評估', source: '附件 4-2', items: ['藥品調劑與三讀執行', '特殊高價及管制藥品的調劑', '疑義處方之判斷能力', '與醫師溝通技巧', '時間的掌握能力'] },
  { id: 'face_to_face', title: '病人面對面藥物諮詢', source: '附件 4-3', items: communicationItems.map((item, index) => index === 2 ? '病史詢問技巧及完整性' : item) },
  { id: 'unit_dose', title: '單一劑量處方評估', source: '附件 4-4', items: ['處方合理性檢視', '病人資料查詢', '相關臨床檢驗數據判讀', '藥物資訊查詢技巧與來源正確性', '整理資訊並提出合理建議', '與醫師溝通技巧', '獨立與邏輯思考能力'] },
];
export const SAFETY_ITEMS = [
  { id: 'infection_written', title: '感控教育筆試', mode: 'score', description: '達 80 分通過，未通過須重測。' },
  { id: 'handwashing', title: '洗手實作測驗', mode: 'score', description: '達 80 分通過，未通過須重測。' },
  { id: 'ppe', title: '抗腫瘤藥物安全防護裝備 DOPS', mode: 'ppe', description: '依附件 5，記錄 PPE 穿戴與脫除項目及教師判定。' },
  { id: 'spill', title: '化療藥品潑灑處理訓練', mode: 'participation', description: '記錄參訓日期及指導藥師確認。' },
  { id: 'equipment', title: '藥局儀器操作安全訓練', mode: 'participation', description: '全自動錠劑分包機、小兒科磨粉分包機等。' },
];
// 保留 11409 文件版本的評核名稱；實際操作依院內現行 SOP 與教師指導。
export const PPE_ITEMS = [
  '穿戴：穿上鞋套', '穿戴：隔離帽並包覆頭髮', '穿戴：手術用口罩與外層活性碳口罩', '穿戴：徹底洗手拭乾', '穿戴：防水隔離衣並綁緊', '穿戴：雙層手套與袖口位置',
  '脫除：外層手套放入夾鏈袋密封', '脫除：隔離衣', '脫除：內層手套', '脫除：兩層口罩', '脫除：隔離帽與基因毒性廢棄物分類', '脫除：徹底洗手拭乾',
];
export const DELIVERABLES = [
  { id: 'literature', title: '文獻閱讀心得報告', weight: 10 },
  { id: 'topic', title: '專題報告', weight: 15 },
  { id: 'oral', title: '口頭報告紀錄', description: '學術專題、用藥評估或臨床個案報告。' },
  { id: 'reflection', title: '實習心得報告', finalWeek: true },
];
export const SCORE_DEPARTMENTS = ['門診', '住院', '藥庫', '臨床及學術', '化療', 'TPN', '藥物諮詢'];
export const SCORE_DIMENSIONS = [{ id: 'knowledge', title: '專業知識', max: 20 }, { id: 'practice', title: '實務操作', max: 20 }, { id: 'attitude', title: '學習態度', max: 15 }, { id: 'learning', title: '學習能力', max: 10 }, { id: 'expression', title: '表達能力', max: 10 }];
export const FEEDBACK_FORMS = [
  { id: 'self', title: '實習生自我評估', source: '附件 7', labels: ['從不', '很少', '偶爾', '經常', '總是'], values: [1, 2, 3, 4, 5],
    items: ['以主動積極的態度學習各項業務', '遵守各項工作守則', '正確、即時完成被分派的任務', '尊重藥師的指導與建議', '認真思考問題的解決之道', '以符合邏輯的方法處理問題', '依問題重要性及嚴重度安排順序', '釐清所有藥物相關問題', '遇到不懂或不確定的問題主動查閱文獻', '使用已被確認的文獻資料來源', '以誠懇、親切的態度互動', '與醫療人員、病人及民眾互動時展現專業行為'] },
  { id: 'satisfaction', title: '實習生滿意度調查', source: '附件 8', labels: ['非常不滿意', '不滿意', '沒意見', '滿意', '非常滿意'], values: [1, 2, 3, 4, 5],
    items: ['適度安排實習課程及工作進度', '提供明確的作業規範', '提供充足機會瞭解藥事作業', '提供與其他專業人員合作的機會', '提供認識院內相關單位的機會', '學習寶貴的藥事服務經驗', '提供足夠資源完成實習課程', '主管清楚告知實習目標及主題', '指導藥師適時提醒標準作業方法', '指導藥師安排的作業有助專業知識', '指導藥師熱心教導', '指導藥師有足夠時間指導', '指導藥師適時加強不足之處', '實習場所氣氛融洽', '實習環境及設備充足', '提出的問題得到適當回應', '受到藥師適當照顧', '實習課程對將來執業有幫助'] },
  { id: 'teacher', title: '指導教師教學評估', source: '附件 9', labels: ['待加強', '尚可', '佳', '極佳'], values: [4, 6, 8, 10],
    items: ['藥學專業知識', '教學態度', '教學熱忱', '敬業精神', '教學方法與技巧', '解說、表達能力', '人際溝通能力', '解決工作問題的能力', '協助學員解決學習問題的能力', '協助學員解決問題的熱忱'] },
];

import { projectDopsRecords, matchingAssessmentFeedback, sortAssessments } from '../utils/dopsWorkflow.js';

export const getLatestEntries = entries => [...entries].sort((a, b) => {
  const millis = entry => entry.createdAt?.toMillis?.() ?? ((entry.createdAt?.seconds || 0) * 1000);
  return millis(a) - millis(b) || String(a.id).localeCompare(String(b.id));
}).reduce((result, entry) => ({ ...result, [`${entry.kind}:${entry.targetId}${entry.kind === 'dops' ? `:${entry.payload.instanceId}` : ['osceFeedback', 'dopsFeedback'].includes(entry.kind) && entry.payload.assessmentId ? `:${entry.payload.assessmentId}` : ''}`]: entry }), {});

export const getSafetyRecord = (latest, id) => {
  const legacy = latest[`safety:${id}`];
  if (id !== 'ppe') return legacy;
  const entries = Object.values(latest);
  const dops = sortAssessments(entries).filter(entry => entry.kind === 'dops' && entry.targetId === 'dops_chemo_ppe').at(-1);
  if (!dops || legacy && sortAssessments([legacy, dops]).at(-1).id === legacy.id) return legacy;
  const record = projectDopsRecords(entries, 'dops_chemo_ppe').find(item => item.assessmentId === dops.id);
  return { ...dops, payload: { ...dops.payload, status: record.status === 'completed' ? 'pass' : record.status === 'needs_improvement' ? 'reinforce' : record.status } };
};

export const getTrainingProgress = latest => {
  const complete = INTERN_BASE_ITEMS.filter(item => latest[`training:${item.id}`]?.payload.status === 'pass').length;
  return { complete, total: INTERN_BASE_ITEMS.length, percent: Math.round(complete / INTERN_BASE_ITEMS.length * 100) };
};
export const numericScore = (value, max = 100) => (typeof value === 'number' || typeof value === 'string' && value.trim() !== '') && Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= max;
export const calculateFinalScore = payload => {
  if (!payload || !SCORE_DEPARTMENTS.every((_, index) => SCORE_DIMENSIONS.every(dim => numericScore(payload.scores?.[`${index}_${dim.id}`], dim.max)))
    || !numericScore(payload.literature) || !numericScore(payload.topic)) return null;
  const departmentAverage = SCORE_DEPARTMENTS.reduce((total, _, index) => total + SCORE_DIMENSIONS.reduce((sum, dim) => sum + Number(payload.scores[`${index}_${dim.id}`]), 0), 0) / SCORE_DEPARTMENTS.length;
  return Math.round((departmentAverage + Number(payload.literature) * 0.1 + Number(payload.topic) * 0.15) * 100) / 100;
};
export const getCompletionChecks = latest => [
  { id: 'training', title: '附件 1 的 50 項訓練評核及格', done: getTrainingProgress(latest).percent === 100 },
  { id: 'retests', title: '已安排之測驗與增列課程無待加強項目', done: !Object.values(latest).some(entry => entry.payload.status === 'reinforce') },
  ...INTERN_OSCE_STATIONS.map(station => ({ id: station.id, title: `OSCE：${station.title}`, done: latest[`osce:${station.id}`]?.payload.status === 'pass' })),
  ...SAFETY_ITEMS.map(item => ({ id: item.id, title: item.title, done: getSafetyRecord(latest, item.id)?.payload.status === 'pass' })),
  { id: 'dops', title: '已安排的 DOPS 完成學員回饋並通過', done: [...new Set(Object.values(latest).filter(entry => entry.kind === 'dops').map(entry => entry.targetId))].every(id => projectDopsRecords(Object.values(latest), id)[0]?.status === 'completed') },
  ...DELIVERABLES.map(item => ({ id: item.id, title: item.title, done: latest[`review:${item.id}`]?.payload.status === 'pass' && Boolean(latest[`deliverable:${item.id}`]) && latest[`review:${item.id}`]?.payload.submissionId === latest[`deliverable:${item.id}`]?.id })),
  ...FEEDBACK_FORMS.map(form => ({ id: form.id, title: form.title, done: Boolean(latest[`feedback:${form.id}`]) })),
  ...INTERN_OSCE_STATIONS.map(station => ({ id: `feedback_${station.id}`, title: `OSCE 雙向回饋：${station.title}`, done: Boolean(matchingAssessmentFeedback(latest[`osce:${station.id}`], Object.values(latest), 'osceFeedback')) })),
  { id: 'final', title: '完成實習生學習評估及總成績', done: calculateFinalScore(latest['final:overall']?.payload) !== null },
];

export const getRetestHint = entry => {
  if (entry.kind === 'exam' && entry.payload.status !== 'pass') return entry.payload.mode === 'spot' ? '經教師糾正後，得於隔天重新測驗。' : '未達 80 分，得於一週內重新測驗。';
  if (entry.payload.status === 'reinforce') return '需另行加強訓練並重新評核。';
  return '';
};
