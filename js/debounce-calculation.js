// 单线程同步计算无法被中途打断；此调度器取消尚未开始的旧任务。
export function createDebouncedCalculation(run, delay = 350, timers = globalThis) {
  let timer = null, revision = 0;
  function cancel() { revision++; if (timer !== null) timers.clearTimeout(timer); timer = null; }
  function schedule() { cancel(); const mine = revision; timer = timers.setTimeout(() => { timer = null; if (mine === revision) run(); }, delay); }
  return {schedule, cancel};
}
