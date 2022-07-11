// The default amount of time before a "retryable" promise is timed out and retried
export const DEFAULT_RETRY_TIMEOUT_MS = 5_000;
// The default amount of time between retry attempts
export const DEFAULT_RETRY_DELAY_MS = 50;
export const PRIORITY_FEE_IN_WEI = 3_120_000_000;
// The Base Fee to Max Fee multiplier
export const BASE_FEE_MULTIPLIER = 2;
// By default there is no gas price multiplier
export const GAS_PRICE_MULTIPLIER = 1;
export const RANDOM_BACKOFF_MIN_MS = 0;
export const RANDOM_BACKOFF_MAX_MS = 2_500;
export const GAS_ORACLE_STRATEGY_ATTEMPT_TIMEOUT_MS = 3000;
export const GAS_ORACLE_STRATEGY_MAX_TIMEOUT_MS = 5000;
