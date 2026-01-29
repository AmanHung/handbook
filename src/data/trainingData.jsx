// 藥師 PGY / 新進人員訓練計畫表
// 每個項目都增加了 id 以便資料庫追蹤狀態

export const trainingCategories = [
  {
    id: "outpatient",
    title: "門診調劑作業",
    description: "學習門診處方調劑流程、藥品辨識與核對規範。",
    items: [
      { id: "opd_01", title: "調劑台藥品排列邏輯與儲位管理" },
      { id: "opd_02", title: "一般處方調劑流程 (收單、調劑、核對)" },
      { id: "opd_03", title: "慢性病連續處方箋作業規範" },
      { id: "opd_04", title: "管制藥品調劑與紀錄規範" },
      { id: "opd_05", title: "磨粉作業標準流程 (SOP)" },
      { id: "opd_06", title: "疑義處方辨識與處理流程" }
    ]
  },
  {
    id: "inpatient",
    title: "住院調劑作業",
    description: "熟悉單一劑量配送 (UDDS) 作業與住院藥局臨床服務。",
    items: [
      { id: "ipd_01", title: "UD 車作業流程 (配藥、核車、送車)" },
      { id: "ipd_02", title: "針劑室調配作業與無菌觀念" },
      { id: "ipd_03", title: "緊急用藥 (Stat) 處理流程" },
      { id: "ipd_04", title: "退藥處理與帳務管理" },
      { id: "ipd_05", title: "特殊藥品 (高警訊、冷藏) 管理" }
    ]
  },
  {
    id: "clinical",
    title: "臨床藥事服務",
    description: "藥物諮詢、TDM、ADR 通報與藥事照護。",
    items: [
      { id: "cli_01", title: "藥物諮詢服務與資源查詢技巧" },
      { id: "cli_02", title: "Warfarin 用藥指導與衛教" },
      { id: "cli_03", title: "吸入劑 (Inhaler) 操作衛教" },
      { id: "cli_04", title: "胰島素筆針操作衛教" },
      { id: "cli_05", title: "藥物不良反應 (ADR) 通報流程" }
    ]
  },
  {
    id: "admin",
    title: "行政與法規",
    description: "藥事法規、庫存管理與品質監測。",
    items: [
      { id: "adm_01", title: "藥品庫存管理與盤點作業" },
      { id: "adm_02", title: "溫溼度監測與記錄" },
      { id: "adm_03", title: "效期管理與滯銷藥品處理" },
      { id: "adm_04", title: "麻醉藥品管理條例基礎" }
    ]
  }
];

// 為了相容舊版程式碼 (如 AdminPage 或其他組件可能還在引用舊名稱)，增加此匯出別名
export const PASSPORT_CATEGORIES = trainingCategories;