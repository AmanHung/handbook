# 新人導航系統與 LINE 資訊中心整合設計

## 目標

讓新人能在同一個入口取得兩類資訊，同時維持資料責任與更新週期清楚：

- 新人導航系統：經審查、長期有效的 SOP、影片、排班及學習內容。
- LINE 資訊中心：即時、短期、需要快速處理的交班、缺換藥、公告及課程資訊。

## 第一階段：安全入口

新人導航系統提供「即時資訊中心」連結，開啟：

`https://pharmacy-bot-gamma.vercel.app/liff`

連結不包含 LINE 群組 ID。資訊中心後端仍須完成下列驗證：

1. LINE ID Token 有效。
2. 使用者目前仍是指定群組成員。
3. 請求群組符合後端白名單或預設群組設定。

兩套系統不共用 Google／LINE 帳號，也不直接共用資料庫。

## 資訊生命週期

| 階段 | 所在系統 | 說明 |
| --- | --- | --- |
| 即時訊息 | LINE 群組 | 同仁發布交班、缺換藥、公告或課程資訊。 |
| 結構化資訊 | LINE 資訊中心 | 自動分類、搜尋、處理、恢復及保留操作紀錄。 |
| 轉換知識 | LINE 資訊中心 | 群組成員選擇值得長期保存的公告並按下「轉 SOP」。 |
| 正式知識 | 新人導航系統 | 公告文字與圖片建立為 SOP 文件，後續可由 Google 登入者共編。 |

## 第二階段：公告轉 SOP

在 LINE 資訊中心公告區增加「轉 SOP」操作，將公告文字與原始圖片建立於 `sop_articles`。轉入文件使用穩定 ID，重複點擊不會建立重複 SOP。

目前轉入規則：

- 文件分類固定為「行政流程」。
- 標題取公告前 `60` 個字元。
- 公告全文放入 SOP 內文。
- 私有 LINE 圖片經既有 Apps Script 上傳至 Google Drive，再寫入附件網址。
- 新人導航系統顯示「由 LINE 資訊中心公告轉入」及來源編號。
- LINE 資訊中心保留轉換者與轉換時間。

建議欄位：

| 欄位 | 用途 |
| --- | --- |
| `sourceSystem` | 固定為 `pharmacy-bot`。 |
| `sourceRecordId` | 原始資訊短編號或穩定識別碼。 |
| `sourceCategory` | 交班、缺換藥、公告或上課。 |
| `sourceContent` | 原始內容快照。 |
| `sourceCreatedAt` | 原始訊息建立時間。 |
| `convertedToSopAt` | 轉入 SOP 的時間。 |
| `convertedToSopByName` | 執行轉換的 LINE 群組成員。 |
| `handbookSopId` | 新人導航系統的穩定 SOP 文件 ID。 |

## 權限原則

- LINE 群組成員可閱讀即時資訊。
- 「已處理」與「移至最近處理」保留實際操作者。
- 只有目前仍在指定 LINE 群組內的成員可執行轉換。
- 跨專案寫入只在後端執行，瀏覽器不持有 Firebase 管理憑證。
- 不把 LINE 使用者識別碼放入公開 GitHub 或前端網址。
- 原始 LINE 圖片維持私有，轉入時才建立 Google Drive 分享附件。

## 第三階段：唯讀摘要

待第二階段穩定後，可在新人導航系統顯示最近的重要公告摘要。摘要 API 必須由後端驗證，不可讓瀏覽器直接讀取 Firebase Realtime Database。

## 暫不執行

- 不直接合併 Firebase Realtime Database 與 Firestore。
- 不自動把群組訊息發布成 SOP。
- 不嘗試自動綁定 Google 帳號與 LINE 帳號。
- 不在公開程式碼中保存群組 ID、Token 或 Firebase 管理憑證。
