// 切換帳號或取消訂閱後，先前尚未完成的工作不得再變更畫面。
export function createSessionBoundary() {
  let revision = 0;
  return {
    begin() {
      const started = ++revision;
      return () => started === revision;
    },
    cancel() { revision += 1; },
  };
}
