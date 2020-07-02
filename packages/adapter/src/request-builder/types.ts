export interface UserParams {
  [key: string]: string;
}

export type Method = 'get' | 'post';

export interface BasicAuth {
  password: string;
  username: string;
}

export interface Request {
  baseUrl?: string;
  path?: string;
  method?: Method;
  headers?: { [key: string]: string };
  params?: { [key: string]: string };
  data?: { [key: string]: string };
  auth?: BasicAuth;
}
