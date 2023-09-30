/**
 * Timers (setTimeout, setInterval) do not work in Node.js vm, see: https://github.com/nodejs/help/issues/1875
 *
 * The API is wrapped in a "create" function so that every processing snippet keeps track of its timers and properly
 * cleans them up after use.
 */
export const createTimers = () => {
  let timeouts: NodeJS.Timeout[] = [];

  const customSetTimeout = (fn: () => void, ms: number) => {
    timeouts.push(setTimeout(fn, ms));
  };

  const customClearTimeout = (id: NodeJS.Timeout) => {
    timeouts = timeouts.filter((timeoutId) => timeoutId !== id);
    clearTimeout(id);
  };

  const clearAllTimeouts = () => {
    timeouts.forEach(clearTimeout);
    timeouts = [];
  };

  let intervals: NodeJS.Timeout[] = [];

  const customSetInterval = (fn: () => void, ms: number) => {
    intervals.push(setInterval(fn, ms));
  };

  const customClearInterval = (id: NodeJS.Timeout) => {
    intervals = intervals.filter((intervalId) => intervalId !== id);
    clearInterval(id);
  };

  const clearAllIntervals = () => {
    intervals.forEach(clearInterval);
    intervals = [];
  };

  const clearAll = () => {
    clearAllTimeouts();
    clearAllIntervals();
  };

  return {
    customSetTimeout,
    customClearTimeout,
    clearAllTimeouts,
    customSetInterval,
    customClearInterval,
    clearAllIntervals,
    clearAll,
  };
};
