import { subscribeInternEntries } from './internPassportStore.js';
import { subscribeInternSopReads, toSopReadEntry } from './internMaterials.js';

// 兩份資料都取得目前伺服器確認，才可據以統計及匯出。
export function subscribeInternWorkspace(db, uid, onState) {
  const parts = { entries: null, reads: null };
  const confirmed = { entries: false, reads: false };
  let active = true;
  let wasReady = false;
  let failure = null;
  const emit = () => {
    if (!active) return;
    const ready = confirmed.entries && confirmed.reads && !failure;
    const status = failure ? 'error' : ready ? 'ready' : wasReady ? 'reconnecting' : 'loading';
    wasReady ||= ready;
    onState({ status, entries: [...(parts.entries || []), ...(parts.reads || []).map(toSopReadEntry)], error: failure ? '無法讀取，請確認登入權限與網路後重試。' : '' });
  };
  const data = key => values => { parts[key] = values; confirmed[key] = true; emit(); };
  const server = key => value => { if (!value) { confirmed[key] = false; emit(); } };
  const fail = error => { failure = error; emit(); };
  const stops = [subscribeInternEntries(db, uid, data('entries'), fail, server('entries')), subscribeInternSopReads(db, uid, data('reads'), fail, server('reads'))];
  emit();
  return () => { active = false; stops.forEach(stop => stop()); };
}
