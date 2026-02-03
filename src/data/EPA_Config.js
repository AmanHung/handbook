/**
 * EPA 評估表單設定檔
 * 資料來源：EPA表單.docx (113.03訂定)
 * 存放路徑：src/data/EPA_Config.js
 */

// 1. 共用的信賴等級選項 (Level 1-5)
export const EPA_LEVEL_OPTIONS = [
  { value: "2a", label: "Level 2a: 教師在旁逐步協助" },
  { value: "2b", label: "Level 2b: 教師在旁必要時協助" },
  { value: "3a", label: "Level 3a: 教師事後逐項確認" },
  { value: "3b", label: "Level 3b: 教師事後重點確認" },
  { value: "3c", label: "Level 3c: 必要時請教師確認" },
  { value: "4", label: "Level 4: 獨立執行" },
  { value: "5", label: "Level 5: 可指導其他人" }
];

// 2. 共用的細項任務評分選項
export const EPA_PERFORMANCE_OPTIONS = [
  { value: "unobserved", label: "未觀察" },
  { value: "below_expectation", label: "不符預期表現" },
  { value: "meet_expectation", label: "符合預期表現" },
  { value: "exceed_expectation", label: "超過預期表現" }
];

// 3. 各 EPA 主題與細項內容定義
export const EPA_CONFIG = [
  {
    id: "EPA_01",
    title: "EPA 1. 門診處方評估",
    description: "在門診藥局進行醫師處方評估，限制：排除特殊混和注射藥品處方",
    check_items: [
      "蒐集處方評估所需資訊與判讀",
      "確認處方合理性，有疑義者形成用藥建議",
      "與處方醫師溝通討論用藥建議",
      "追蹤疑義處方處理結果並完成評估紀錄"
    ]
  },
  {
    id: "EPA_02",
    title: "EPA 2. 門診處方藥品交付",
    description: "在門診發藥櫃檯，進行藥品交付作業",
    check_items: [
      "接受處方並確認處方的完整性",
      "辨識病人身份",
      "確認藥品與處方一致",
      "指導用藥或轉介諮詢窗口"
    ]
  },
  {
    id: "EPA_03",
    title: "EPA 3. 門診病人藥品諮詢",
    description: "在門診藥物諮詢室，進行藥物諮詢與衛教作業",
    check_items: [
      "確認諮詢者身份",
      "確認問題，評估諮詢者認知能力",
      "依問題類型收集與評估資訊",
      "回覆諮詢並完成紀錄"
    ]
  },
  {
    id: "EPA_04",
    title: "EPA 4. 藥品不良反應評估",
    description: "當接獲藥品不良反應通報時，須進行藥品不良反應評估，限制：排除疫苗不良反應",
    check_items: [
      "收集病史、用藥史及排列事件時序",
      "評讀相關文獻並分析案例",
      "提供醫療團隊建議",
      "追蹤病人臨床表現並留下紀錄"
    ]
  },
  {
    id: "EPA_05",
    title: "EPA 5. 住院病人用藥評估",
    description: "在住院藥局，進行住院病人用藥評估作業",
    check_items: [
      "運用醫療資訊系統收集病人病史、用藥史及相關資訊",
      "審視用藥相關問題",
      "擬定建議計畫",
      "進行醫療團隊溝通",
      "追蹤並記錄"
    ]
  },
  {
    id: "EPA_06",
    title: "EPA 6. 藥物治療監測(TDM)評估與建議",
    description: "當接獲藥物治療監測(TDM)諮詢或檢驗結果完成時",
    check_items: [
      "收集與評估病人資訊",
      "評估藥品使用的適當性",
      "評估檢驗結果之合理性",
      "提供並記錄建議與追蹤結果"
    ]
  },
  {
    id: "EPA_07",
    title: "EPA 7. 醫療人員藥品諮詢",
    description: "當接獲醫療人員藥品諮詢時",
    check_items: [
      "確認並記錄諮詢者身份及回覆方式",
      "確認問題內容及原因",
      "收集與評估相關資訊",
      "回覆諮詢並記錄"
    ]
  },
  {
    id: "EPA_08",
    title: "EPA 8. 管制藥品調劑與管理",
    description: "藥師於門診、急診、住院藥局，當接獲管制藥品處方，從處方確認，調配並登錄，到每日盤點量與結存量不符時，須執行的任務。限制：限第一級至第三級管制藥品，並排除替代療法藥品",
    check_items: [
      "確認處方",
      "調配藥品",
      "登錄簿冊",
      "盤點與補充藥品",
      "異常事件處理"
    ]
  }
];
