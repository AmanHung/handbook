# 實習生護照待上線版本

本版本已整合至既有 React 網站的學習護照及後台；產物 `dist` 用於既有 GitHub Pages `/handbook/` 路徑。現行正式 Firestore 規則已取得並合併，完整候選規則保存於根目錄 `firestore.rules`。正式發布及 Google 登入後的線上驗收仍待完成。

## 本次補強

- 伺服器無法確認最新資料時，後台暫停統計、評核及匯出。評核與教材閱讀兩個訂閱都恢復伺服器確認後，才恢復操作。權限讀取失敗可按「重新讀取」。
- 切換或登出帳號會讓先前未完成的讀取失效，舊請求及舊訂閱不再更新目前帳號。角色及學員類型統一由目前帳號的即時訂閱更新。
- 保留 PGY 的原始 GAS 欄位契約、實習生新增版本紀錄，以及既有共用教材與閱讀收據格式。

## 正式規則來源

2026 年 11 月 3 日使用既有管理員 Google 帳號進入 Firebase 控制台，取得 `fengyuan-handbook` 當時正式啟用的 2026 年 8 月 3 日 17:50 規則。CLI 額外要求整個 Google Cloud 的管理授權，本次未授予；後續透過已登入的 Firebase 控制台處理。

原規則備份及校驗資訊保存在本機忽略的 `backend/firebase/20261103-intern`。候選規則合併下列三部分：

1. `intern-passport.rules.fragment`：新增實習生紀錄的讀寫條件。
2. `user-training-type.rules.fragment`：在既有 users match 內限制自行變更類型，保留管理員指派。
3. `sop-read-receipts.rules.fragment`：更新既有 match，保留共用收據格式並禁止覆寫其他人的閱讀確認。

這些片段不是完整部署檔。根目錄 `firebase.json` 僅指向已合併的 `firestore.rules`，供維護與後續部署使用。本機舊快照及測試 fixture 不作正式部署來源。合併規則已通過 14 項隔離模擬器測試，包含原有 SOP、影片、連結、設定及 PGY 契約的相容性。

## 發布及回復

先保存正式規則版本與目前 GitHub Pages 部署版本。完成規則合併及規則測試後，使用真實測試帳號驗證教師新增評核、實習生讀取自己的資料、學生禁止評核與跨學生存取、管理員指定學員類型、閱讀確認及後台匯出，再配合發布前端。

前端復原時以原部署版本回復；評核為新增版本資料，不刪除實習紀錄。規則問題應修正合併條件並重跑權限測試，不能以放寬成公開讀寫恢復功能。前端與規則必須配套確認後再供正式學員使用。

## 本機驗證

```powershell
npm run test:passport
npm run test:passport:integration
npm run build
```

CI 使用 Node 20 與 Java 21。`manifest.sha256.csv` 列出待上線包內檔案的雜湊，供確認版本一致；打包本身不會登入、變更雲端資料或發布網站。
