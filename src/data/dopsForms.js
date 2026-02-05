// src/data/dopsForms.js

export const DOPS_FORMS = [
  {
    id: "dops_op_dispensing",
    title: "門診處方調劑作業 DOPS",
    version: "113.03",
    description: "評估學員執行門診處方調劑之技能",
    sections: [
      {
        id: "sec_skills",
        title: "技能評估",
        fields: [
          { id: "item_1", label: "1. 調劑處方準備程序：檢查藥袋姓名、數量，钉好藥袋", type: "score_5" },
          { id: "item_2", label: "2. 外用與機器分包藥品調劑 (確實核對分包藥上資訊與藥袋是否吻合，並放入正確的預包和外用藥)", type: "score_5" },
          { id: "item_3", label: "3. 口服藥品的調劑 (片裝藥品應將藥名面朝藥袋透明面放入藥袋，若超過5排應以橡皮筋綑綁，散裝藥品應以透明夾鍊袋包裝放入藥袋)", type: "score_5" },
          { id: "item_4", label: "4. 依藥袋的內容指示進行調配 (在取藥、將藥放入藥袋、將藥歸位時皆須檢視藥名確認無誤)", type: "score_5" },
          { id: "item_5", label: "5. 1-3級管制藥品的調劑，須登記使用病人資料及數量，並確認藥品數量是否與登記本上吻合，藥品自抽屜拿取完成後需上鎖", type: "score_5" }
        ]
      },
      {
        id: "sec_global",
        title: "整體評估",
        fields: [
          { id: "global_rating", label: "教師對學員本次表現之整體評估 (1-10分)", type: "score_10" }
        ]
      },
      {
        id: "sec_feedback",
        title: "回饋與建議",
        fields: [
          { id: "feedback_teacher_good", label: "【教師回饋】表現良好項目", type: "textarea" },
          { id: "feedback_teacher_improve", label: "【教師回饋】建議加強項目", type: "textarea" },
          { id: "feedback_student_thoughts", label: "【學員回饋】心得與感想", type: "textarea" },
          { id: "feedback_student_improve", label: "【學員回饋】自覺可再加強部份", type: "textarea" }
        ]
      }
    ]
  },
  {
    id: "dops_ud_cart",
    title: "單一劑量藥車調配 DOPS",
    version: "113.03",
    description: "評估學員執行住院藥車調配之技能",
    sections: [
      {
        id: "sec_skills",
        title: "技能評估",
        fields: [
          { id: "item_1", label: "1. 正確的藥車調配準備：(整理病人用藥紀錄單，檢查藥盒內是否有剩餘藥品)", type: "score_5" },
          { id: "item_2", label: "2. 病人姓名及床號的檢視：(需詳細核對藥盒上的病人姓名及床號)", type: "score_5" },
          { id: "item_3", label: "3. 藥品的檢視：(需三讀五對病人用藥紀錄單上所需調配的藥品)", type: "score_5" },
          { id: "item_4", label: "4. 針劑藥品的調劑：(依用藥紀錄單正確放入病人的藥盒內，若藥盒放不下的藥品，需貼上病人藥品標籤)", type: "score_5" },
          { id: "item_5", label: "5. 口服藥品的調劑：(正確調配病人用藥紀錄單上註記包藥機沒有配出的藥品，並貼上病人標籤)", type: "score_5" },
          { id: "item_6", label: "6. 特殊藥品的調劑：(冷藏藥需貼冷藏標籤、管制藥需登記、高警訊藥品貼標籤，並於藥車上放置待領藥標示物)", type: "score_5" },
          { id: "item_7", label: "7. 藥車調配單的填寫：(填寫完成時間與蓋上藥師章)", type: "score_5" }
        ]
      },
      {
        id: "sec_global",
        title: "整體評估",
        fields: [
          { id: "global_rating", label: "指導藥師對學員本次表現之整體評估 (1-10分)", type: "score_10" }
        ]
      },
      {
        id: "sec_feedback",
        title: "回饋與建議",
        fields: [
          { id: "feedback_teacher_good", label: "【教師回饋】表現良好項目", type: "textarea" },
          { id: "feedback_teacher_improve", label: "【教師回饋】建議加強項目", type: "textarea" },
          { id: "feedback_student_thoughts", label: "【學員回饋】心得與感想", type: "textarea" },
          { id: "feedback_student_improve", label: "【學員回饋】自覺可再加強部份", type: "textarea" }
        ]
      }
    ]
  },
  {
    id: "dops_op_delivery",
    title: "門診藥品交付作業 DOPS",
    version: "113.11",
    description: "評估學員執行門診發藥之技能",
    sections: [
      {
        id: "sec_skills",
        title: "技能評估",
        fields: [
          { id: "item_1", label: "1. 了解門診醫令處方、批價、發藥確認流程", type: "score_5" },
          { id: "item_2", label: "2. 確實核對病人身分", type: "score_5" },
          { id: "item_3", label: "3. 發藥三讀五對作業流程及處方箋蓋章作業流程", type: "score_5" },
          { id: "item_4", label: "4. 一至三級管制藥品發藥作業流程", type: "score_5" },
          { id: "item_5", label: "5. 特殊藥品(如冷藏藥品、疫苗…等)之調配流程、本科規定及注意事項", type: "score_5" },
          { id: "item_6", label: "6. 交付藥品時能進行簡短衛教或轉介至藥物諮詢櫃檯", type: "score_5" },
          { id: "item_7", label: "7. 執行藥品諮詢服務時，態度正確、適當溝通技巧與禮儀", type: "score_5" }
        ]
      },
      {
        id: "sec_global",
        title: "整體評估",
        fields: [
          { id: "global_rating", label: "教師對學員本次表現之整體評估 (1-10分)", type: "score_10" }
        ]
      },
      {
        id: "sec_feedback",
        title: "回饋與建議",
        fields: [
          { id: "feedback_teacher_good", label: "【教師回饋】表現良好項目", type: "textarea" },
          { id: "feedback_teacher_improve", label: "【教師回饋】建議加強項目", type: "textarea" },
          { id: "feedback_student_thoughts", label: "【學員回饋】心得與感想", type: "textarea" },
          { id: "feedback_student_improve", label: "【學員回饋】自覺可再加強部份", type: "textarea" }
        ]
      }
    ]
  },
  {
    id: "dops_op_verification",
    title: "門診處方核對作業 DOPS",
    version: "113.11",
    description: "評估學員執行門診處方核對之技能",
    sections: [
      {
        id: "sec_skills",
        title: "技能評估",
        fields: [
          { id: "item_1", label: "1. 電子病歷查詢系統之運用", type: "score_5" },
          { id: "item_2", label: "2. 合理評估是否有過敏史、適應症、頻次及劑量、劑型與途徑", type: "score_5" },
          { id: "item_3", label: "3. 確認處方天數、是否有重複用藥或藥品交互作用", type: "score_5" },
          { id: "item_4", label: "4. 確認藥品數量和品項正確", type: "score_5" },
          { id: "item_5", label: "5. 發現疑義處方並提出解決辦法", type: "score_5" },
          { id: "item_6", label: "6. 與醫生溝通疑義處方時，應答適當有禮貌", type: "score_5" },
          { id: "item_7", label: "7. 熟知藥品修改與作廢處理原則", type: "score_5" }
        ]
      },
      {
        id: "sec_global",
        title: "整體評估",
        fields: [
          { id: "global_rating", label: "教師對學員本次表現之整體評估 (1-10分)", type: "score_10" }
        ]
      },
      {
        id: "sec_feedback",
        title: "回饋與建議",
        fields: [
          { id: "feedback_teacher_good", label: "【教師回饋】表現良好項目", type: "textarea" },
          { id: "feedback_teacher_improve", label: "【教師回饋】建議加強項目", type: "textarea" },
          { id: "feedback_student_thoughts", label: "【學員回饋】心得與感想", type: "textarea" },
          { id: "feedback_student_improve", label: "【學員回饋】自覺可再加強部份", type: "textarea" }
        ]
      }
    ]
  },
  {
    id: "dops_patient_counseling",
    title: "病人藥物諮詢 DOPS",
    version: "114.04",
    description: "評估學員執行病人用藥指導之技能",
    sections: [
      {
        id: "sec_skills",
        title: "技能評估",
        fields: [
          { id: "item_1", label: "1. 建立良好溝通 (自我介紹，主動打招呼)", type: "score_5" },
          { id: "item_2", label: "2. 瞭解病人狀況 (詢問病人用藥史、過敏、生活習慣等)", type: "score_5" },
          { id: "item_3", label: "3. 用語清晰易懂 (避免醫學術語，語速適中)", type: "score_5" },
          { id: "item_4", label: "4. 藥品說明完整 (用途、劑量、服用方式、副作用、注意事項)", type: "score_5" },
          { id: "item_5", label: "5. 確認理解程度 (運用回述技巧或提問病人)", type: "score_5" },
          { id: "item_6", label: "6. 解決病人疑問 (能清楚回應病人提問)", type: "score_5" },
          { id: "item_7", label: "7. 鼓勵病人遵從性 (說明正確用藥的重要性)", type: "score_5" },
          { id: "item_8", label: "8. 禮貌及專業態度 (尊重病人、符合專業)", type: "score_5" },
          { id: "item_9", label: "9. 結語與後續建議 (結語完整，提供後續聯絡方式)", type: "score_5" }
        ]
      },
      {
        id: "sec_global",
        title: "整體評估",
        fields: [
          { id: "global_rating", label: "教師對學員本次表現之整體評估 (1-10分)", type: "score_10" }
        ]
      },
      {
        id: "sec_feedback",
        title: "回饋與建議",
        fields: [
          { id: "feedback_teacher_good", label: "【教師回饋】表現良好項目", type: "textarea" },
          { id: "feedback_teacher_improve", label: "【教師回饋】建議加強項目", type: "textarea" },
          { id: "feedback_student_thoughts", label: "【學員回饋】心得與感想", type: "textarea" },
          { id: "feedback_student_improve", label: "【學員回饋】自覺可再加強部份", type: "textarea" }
        ]
      }
    ]
  },
  {
    id: "dops_provider_counseling",
    title: "醫療人員藥品諮詢 DOPS",
    version: "114.04",
    description: "評估學員回覆醫療人員藥物諮詢之技能",
    sections: [
      {
        id: "sec_skills",
        title: "技能評估",
        fields: [
          { id: "item_1", label: "1. 病人資訊蒐集與整合: 查詢EMR與用藥史、判讀檢驗數據與病況", type: "score_5" },
          { id: "item_2", label: "2. 治療建議提出: 根據臨床指引,與病況提供具體建議", type: "score_5" },
          { id: "item_3", label: "3. 團隊溝通回應: 使用適當專業,術語回覆醫師諮詢", type: "score_5" },
          { id: "item_4", label: "4. 系統工具應用: 使用資料庫,病歷系統支持判斷", type: "score_5" },
          { id: "item_5", label: "5. 協作與轉介判斷: 能識別需與其他醫療團隊成員共同處理議題", type: "score_5" },
          { id: "item_6", label: "6. 完成簡明扼要的SOAP建議紀錄", type: "score_5" }
        ]
      },
      {
        id: "sec_global",
        title: "整體評估",
        fields: [
          { id: "global_rating", label: "教師對學員本次表現之整體評估 (1-10分)", type: "score_10" }
        ]
      },
      {
        id: "sec_feedback",
        title: "回饋與建議",
        fields: [
          { id: "feedback_teacher_good", label: "【教師回饋】表現良好項目", type: "textarea" },
          { id: "feedback_teacher_improve", label: "【教師回饋】建議加強項目", type: "textarea" },
          { id: "feedback_student_thoughts", label: "【學員回饋】心得與感想", type: "textarea" },
          { id: "feedback_student_improve", label: "【學員回饋】自覺可再加強部份", type: "textarea" }
        ]
      }
    ]
  },
  {
    id: "dops_tcm",
    title: "新進藥師中藥藥事作業 DOPS",
    version: "113.03",
    description: "評估學員執行中藥調劑與發藥之技能",
    sections: [
      {
        id: "sec_skills_1",
        title: "1. 處方審查",
        fields: [
          { id: "item_1_1", label: "(1) 能正確判讀醫師開立之科學中藥處方（中藥名、劑量、用法）", type: "yes_no" },
          { id: "item_1_2", label: "(2) 能辨識中藥處方間之禁忌、重複用藥、劑量過高等問題", type: "yes_no" },
          { id: "item_1_3", label: "(3) 能審核配伍合理性與治療目的", type: "yes_no" }
        ]
      },
      {
        id: "sec_skills_2",
        title: "2. 調劑作業",
        fields: [
          { id: "item_2_1", label: "(1) 能依處方正確選取科學中藥品項", type: "yes_no" },
          { id: "item_2_2", label: "(2) 能正確秤量、分包、標示藥袋", type: "yes_no" },
          { id: "item_2_3", label: "(3) 能維持工作台面清潔、防潮防污染", type: "yes_no" }
        ]
      },
      {
        id: "sec_skills_3",
        title: "3. 發藥與衛教作業",
        fields: [
          { id: "item_3_1", label: "(1) 能核對病人姓名、病歷號、藥袋內容與醫囑一致", type: "yes_no" },
          { id: "item_3_2", label: "(2) 能清楚說明服藥方法、時間、療程與注意事項", type: "yes_no" },
          { id: "item_3_3", label: "(3) 能指導病人正確儲存方式（避免潮濕、高溫）", type: "yes_no" },
          { id: "item_3_4", label: "(4) 能提供科學中藥與西藥併用之安全衛教", type: "yes_no" }
        ]
      },
      {
        id: "sec_global",
        title: "整體評估",
        fields: [
          { id: "global_rating", label: "教師對學員本次表現之整體評估 (1-10分)", type: "score_10" }
        ]
      },
      {
        id: "sec_feedback",
        title: "回饋與建議",
        fields: [
          { id: "feedback_teacher_good", label: "【教師回饋】表現良好項目", type: "textarea" },
          { id: "feedback_teacher_improve", label: "【教師回饋】建議加強項目", type: "textarea" },
          { id: "feedback_student_thoughts", label: "【學員回饋】心得與感想", type: "textarea" },
          { id: "feedback_student_improve", label: "【學員回饋】自覺可再加強部份", type: "textarea" }
        ]
      }
    ]
  },
  {
    id: "dops_chemo_env",
    title: "抗腫瘤藥物環境安全維護 DOPS",
    version: "113.03",
    description: "評估學員執行化療調配環境清潔之技能",
    sections: [
      {
        id: "sec_skills_1",
        title: "1. 生物安全櫃(BSC)清潔與消毒原則",
        fields: [
          { id: "item_1_1", label: "(1) 工作開始前：先用清水初步擦拭操作檯，再以消毒劑(70%酒精)擦拭，且讓消毒劑留滯檯面一段時間，以發揮其殺菌效果；靜待消毒劑揮發後再開始使用。", type: "yes_no" },
          { id: "item_1_2", label: "(2) 工作結束後：先用清水重複擦拭操作檯數次，再以70%酒精擦拭去除可能的微生物污染。", type: "yes_no" }
        ]
      },
      {
        id: "sec_skills_2",
        title: "2. 抗腫瘤藥物調配室、前室環境清潔原則",
        fields: [
          { id: "item_2_1", label: "(1) 需穿戴個人防護裝備", type: "yes_no" },
          { id: "item_2_2", label: "(2) 用清水先將易沖洗或水溶性的雜質沖洗乾淨", type: "yes_no" },
          { id: "item_2_3", label: "(3) 再以消毒劑70%酒精擦拭，且讓消毒劑留置一段時間以發揮其殺菌效果", type: "yes_no" },
          { id: "item_2_4", label: "(4) 由乾淨區往髒污區進行清潔及消毒", type: "yes_no" }
        ]
      },
      {
        id: "sec_global",
        title: "整體評估",
        fields: [
          { id: "global_rating", label: "教師對學員本次表現之整體評估 (1-10分)", type: "score_10" }
        ]
      },
      {
        id: "sec_feedback",
        title: "回饋與建議",
        fields: [
          { id: "feedback_teacher_good", label: "【教師回饋】表現良好項目", type: "textarea" },
          { id: "feedback_teacher_improve", label: "【教師回饋】建議加強項目", type: "textarea" },
          { id: "feedback_student_thoughts", label: "【學員回饋】心得與感想", type: "textarea" },
          { id: "feedback_student_improve", label: "【學員回饋】自覺可再加強部份", type: "textarea" }
        ]
      }
    ]
  },
  {
    id: "dops_chemo_ppe",
    title: "調配抗腫瘤藥物安全防護裝備 DOPS",
    version: "113.03",
    description: "評估學員穿脫防護裝備(PPE)之技能",
    sections: [
      {
        id: "sec_skills_1",
        title: "1. 個人安全防護設備(PPE)穿戴順序",
        fields: [
          { id: "item_1_1", label: "(1) 穿上鞋套", type: "yes_no" },
          { id: "item_1_2", label: "(2) 在前室戴上隔離帽並將頭髮包覆", type: "yes_no" },
          { id: "item_1_3", label: "(3) 戴手術用口罩，外戴活性碳口罩", type: "yes_no" },
          { id: "item_1_4", label: "(4) 徹底洗手拭乾", type: "yes_no" },
          { id: "item_1_5", label: "(5) 穿上拋棄式防水隔離衣並綁緊", type: "yes_no" },
          { id: "item_1_6", label: "(6) 戴雙層手套，內層為檢診乳膠手套；外層為滅菌手術手套，內層手套需塞入隔離衣內，外層手套需套緊隔離衣袖口", type: "yes_no" }
        ]
      },
      {
        id: "sec_skills_2",
        title: "2. 個人安全防護設備(PPE)脫除順序",
        fields: [
          { id: "item_2_1", label: "(1) 先把污穢的外層手套脫掉，放入夾鏈袋中密封", type: "yes_no" },
          { id: "item_2_2", label: "(2) 脫下隔離衣", type: "yes_no" },
          { id: "item_2_3", label: "(3) 脫掉內層手套", type: "yes_no" },
          { id: "item_2_4", label: "(4) 脫下兩層口罩", type: "yes_no" },
          { id: "item_2_5", label: "(5) 脫下隔離帽，上述PPE全部棄入基因毒性廢棄物垃圾桶中", type: "yes_no" },
          { id: "item_2_6", label: "(6) 徹底洗手拭乾", type: "yes_no" }
        ]
      },
      {
        id: "sec_global",
        title: "整體評估",
        fields: [
          { id: "global_rating", label: "教師對學員本次表現之整體評估 (1-10分)", type: "score_10" }
        ]
      },
      {
        id: "sec_feedback",
        title: "回饋與建議",
        fields: [
          { id: "feedback_teacher_good", label: "【教師回饋】表現良好項目", type: "textarea" },
          { id: "feedback_teacher_improve", label: "【教師回饋】建議加強項目", type: "textarea" },
          { id: "feedback_student_thoughts", label: "【學員回饋】心得與感想", type: "textarea" },
          { id: "feedback_student_improve", label: "【學員回饋】自覺可再加強部份", type: "textarea" }
        ]
      }
    ]
  }
];
