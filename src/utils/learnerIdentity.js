// 舊版 role=intern 與未設定 trainingType 的 PGY 帳號皆可直接使用。
export const isTeachingRole = role => ['teacher', 'admin'].includes(role);
export const isLearnerRole = role => ['student', 'intern'].includes(role);
export const getLearnerTrack = profile => !isLearnerRole(profile?.role) ? null
  : profile.role === 'intern' || profile.trainingType === 'intern' ? 'intern' : 'pgy';
export const getLearnerLabel = profile => getLearnerTrack(profile) === 'intern' ? '實習生' : 'PGY 學員';
export const getLearnerProfileFields = profile => ({
  displayName: profile.displayName || '', arrivalDate: profile.arrivalDate || '',
  role: profile.role === 'intern' ? 'student' : profile.role || 'student',
  trainingType: getLearnerTrack(profile) || 'pgy', school: profile.school || '',
  internshipCohort: profile.internshipCohort || '', internshipEndDate: profile.internshipEndDate || '',
});
