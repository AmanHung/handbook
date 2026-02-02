// src/data/preTrainingForm.js

export const PRE_TRAINING_FORM = {
  form_title: "衛生福利部豐原醫院藥劑科 新進藥師學前評估表",
  version: "1140901",
  sections: [
    {
      id: "section_background",
      title: "二、學習背景評估",
      description: "請填寫您的學歷背景與語言能力",
      fields: [
        { id: "edu_university", label: "大學校系", type: "text", required: true },
        { id: "edu_system", label: "學制", type: "radio", options: ["4年", "5年", "6年"], required: true },
        { id: "edu_uni_grad_date", label: "大學畢業年月", type: "month", required: true },
        { id: "edu_grad_school", label: "研究所校系", type: "text", required: false },
        { id: "edu_grad_degree", label: "研究所學位", type: "radio", options: ["無", "碩士", "博士"], required: false },
        { id: "edu_grad_date", label: "研究所畢業年月", type: "month", required: false },
        { id: "lang_english", label: "英文能力 (通過全民英檢)", type: "radio", options: ["中級", "中高級", "高級", "其他"], has_other_text: true, required: true }
      ]
    },
    {
      id: "section_work_experience",
      title: "三、工作經歷",
      description: "請填寫過往服務機構與工作內容",
      is_dynamic_list: true,
      add_button_text: "新增工作經歷",
      fields: [
        { id: "work_org", label: "服務機構/單位", type: "text", width: "30%" },
        { id: "work_content", label: "工作內容", type: "textarea", width: "50%" },
        { id: "work_period", label: "起迄年月", type: "text", placeholder: "YYY/MM - YYY/MM", width: "20%" }
      ]
    },
    {
      id: "section_learning_history",
      title: "四、學習歷程（領照後階段）",
      description: "請勾選您已具備的技能，並填寫受訓期間",
      fields: [
        {
          id: "history_outpatient", label: "1. 門診調劑作業", type: "group",
          sub_fields: [
            { id: "period", label: "訓練期間", type: "text", placeholder: "年 月" },
            { id: "skills", label: "具備技能", type: "checkbox", options: ["無", "一般藥品調劑", "小兒處方調劑", "門診處方覆核", "交付藥品", "管制藥品調劑", "藥品外觀辨識", "其他"], has_other_text: true }
          ]
        },
        {
          id: "history_inpatient", label: "2. 住院UD作業", type: "group",
          sub_fields: [
            { id: "period", label: "訓練期間", type: "text", placeholder: "年 月" },
            { id: "skills", label: "具備技能", type: "checkbox", options: ["無", "住院藥車調劑", "緊急處方調劑", "住院處方覆核", "出院病人衛教", "常備藥品管理", "住院退藥作業", "其他"], has_other_text: true }
          ]
        },
        {
          id: "history_consult", label: "3. 藥物諮詢", type: "group",
          sub_fields: [
            { id: "period", label: "訓練期間", type: "text", placeholder: "年 月" },
            { id: "skills", label: "具備技能", type: "checkbox", options: ["無", "藥品諮詢服務", "病房衛教", "EBM", "雲端藥歷", "其他"], has_other_text: true }
          ]
        },
        {
          id: "history_management", label: "4. 藥品管理", type: "group",
          sub_fields: [
            { id: "period", label: "訓練期間", type: "text", placeholder: "年 月" },
            { id: "skills", label: "具備技能", type: "checkbox", options: ["無", "藥品進、出庫", "藥品採購驗收", "效期管理", "其他"], has_other_text: true }
          ]
        },
        {
          id: "history_special", label: "5. 特殊藥品調劑", type: "group",
          sub_fields: [
            { id: "period", label: "訓練期間", type: "text", placeholder: "年 月" },
            { id: "skills", label: "具備技能", type: "checkbox", options: ["無", "化療", "TPN", "其他"], has_other_text: true }
          ]
        },
        {
          id: "history_clinical", label: "6. 臨床藥事服務", type: "group",
          sub_fields: [
            { id: "period", label: "訓練期間", type: "text", placeholder: "年 月" },
            { id: "skills", label: "具備技能", type: "checkbox", options: ["無", "病房訪視", "ADR", "案例報告", "其他"], has_other_text: true }
          ]
        },
        {
          id: "history_other", label: "其他訓練", type: "group",
          sub_fields: [
             { id: "content", label: "內容", type: "text" },
             { id: "period", label: "訓練期間", type: "text", placeholder: "年 月" }
          ]
        }
      ]
    },
    {
      id: "section_assessment",
      title: "五、綜合評量結果及訓練規劃",
      description: "由指導藥師評估，最後由教學負責人審核",
      access_control: "admin_only", // 這裡我們邏輯上會做成：老師可填寫，Admin 可審核
      sub_sections: [
        {
          title: "A. 評核項目",
          fields: [
            { id: "assess_interview", label: "面試結果", type: "radio", options: ["優", "一般", "待加強"] },
            { id: "assess_written_test", label: "筆試結果", type: "radio", options: ["優", "一般", "待加強"] },
            { id: "assess_ksa", label: "KSA評估", type: "radio", options: ["優", "一般", "待加強"] }
          ]
        },
        {
          title: "B. 訓練規劃",
          layout: "table",
          columns: ["訓練單位", "綜合評量", "訓練規劃"],
          rows: [
            {
              id: "plan_op", unit: "門診調劑作業",
              assessment: { type: "radio", options: ["尚未訓練", "部份訓練", "已完訓"] },
              planning: { type: "radio_with_input", options: [{label: "6個月", value: 6}, {label: "自訂月數", input_type: "number"}] }
            },
            {
              id: "plan_ud", unit: "住院UD作業",
              assessment: { type: "radio", options: ["尚未訓練", "部份訓練", "已完訓"] },
              planning: { type: "radio_with_input", options: [{label: "6個月", value: 6}, {label: "自訂月數", input_type: "number"}] }
            },
            {
              id: "plan_consult", unit: "藥物諮詢",
              assessment: { type: "radio", options: ["尚未訓練", "部份訓練", "已完訓"] },
              planning: { type: "radio_with_input", options: [{label: "3個月", value: 3}, {label: "自訂月數", input_type: "number"}] }
            },
            {
              id: "plan_manage", unit: "藥品管理",
              assessment: { type: "radio", options: ["尚未訓練", "部份訓練", "已完訓"] },
              planning: { type: "radio_with_input", options: [{label: "1個月", value: 1}, {label: "自訂月數", input_type: "number"}] }
            },
            {
              id: "plan_chemo", unit: "化療藥品調劑",
              assessment: { type: "radio", options: ["尚未訓練", "部份訓練", "已完訓"] },
              planning: { type: "radio_with_input", options: [{label: "3個月", value: 3}, {label: "自訂月數", input_type: "number"}] }
            },
            {
              id: "plan_tpn", unit: "TPN調劑",
              assessment: { type: "radio", options: ["尚未訓練", "部份訓練", "已完訓"] },
              planning: { type: "radio_with_input", options: [{label: "3個月", value: 3}, {label: "自訂月數", input_type: "number"}] }
            },
            {
              id: "plan_clinical", unit: "臨床藥事服務",
              assessment: { type: "radio", options: ["尚未訓練", "部份訓練", "已完訓"] },
              planning: { type: "radio_with_input", options: [{label: "6個月", value: 6}, {label: "自訂月數", input_type: "number"}] }
            }
          ]
        }
      ]
    }
  ]
};
