import React from 'react';
import { 
  UserMinus, RefreshCw, Users 
} from 'lucide-react';

// ==========================================
// Part A: 您的原始詳細資料 (保留不動)
// ==========================================

// 行政注意事項 (常駐顯示)
export const ADMIN_NOTICES = [
  {
    id: 'leave',
    title: '同仁臨時請假規範',
    icon: <UserMinus className="w-5 h-5 text-rose-500" />,
    color: 'bg-rose-50 border-rose-100',
    content: (
      <div className="space-y-2 text-sm text-slate-600">
        <p><strong className="text-rose-700">原則：</strong> 當日同仁臨時請假，由 <strong className="bg-rose-100 px-1 rounded">D6 班別</strong> 優先遞補。</p>
        <ul className="list-disc pl-4 space-y-1 text-xs">
          <li><strong>D6：</strong> 原班別取消，直接執行請假同仁之工作點 (含上下午)。</li>
          <li><strong>D5：</strong> 下午 13:30-16:30 改支援發藥。</li>
          <li><strong>TPN/化療：</strong> 16:30-17:30 需支援發藥業務。</li>
        </ul>
      </div>
    )
  },
  {
    id: 'handover',
    title: '交班原則',
    icon: <RefreshCw className="w-5 h-5 text-blue-500" />,
    color: 'bg-blue-50 border-blue-100',
    content: (
      <div className="space-y-2 text-sm text-slate-600">
        <p><strong className="text-blue-700">清零原則：</strong> 各工作點下班前，應完成該時段之調劑工作。</p>
        <div className="bg-white p-2 rounded border border-blue-100 text-xs">
          <p className="font-bold mb-1">⏰ 時間基準：休息/下班前 5 分鐘</p>
          <p>例如：DP1、TP1 需於下班前，完成 <span className="text-red-500 font-bold">21:25 前</span> 列印之所有處方藥袋。</p>
        </div>
      </div>
    )
  },
  {
    id: 'meeting',
    title: '星期四開會須知',
    icon: <Users className="w-5 h-5 text-purple-500" />,
    color: 'bg-purple-50 border-purple-100',
    content: (
      <div className="space-y-3 text-sm text-slate-600">
        <div className="bg-white/50 rounded-lg p-2 border border-purple-100">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">需出席</span>
            <span className="text-[10px] text-slate-400">* D5 08:30 支援調劑</span>
          </div>
          <div className="grid grid-cols-4 gap-1 text-center">
            {['D1', 'D5', 'D6', 'D7', 'D8', 'D9', 'TP1', 'DP2', 'DP1', 'D', '化療', 'TPN'].map(p => (
              <span key={p} className="text-xs font-medium text-slate-700 bg-white rounded border border-purple-50 py-1">{p}</span>
            ))}
          </div>
        </div>
        <div className="px-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">免出席 (留守)</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed pl-1">D2, D3, D4, TD, ED, RD, TS1, SP, A, NN</p>
        </div>
      </div>
    )
  }
];

