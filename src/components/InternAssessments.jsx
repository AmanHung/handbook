import { useMemo, useRef } from 'react';
import { getDocFromServer } from 'firebase/firestore';
import OSCEAssessment from './OSCEAssessment';
import DOPSAssessment from './DOPSAssessment';
import { createInternAssessmentAdapter, INTERN_OSCE_CONFIG } from '../services/internAssessmentAdapter';
import { sortInternEntries } from '../services/internPassportStore';
import { INTERN_DOPS_FORMS, isInternDopsForm } from '../data/internDopsForms';

export default function InternAssessments({ student, entries, isTeacher, currentUserName, onSave, type, targetFormId, targetRecordId }) {
  const live = useRef({ entries, onSave });
  live.current = { entries, onSave };
  const store = useMemo(() => {
    const confirmed = new Map();
    return createInternAssessmentAdapter({ isTeacher,
      readEntries: () => sortInternEntries([...new Map([...confirmed, ...live.current.entries.map(entry => [entry.id, entry])]).values()]),
      persist: async entry => {
        const result = await live.current.onSave(entry);
        if (!result) throw new Error('未取得保存結果，請重新載入確認。');
        const saved = result.type === 'document' ? await getDocFromServer(result).then(snapshot => ({ ...snapshot.data(), id: snapshot.id })) : result;
        confirmed.set(saved.id, saved);
        return saved;
      },
    });
  }, [student.id, isTeacher]);
  const common = { studentEmail: student.email || `${student.id}@preview.test`, studentName: student.displayName, assessmentStore: store, revision: entries.length, targetRecordId };
  return <div className="ip-shared-assessment">{type === 'osce'
    ? <OSCEAssessment {...common} isTeacher={isTeacher} userProfile={{ displayName: currentUserName }} configuration={INTERN_OSCE_CONFIG} />
    : <><p className="ip-hint">依實習生訓練計畫附件 5，DOPS 評估僅包含「抗腫瘤藥物調配作業安全防護裝備」。</p>{targetFormId && !isInternDopsForm(targetFormId) && <p className="ip-notice">此項未列入實習訓練計畫，既有紀錄請至後台歷史紀錄查看。</p>}<DOPSAssessment {...common} forms={INTERN_DOPS_FORMS} userRole={isTeacher ? student.viewerRole === 'admin' ? 'admin' : 'teacher' : 'student'} currentUserName={currentUserName} targetFormId={targetFormId} /></>}</div>;
}
