// 整合預覽的虛構資料介面，符合原 GAS 合約；不呼叫正式端點。
export function createPgyPassportFixture() {
  const students = [
    { id: 'pgy-preview-a', role: 'student', trainingType: 'pgy', email: 'pgy-a@example.test', displayName: '王藥師（示範）', arrivalDate: '2026-08-01' },
    { id: 'pgy-preview-b', role: 'student', trainingType: 'pgy', email: 'pgy-b@example.test', displayName: '李藥師（示範）', arrivalDate: '2026-09-01' },
  ];
  const items = [
    { id: 'preview_opd_01', category_id: 'outpatient', category_name: '門診調劑作業', title: '一般處方調劑流程', sub_item: '收單、調劑與核對' },
    { id: 'preview_opd_02', category_id: 'outpatient', category_name: '門診調劑作業', title: '一般處方調劑流程', sub_item: '藥品交付與用藥指導' },
    { id: 'preview_opd_03', category_id: 'outpatient', category_name: '門診調劑作業', title: '管制藥品調劑與紀錄規範' },
    { id: 'preview_ipd_01', category_id: 'inpatient', category_name: '住院調劑作業', title: 'UD 車作業流程' },
  ];
  const byEmail = Object.fromEntries(students.map((student, index) => [student.email, { items, records: index ? {} : { preview_opd_01: { status: 'pass', teacher: '示範指導藥師', date: '2026-10-30', note: '' }, preview_opd_03: { status: 'improve', teacher: '示範指導藥師', date: '2026-10-30', note: '安排再次評核。' } }, periods: { outpatient: { startDate: '2026-10-01', endDate: '2026-11-30' } } }]));
  return {
    students, items,
    links: { preview_opd_01: { sopIds: ['preview_sop'] } },
    sops: { preview_sop: { id: 'preview_sop', title: '處方調劑流程（示範教材）', content: '這是用於驗證原有 SOP 入口的示範文件。正式訓練請依院內現行 SOP 執行。' } },
    fetch: async (url, options) => {
      let result;
      if (options?.method === 'POST') {
        const body = JSON.parse(options.body);
        const student = byEmail[body.studentEmail];
        if (!student) throw new Error('示範學員不存在');
        if (body.type === 'saveEval') student.records[body.itemId] = { status: body.status, date: body.assessDate, teacher: body.teacherName, note: body.note };
        else if (body.type === 'savePeriod') student.periods[body.categoryId] = { startDate: body.startDate, endDate: body.endDate };
        else throw new Error('此預覽僅支援學習紀錄');
        result = { status: 'success' };
      } else {
        const email = new URL(url).searchParams.get('studentEmail');
        if (!byEmail[email]) throw new Error('示範學員不存在');
        result = byEmail[email];
      }
      return { ok: true, json: async () => structuredClone(result) };
    },
  };
}