// 國定假日資料
export const HOLIDAY_DATA = {
  'D1': { title: 'D1 假日班', color: 'blue', timeline: [{ time: '上午 AM', task: '調劑檯 A 補藥 / 發藥', desc: '負責開台與前檯發藥' }, { time: '下午 PM', task: '兒科磨粉 / 疫苗 / 洗腎室', desc: '負責住院與門診磨粉、疫苗結存與洗腎室業務。無處方時支援核對' }] },
  'D2': { title: 'D2 假日班', color: 'indigo', timeline: [{ time: '上午 AM', task: '開門 / 發藥 / 慢箋', desc: '協助開門、預約慢箋、UD補藥、備化療與管藥' }, { time: '11:30', task: '支援 M2', desc: '支援 M2 區作業' }, { time: '下午 PM', task: '全院藥車調劑', desc: '負責全院藥車、17W藥車、退藥與管藥銷毀' }] },
  'D3': { title: 'D3 假日班', color: 'cyan', timeline: [{ time: '上午 AM', task: '晨間調劑 / M2 藥包機', desc: '協助晨間處方與包藥機操作' }, { time: '下午 PM', task: 'M2 藥包機 / 核對藥車', desc: '持續包藥作業，下午重點核對藥車 (多對17W)' }] },
  'D4': { title: 'D4 假日班 (關門班)', color: 'sky', timeline: [{ time: '上午 AM', task: '前檯發藥', desc: '專責門診發藥' }, { time: '下午 PM', task: '發藥 / M2 藥包機', desc: '發藥與協助包藥機' }, { time: '17:30', task: '調劑檯 A / 磨粉支援', desc: '最後收尾與磨粉支援' }] },
  'RD': { title: 'RD 假日班 (關門班)', color: 'amber', timeline: [{ time: '上午 AM', task: 'Check', desc: '例行檢查與機動支援' }, { time: '12:00', task: '支援中午調劑', desc: '午間人力支援' }, { time: '13:30', task: '發藥', desc: '支援下午發藥' }] },
  'D5': { title: 'D5 假日班', color: 'teal', timeline: [{ time: '上午 AM', task: 'M2 補藥 / 調劑 / 支援 ED', desc: '多工支援' }, { time: '下午 PM', task: '調劑 / 支援 ED / 17W 藥車', desc: '協助急診與病房藥車' }] },
  'D6': { title: 'D6 假日班', color: 'emerald', timeline: [{ time: '上午 AM', task: '中藥調劑', desc: '負責中藥局業務' }, { time: '下午 PM', task: 'Check', desc: '例行檢查與機動支援' }] },
  'D7': { title: 'D7 假日班', color: 'green', timeline: [{ time: '上午 AM', task: 'M2 補藥 / 覆核', desc: '負責包藥機補藥與雙重核對' }, { time: '下午 PM', task: '調劑', desc: '執行一般調劑業務' }] },
  'D8': { title: 'D8 假日班', color: 'lime', timeline: [{ time: '上午 AM', task: '歸藥 / 中藥退藥', desc: '負責口服藥歸位與中藥退藥處理' }, { time: '下午 PM', task: '發藥 / 核對藥車', desc: '支援發藥與藥車核對' }] },
  'D9': { title: 'D9 假日班', color: 'amber', timeline: [{ time: '上午 AM', task: '協助調劑 / A 台補藥', desc: '支援 A 台業務' }, { time: '下午 PM', task: '藥車總負責', desc: '統籌核對全院藥車' }] },
  'TD': { title: 'TD 假日班', color: 'slate', timeline: [{ time: '上午 AM', task: '兒科磨粉 / 調劑', desc: '優先處理兒科處方' }, { time: '下午 PM', task: '中藥班', desc: '負責中藥局，空檔支援線上調劑' }] },
  'ED': { title: 'ED 假日班', color: 'orange', timeline: [{ time: '08:00-16:30', task: '急診調劑', desc: '全日負責急診處方業務' }] },
  'D化': { title: 'D化 假日班', color: 'purple', timeline: [{ time: '上午 AM', task: '化療業務', desc: '執行化療藥品調配' }, { time: '下午 PM', task: '發藥', desc: '支援門診發藥' }] },
  'DTPN': { title: 'DTPN 假日班', color: 'rose', timeline: [{ time: '上午 AM', task: 'B 台 TPN / 支援調劑', desc: '負責 TPN 調配與 B 台支援' }] },
  'PSY': { title: 'PSY 假日班 (週一)', color: 'violet', timeline: [{ time: '上午 AM', task: 'B 台補藥 / 調劑', desc: '補充藥品與調劑' }, { time: '下午 PM', task: '支援調劑 / PSY 餐包', desc: '精神科餐包製作與支援' }] },
  'PRN': { title: 'PRN 組長輪值', color: 'gray', timeline: [{ time: '全日', task: '機動支援 / 藥庫 / 諮詢', desc: '統籌全場狀況與臨時支援' }] }
};

