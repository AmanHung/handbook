// 里程碑來源：里程碑.xlsx 的能力代碼，以及使用者提供的六大核心能力對照圖。
// Excel 中的數值為範例，不是任何學員的評核結果，也不作為達標門檻。

export const KSA_PHASES = [
  { id: 1, label: '第 1 次（學前評估）' },
  { id: 2, label: '第 2 次（半年）' },
  { id: 3, label: '第 3 次（一年）' },
  { id: 4, label: '第 4 次（一年半）' },
  { id: 5, label: '第 5 次（兩年）' }
];

export const KSA_MILESTONE_VERSION = 'milestone-v1';
// GAS 的舊 KSA 紀錄以 1–5 為 phaseId；新里程碑使用獨立的 101–105，避免覆寫舊評核。
export const toMilestonePhaseId = phaseId => Number(phaseId) + 100;
export const fromMilestonePhaseId = phaseId => Number(phaseId) - 100;

export const KSA_SCORE_OPTIONS = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
export const isMilestoneRecord = record => {
  const phaseId = Number(record?.phaseId);
  const hasMilestoneScores = Object.keys(record?.scores || {}).some(id =>
    /^(PC[1-6]|PK|SBP[1-2]|CPD[1-2]|PROF[1-2]|ICS[1-2])$/u.test(id)
  );
  return hasMilestoneScores && phaseId >= 101 && phaseId <= 105;
};

export const KSA_DOMAINS = [
  {
    id: 'patient_care', code: 'PC', title: '病人照護（Patient care）', color: '#2563EB',
    items: [
      { id: 'PC1', label: '適當藥品提供' }, { id: 'PC2', label: '用藥合理性評估' },
      { id: 'PC3', label: '提出治療建議' }, { id: 'PC4', label: '藥品治療追蹤和監測' },
      { id: 'PC5', label: '提供藥品諮詢和衛教' }, { id: 'PC6', label: '用藥整合及連貫性照護' }
    ]
  },
  { id: 'pharmacotherapy_knowledge', code: 'PK', title: '藥學知識（Pharmacotherapy knowledge）', color: '#7C3AED', items: [{ id: 'PK', label: '運用專業知識' }] },
  {
    id: 'system_based_practice', code: 'SBP', title: '系統下執業（System-based practice）', color: '#0891B2',
    items: [{ id: 'SBP1', label: '結合醫療體系資源於病人照護' }, { id: 'SBP2', label: '運用資訊科技提升病人安全及照護品質' }]
  },
  {
    id: 'continuing_professional_development', code: 'CPD', title: '持續的專業發展（Continuing professional development）', color: '#0D9488',
    items: [{ id: 'CPD1', label: '品管概念納入工作中' }, { id: 'CPD2', label: '從工作中成長' }]
  },
  {
    id: 'professionalism', code: 'PROF', title: '專業素養（Professionalism）', color: '#D97706',
    items: [{ id: 'PROF1', label: '專業表現' }, { id: 'PROF2', label: '當責' }]
  },
  {
    id: 'interpersonal_communication', code: 'ICS', title: '人際關係與溝通技巧（Interpersonal relationship and communication skills）', color: '#DB2777',
    items: [{ id: 'ICS1', label: '以病人為中心的溝通' }, { id: 'ICS2', label: '與醫療團隊成員溝通' }]
  }
];

export const LEGACY_KSA_DOMAINS = [
  { title: '專業知識', items: [{ id: 'k1', label: '臨床判斷' }, { id: 'k2', label: '治療準則' }, { id: 'k3', label: '文獻應用' }, { id: 'k4', label: '學術研究' }] },
  { title: '專業技能', items: [{ id: 's1', label: '藥物衛教' }, { id: 's2', label: '處方評估' }, { id: 's3', label: '調劑作業' }, { id: 's4', label: '臨床藥事' }] },
  { title: '專業態度', items: [{ id: 'a1', label: '溝通尊重' }, { id: 'a2', label: '照顧負責' }, { id: 'a3', label: '團隊合作' }, { id: 'a4', label: '學習熱忱' }] }
];
