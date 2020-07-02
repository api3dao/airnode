import { Method } from '@airnode/node/types';

export interface Parameters {
  [key: string]: string;
}

export interface RequestParameters {
  paths: { [key: string]: string };
  query: { [key: string]: string };
  cookies: { [key: string]: string };
  headers: { [key: string]: string };
}

export interface BasicAuth {
  password: string;
  username: string;
}

export interface Request {
  baseUrl: string;
  path: string;
  method: Method;
  headers: { [key: string]: string };
  params: { [key: string]: string };
  data: { [key: string]: string };
  auth: BasicAuth;
}
