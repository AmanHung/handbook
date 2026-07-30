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
| 待審知識 | 第二階段整合 | 由負責人挑選值得長期保存的內容。 |
| 正式知識 | 新人導航系統 | 審核後轉成 SOP、常見問題或新人提醒。 |

## 第二階段：待審知識

在 LINE 資訊中心增加「轉為知識」操作，只建立待審項目，不直接改寫 SOP。

建議欄位：

| 欄位 | 用途 |
| --- | --- |
| `sourceSystem` | 固定為 `pharmacy-bot`。 |
| `sourceRecordId` | 原始資訊短編號或穩定識別碼。 |
| `sourceCategory` | 交班、缺換藥、公告或上課。 |
| `sourceContent` | 原始內容快照。 |
| `sourceCreatedAt` | 原始訊息建立時間。 |
| `proposedByName` | 提案者姓名。 |
| `proposedByUserId` | 提案者 LINE 使用者識別碼。 |
| `proposedAt` | 提案時間。 |
| `reviewStatus` | `pending`、`approved` 或 `rejected`。 |
| `reviewedBy` | 審核者 Google 身分。 |
| `reviewedAt` | 審核時間。 |
| `targetType` | SOP、常見問題或新人提醒。 |

## 權限原則

- LINE 群組成員可閱讀即時資訊。
- 「已處理」與「移至最近處理」保留實際操作者。
- 轉為正式知識前必須由新人導航系統管理員審核。
- 不把 LINE 使用者識別碼放入公開 GitHub 或前端網址。
- 圖片維持私有存取，不複製到公開網站。

## 第三階段：唯讀摘要

待第二階段穩定後，可在新人導航系統顯示最近的重要公告摘要。摘要 API 必須由後端驗證，不可讓瀏覽器直接讀取 Firebase Realtime Database。

## 暫不執行

- 不直接合併 Firebase Realtime Database 與 Firestore。
- 不自動把群組訊息發布成 SOP。
- 不嘗試自動綁定 Google 帳號與 LINE 帳號。
- 不在公開程式碼中保存群組 ID、Token 或 Firebase 管理憑證。
