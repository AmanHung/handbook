import { serverTimestamp } from 'firebase/firestore';
import { auth } from '../firebase';

export const getEditorAuditFields = () => {
  const currentUser = auth.currentUser;

  if (!currentUser?.uid || !currentUser?.email) {
    throw new Error('無法確認 Google 登入身分，請重新登入後再試。');
  }

  const updatedByName = currentUser.displayName || currentUser.email;

  return {
    updatedBy: updatedByName,
    updatedByName,
    updatedByEmail: currentUser.email,
    updatedByUid: currentUser.uid,
    updatedAt: serverTimestamp(),
  };
};
