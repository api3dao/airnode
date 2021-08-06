export const templates = {
  apispecifications: 'apiSpecifications.json',
  apispecs: 'apiSpecifications.json',
  config: 'config.json',
  endpoints: 'endpoints.json',
  ois: 'ois.json',
};

export interface Log {
  level: 'warning' | 'error';
  message: string;
}

export interface Roots {
  specs: any;
  nonRedundantParams: any;
  output: any;
}

export interface Result {
  valid: boolean;
  messages: Log[];
  output?: object;
  specs?: object;
}
