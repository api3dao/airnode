import * as aws from './aws/handler';

export * from './core/handlers';
export * from './types';

export const AWS = { ...aws };
