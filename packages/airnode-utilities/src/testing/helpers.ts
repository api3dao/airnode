export async function advanceTimersByTime(ms: number) {
  jest.advanceTimersByTime(ms);
  // Inspired by: https://github.com/facebook/jest/issues/2157#issuecomment-897935688
  //
  // Manually moving jest timers is a synchronous operation. We need to "flush" the pending promises manually.
  await new Promise((res) => jest.requireActual('timers').setImmediate(res));
}
