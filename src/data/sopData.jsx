// src/data/sopData.jsx

// ==========================================
// 1. SOP 文章/連結列表 (這是給 SOPManager 和 AdminUploader 復原用的預設資料)
// ⚠️ 這是後台「匯入預設 SOP」功能需要的變數
// ==========================================
export const sopData = [
  {
    id: 1,
    title: "門診處方調劑作業規範",
    category: "門診",
    link: "#", 
    type: "pdf"
  },
  {
    id: 2,
    title: "住院單一劑量(UD)作業手冊",
    category: "住院",
    link: "#",
    type: "pdf"
  },
  {
    id: 3,
    title: "管制藥品管理與盤點標準流程",
    category: "行政",
    link: "#",
    type: "pdf"
  },
  {
    id: 4,
    title: "高警訊藥品 (High Alert) 清單與處置",
    category: "臨床",
    link: "#",
    type: "pdf"
  }
];

// ==========================================
// 2. 預包量資料 (給 QuickLookup 速查用)
// 資料來源：新進藥師 門診 操作細項手冊-1140702.doc
// ==========================================
export const PREPACK_DATA = [
  { 
    id: 'ACEO25', 
    name: 'Acetyl (Encore)', 
    spec: '66.7mg/g', 
    qty: '34 & 50', 
    bag: '8號袋', 
    note: '兒科常用' 
  },
  { 
    id: 'ETOO02', 
    name: 'Elac', 
    spec: 'Powder', 
    qty: '14', 
    bag: '綠色', 
    note: '' 
  },
  { 
    id: 'DOLO05', 
    name: 'Dolan', 
    spec: '250mg', 
    qty: '21', 
    bag: '紅色', 
    note: '非類固醇止痛' 
  },
  { 
    id: 'GABO00', 
    name: 'Neurontin', 
    spec: '300mg', 
    qty: '28', 
    bag: '黃色', 
    note: '' 
  },
  { 
    id: 'PANO55', 
    name: 'Lactam', 
    spec: '500mg', 
    qty: '21', 
    bag: '紅色', 
    note: '散裝/預包' 
  },
  { 
    id: 'MGOO01', 
    name: 'Magnesium Oxide', 
    spec: '', 
    qty: '21', 
    bag: '紅色', 
    note: '' 
  },
  { 
    id: 'NOLO01', 
    name: 'Nolidin', 
    spec: '', 
    qty: '21', 
    bag: '紅色', 
    note: '' 
  },
  { 
    id: 'CALO30', 
    name: 'Calcium Carbonate', 
    spec: '', 
    qty: '21', 
    bag: '紅色', 
    note: '' 
  },
  { 
    id: 'DIMO21', 
    name: 'Gasmin', 
    spec: '', 
    qty: '21', 
    bag: '紅色', 
    note: '' 
  },
  { 
    id: 'MADO01', 
    name: 'Madopar', 
    spec: '', 
    qty: '28', 
    bag: '黃色', 
    note: '' 
  },
  { 
    id: 'SALO11', 
    name: 'Salazine', 
    spec: '', 
    qty: '28', 
    bag: '黃色', 
    note: '' 
  },
  { 
    id: 'PIRO07', 
    name: 'Hamgo', 
    spec: '', 
    qty: '28', 
    bag: '黃色', 
    note: '' 
  }
];

// ==========================================
// 3. 常用分機資料 (給 QuickLookup 速查用)
// ==========================================
export const EXTENSION_DATA = [
  { id: 1, area: '門診藥局 (前台)', ext: '1151', note: '' },
  { id: 2, area: '諮詢櫃台', ext: '1152', note: '' },
  { id: 3, area: '門診藥局 (調劑)', ext: '1153', note: '' },
  { id: 4, area: '住院藥局', ext: '1154', note: '' },
  { id: 5, area: '中藥調劑', ext: '1157', note: '' },
  { id: 6, area: 'TPN室', ext: '1158', note: '' },
  { id: 7, area: '化療室', ext: '1159', note: '' },
  { id: 8, area: '藥庫', ext: '1063', note: '叫貨相關' },
  { id: 9, area: '急診藥局', ext: '5151', note: '' },
  { id: 10, area: '資訊室 (報修)', ext: '3253', note: '電腦故障' },
  { id: 11, area: '門診診間', ext: '26XX', note: '26+診號' },
  { id: 12, area: '注射室', ext: '2646', note: '化療室45' },
];
