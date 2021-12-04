export interface Plug {
  name: string;
  inputs: (string | number | boolean)[];
  output: string;
}

export interface Response {
  [key: string]: any;
}
