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
}
