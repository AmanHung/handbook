// 學習護照的訓練項目來自 Google Apps Script，SOP 則存放於 Firestore。
// 以固定的訓練項目 ID 與 SOP 文件 ID 建立關聯，避免標題更名後連結失效。

const TITLE_SOP_LINKS = {
  '外用藥與自動藥包機': ['SBsg2vz2zFMSE8AP3A8I', 'XYT6xNCe2QCtosVK2P26'],
  '排裝藥品調劑': ['SBsg2vz2zFMSE8AP3A8I', 'XYT6xNCe2QCtosVK2P26'],
  '兒科磨粉處方調劑': ['jD9IkFuf8Y5oApylLlKi'],
  '藥品交付': ['XtMROHOCoQOG3fP9CQ6E'],
  '處方評估與疑義處方處理': ['CQnTcItPk2otezMbCFl6'],
  '急診調劑作業': ['BhEUrj7edHb32GFThidf'],
  '醫令系統當機應變(當機演練)': ['Pb943UAdRIB6diPdjGag'],
  '住院UD藥車調劑': ['SBVs1SaZ7i206URqYRXy'],
  '醫令系統之UD用藥及病人資料查詢': ['SBVs1SaZ7i206URqYRXy', 'ujvEu7CPn48EFZDa1FxV'],
  '住院退藥作業及裸錠辨識': ['sIFVZA6dGsPJ0voOteFs'],
  '各單位(如麻醉科、胃鏡室…等)之常備藥品核發作業': ['qWGmkMrfVxp2pLqr8U3R'],
  '管制藥品管理與法規(包含調劑、退藥及銷毀)': ['hgVFnK99u1lYVhT4PApv', '4sBjsF2yIyp02k5gXiPQ'],
  '病房常備藥品查核(急救盤、管制藥)': ['qWGmkMrfVxp2pLqr8U3R'],
  '病房管制藥品服藥及退藥稽核': ['hgVFnK99u1lYVhT4PApv'],
  '病人用藥安全管理': ['CQnTcItPk2otezMbCFl6'],
  '異常事件通報及危機應變': ['CQnTcItPk2otezMbCFl6', '4sBjsF2yIyp02k5gXiPQ'],
};

const ITEM_SOP_LINKS = {
  opd_5: ['Pb943UAdRIB6diPdjGag', 'ujvEu7CPn48EFZDa1FxV', 'mCZIu8kaIfolWpBhzwiF'],
  opd_7: ['xi7Yyqu2I44OSwmDde7t'],
  opd_8: ['1U7rLMvZdcKr7IGjU3Fl'],
  opd_9: ['xi7Yyqu2I44OSwmDde7t', 'WNaSTHau11EHRzKuZTHV', '9rvyyT6I3eqqs4Pbmurg'],
  opd_17: ['hgVFnK99u1lYVhT4PApv', 'rbQnmMSUuWHqquHt5WhP'],
  opd_18: ['OIBFA4aOZmmuk3DA1kbB'],
  opd_24: ['pV378bN1S3jAv0EYTOiU'],
  opd_25: ['aEnnf6C8ivpzPRyBjr3w'],
  opd_31: ['CQnTcItPk2otezMbCFl6'],
  opd_35: ['OIBFA4aOZmmuk3DA1kbB'],
  opd_40: ['qWGmkMrfVxp2pLqr8U3R'],
  opd_42: ['rbQnmMSUuWHqquHt5WhP', 'hgVFnK99u1lYVhT4PApv'],
  opd_44: ['aEnnf6C8ivpzPRyBjr3w'],
  opd_45: ['Pb943UAdRIB6diPdjGag'],
  opd_46: ['H2mHtxpq49RCOAkaMnPD', 'Q3GDbn1bUKvLbkg72lxe'],
  ud_11: ['CQnTcItPk2otezMbCFl6'],
  ud_13: ['hgVFnK99u1lYVhT4PApv', '4sBjsF2yIyp02k5gXiPQ'],
  ud_14: ['qWGmkMrfVxp2pLqr8U3R'],
  ud_15: ['hgVFnK99u1lYVhT4PApv'],
};

// SOP 速查的文件會持續新增，因此訓練「大分類」採用文件分類與標題規則動態歸類。
// 規則由上而下判斷；較明確的標題規則優先於 SOP 分類的預設去向。
const SOP_TITLE_CATEGORY_RULES = [
  {
    categoryId: 'UD',
    keywords: ['住院 UD', '住院退藥', '病房藥品', '常備藥急救盤', '管制藥品減損'],
  },
  {
    categoryId: 'MS',
    keywords: ['疫苗管理', 'Paxlovid'],
  },
  {
    categoryId: 'extra',
    keywords: ['藥局開門', '藥局關門', '請假規定', '藥局升降梯', '颱風天宣布停班'],
  },
];

const SOP_CATEGORY_TRAINING_LINKS = {
  '行政流程': 'OPD',
  '系統操作': 'OPD',
  '教學訓練': 'extra',
  '管制藥品智慧藥櫃': 'OPD',
  '調劑規範': 'OPD',
  '藥品諮詢': 'DI',
};

export const getTrainingSopIds = (item) => {
  const titleLinks = TITLE_SOP_LINKS[item?.title] || [];
  const itemLinks = ITEM_SOP_LINKS[item?.id] || [];
  return [...new Set([...titleLinks, ...itemLinks])];
};

export const getSopTrainingCategoryId = (sop) => {
  const title = sop?.title || '';
  const titleRule = SOP_TITLE_CATEGORY_RULES.find(rule =>
    rule.keywords.some(keyword => title.includes(keyword))
  );

  if (titleRule) return titleRule.categoryId;

  // 未知的新分類先放入「加強訓練項目」，避免任何 SOP 成為無法從護照開啟的孤立文件。
  return SOP_CATEGORY_TRAINING_LINKS[sop?.category] || 'extra';
};

export const getCategorySopIds = (categoryId, sopsById) =>
  Object.values(sopsById || {})
    .filter(sop => getSopTrainingCategoryId(sop) === categoryId)
    .sort((a, b) => (a.title || '').localeCompare(b.title || '', 'zh-Hant'))
    .map(sop => sop.id);