// 班別詳細資料
export const SHIFTS_DATA = {
  'D1': { title: 'D1 門診主台', color: 'blue', timeline: [{ time: '08:00-08:30', task: '調劑檯 A 補藥', desc: '完成開台準備與藥品補充' }, { time: '08:30-12:00', task: '門診發藥', desc: '執行前檯發藥與衛教作業' }, { time: '13:30-17:30', task: '兒科磨粉/疫苗/洗腎室', desc: '負責住院/門診磨粉、疫苗結存。無兒科處方時回線上門診作業(優先支援核對)' }] },
  'D2': { title: 'D2 門診支援與藥車', color: 'indigo', timeline: [{ time: '07:40-08:30', task: '開門/發藥/調劑預慢', desc: '協助藥局開門作業及預約慢箋調劑' }, { time: '08:30-11:30', task: 'UD補藥/備化療/管藥', desc: '負責住院單一劑量補藥、化療藥品準備及洗腎室藥品' }, { time: '11:30-12:00', task: '支援 M2', desc: '支援 M2 區作業' }, { time: '12:30-15:00', task: '藥車調劑', desc: '執行全院藥車調劑作業' }, { time: '15:00-16:10', task: '17W藥車/退藥/管藥銷毀', desc: '核對17病房藥車、處理住院退藥及管制藥餘量銷毀' }] },
  'D3': { title: 'D3 藥包機與藥車', color: 'cyan', timeline: [{ time: '08:00-08:30', task: '調劑', desc: '協助晨間處方調劑' }, { time: '08:30-11:30', task: 'M2 藥包機', desc: '操作 M2 自動包藥機' }, { time: '12:00-13:30', task: 'M2 藥包機', desc: '持續 M2 包藥作業' }, { time: '13:30-16:30', task: '核對藥車', desc: '執行住院藥車核對' }] },
  'D4': { title: 'D4 前檯與機動', color: 'sky', timeline: [{ time: '09:00-12:30', task: '前檯發藥', desc: '執行門診發藥業務' }, { time: '13:30-17:30', task: 'M2 藥包機', desc: '13:30-14:00 先進行 M2 區補藥，後操作機器' }, { time: '17:30-18:00', task: '調劑檯 A / 磨粉', desc: '支援 A 台調劑或兒科磨粉收尾' }] },
  'D5': { title: 'D5 核對與支援', color: 'teal', timeline: [{ time: '08:00-08:30', task: '調劑 A 台', desc: '支援調劑' }, { time: '08:30-12:00', task: '核對', desc: '執行處方核對作業' }, { time: '12:30-16:30', task: '調劑 A 台', desc: '負責 A 台調劑，機構領藥時支援發藥' }] },
  'D6': { title: 'D6 調劑與發藥', color: 'emerald', timeline: [{ time: '08:30-12:30', task: '調劑台 A / C', desc: '負責 A 及 C 調劑台作業' }, { time: '13:30-17:30', task: '下午發藥', desc: '執行下午門診發藥' }] },
  'D7': { title: 'D7 覆核與調劑', color: 'green', timeline: [{ time: '08:00-08:30', task: 'M2 區補藥', desc: '補充 M2 包藥機藥品' }, { time: '08:30-12:00', task: '藥品覆核', desc: '執行雙重核對' }, { time: '13:30-17:30', task: '調劑', desc: '執行一般調劑業務' }] },
  'D8': { title: 'D8 歸藥與藥車', color: 'lime', timeline: [{ time: '08:00-08:30', task: '口服藥歸回包藥機', desc: '將口服藥歸回包藥機' }, { time: '08:30-09:30', task: 'M1 調劑', desc: '負責 M1 區調劑' }, { time: '09:30-11:30', task: '調劑檯', desc: '支援一般調劑' }, { time: '12:00-13:30', task: '發藥', desc: '支援午間發藥窗口' }, { time: '13:30-16:30', task: '核對藥車', desc: '執行住院藥車核對' }] },
  'D9': { title: 'D9 藥車總負責', color: 'amber', timeline: [{ time: '08:00-08:30', task: '調劑檯 A 補藥', desc: '協助 A 台藥品補充' }, { time: '08:30-12:00', task: '調劑檯 A 調劑', desc: '執行 A 台調劑作業' }, { time: '12:30-13:30', task: '中午支援調劑', desc: '午間人力支援' }, { time: '13:00-16:30', task: '核對藥車(藥車總負責)', desc: '統籌藥車核對進度與藥車收尾' }] },
  'TP1': { title: 'TP1 M2補藥/發藥/覆核', color: 'rose', timeline: [{ time: '08:00-08:30', task: 'M2 區補藥', desc: '執行 M2 包藥機區藥品補充' }, { time: '08:30-12:00', task: '發藥', desc: '執行門診發藥業務' }, { time: '13:30-17:30', task: '藥品覆核', desc: '執行調劑後雙重核對' }, { time: '18:30-21:30', task: '夜診(中藥)', desc: '負責夜間中藥局業務' }, { time: '備註', task: 'W2-W5 交換', desc: '16:30-17:30 與 D1 互換，TP1 負責 A 台補藥' }] },
  'DP2': { title: 'DP2 兒科/發藥/M2', color: 'violet', timeline: [{ time: '08:00-08:30', task: '調劑檯 B 補藥', desc: '補充調劑檯 B 藥品' }, { time: '08:30-12:00', task: '兒科磨粉+調劑', desc: '優先處理兒科磨粉，無處方時回線上支援核對' }, { time: '13:30-16:30', task: '發藥', desc: '執行下午門診發藥' }, { time: '17:30-20:30', task: 'M2 藥包機', desc: '夜間 M2 包藥機操作' }] },
  'SP': { title: 'SP 機動支援', color: 'fuchsia', timeline: [{ time: '14:00-17:00', task: '餐包核對/調劑', desc: '餐包核對、調劑與管制藥品對點' }, { time: '17:30-21:30', task: '發藥', desc: '執行夜間發藥業務' }, { time: '21:30-結束', task: '調劑/發藥', desc: '門診結束前之最後調劑與發藥' }] },
  'P1': { title: 'P1 夜診調劑', color: 'slate', timeline: [{ time: '18:30-21:30', task: '夜診(調劑檯)', desc: '負責夜間門診調劑檯作業' }, { time: '備註', task: '日間支援', desc: '包含行政DP1、線上D5P1、D1P1等機動支援' }] },
  'ED': { title: 'ED 急診早班', color: 'orange', timeline: [{ time: '08:00-11:30', task: '急診調劑', desc: '處理急診處方' }, { time: '11:30-12:00', task: '休息', desc: '午間用餐休息' }, { time: '12:00-16:30', task: '急診調劑', desc: '持續急診調劑業務' }] },
  'HD': { title: 'HD 急診正常班', color: 'orange', timeline: [{ time: '08:00-16:00', task: '急診調劑', desc: '全時段急診調劑' }, { time: '休息時段', task: '07:45-08:00 / 16:00-16:15', desc: '前後休息時間' }] },
  'A': { title: 'A 急診小夜', color: 'red', timeline: [{ time: '16:00-24:00', task: '急診調劑', desc: '負責小夜急診業務' }, { time: '休息時段', task: '15:45-16:00 / 00:00-00:15', desc: '前後交接休息時間' }] },
  'HA': { title: 'HA 急診假日小夜', color: 'red', timeline: [{ time: '16:00-24:00', task: '急診調劑', desc: '同 A 班，負責假日小夜急診' }, { time: '休息時段', task: '15:45-16:00 / 00:00-00:15', desc: '前後交接休息時間' }] },
  'NN': { title: 'NN 急診大夜', color: 'slate', timeline: [{ time: '00:00-08:00', task: '急診調劑', desc: '負責深夜急診與全院緊急用藥' }, { time: '休息時段', task: '23:45-00:00 / 08:00-08:15', desc: '前後交接休息時間' }] },
  'DTPN': { title: 'DTPN 全靜脈營養', color: 'rose', timeline: [{ time: '08:30-12:30', task: '調劑檯B TPN', desc: '負責 B 台調劑及 TPN (全靜脈營養) 調配' }, { time: '備註', task: 'A 台補藥', desc: '視情況支援 A 台補藥' }] },
  'D化': { title: 'D化 化療專責', color: 'purple', timeline: [{ time: '08:00-12:00', task: '化療業務', desc: '執行化學治療藥品調配' }, { time: '下午時段', task: '化療 / A 台補藥', desc: '持續化療業務或支援 A 台補藥' }] },
  'RD': { title: 'RD 機動/急診支援', color: 'orange', timeline: [{ time: '08:30-12:00', task: '支援急診', desc: '協助急診藥局業務' }, { time: '12:00-12:30', task: '支援中午調劑', desc: '支援門診午間調劑' }, { time: '13:30-14:00', task: '藥車調劑 (17W)', desc: '負責 17 病房藥車調劑' }, { time: '14:30-16:00', task: '支援 ER', desc: '支援急診業務' }, { time: '16:00-16:30', task: 'ER 撥補', desc: '急診藥品補充' }, { time: '16:30-17:30', task: '發藥', desc: '支援發藥窗口' }] },
  'PSY': { title: 'PSY 精神科', color: 'violet', timeline: [{ time: '08:00-08:30', task: '補調劑台 D 台', desc: '補充 D 台藥品' }, { time: '08:30-12:00', task: 'D 台調劑', desc: '負責 D 台 (精神科) 調劑' }, { time: '12:30-13:30', task: '調劑台調劑', desc: '一般調劑支援' }, { time: '13:30-16:00', task: 'PSY 包藥', desc: '精神科藥品包藥作業' }, { time: '16:00-16:30', task: '補 A 台', desc: '支援 A 台補藥' }] },
  'TS1': { title: 'TS1 中藥局', color: 'yellow', timeline: [{ time: '08:30-12:30', task: '中藥調劑', desc: '負責中藥局業務' }, { time: '備註', task: '支援機制', desc: '無中藥處方時回線上門診作業(優先支援調劑A台)' }] },
  'TD': { title: 'TD 綜合支援', color: 'slate', timeline: [{ time: '08:30-12:00', task: '第四台發藥/住院退藥', desc: '負責第四窗口發藥及住院退藥處理' }, { time: '12:00-12:30', task: '調劑台調劑', desc: '支援調劑作業' }, { time: '13:30-17:30', task: '中藥班', desc: '無中藥處方時回線上門診作業(優先支援調劑)' }] }
};

// ==========================================
// Part B: 補上缺少的變數 (解決 Build Failed)
// ==========================================

// 系統運作所需的預設排班表 (AdminUploader 復原用)
// 由於您原本的檔案沒有這個變數，為了避免錯誤，我加了一個空陣列或範例結構
export const shiftData = [
  {
    id: 1,
    name: "範例藥師A",
    dates: {
      "2024-11-01": "D1",
      "2024-11-02": "OFF"
    }
  },
  {
    id: 2,
    name: "範例藥師B",
    dates: {
      "2024-11-01": "OFF",
      "2024-11-02": "D2"
    }
  }
];
