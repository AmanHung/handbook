// src/data/sopData.jsx

// 1. 預包量資料 (資料來源：新進藥師 門診 操作細項手冊-1140702.doc)
// 欄位: id(藥品代碼), name(藥名), spec(規格/備註), qty(預包量), bag(袋號/顏色), note(其他說明)
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
  // 以下為文件中提到但未列出明確數量的藥品，先建立項目方便日後補齊
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

// 2. 常用分機資料 (維持原樣，若文件中有新分機可再補充)
// 欄位: id(編號), area(地點), ext(分機), note(備註)
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
];