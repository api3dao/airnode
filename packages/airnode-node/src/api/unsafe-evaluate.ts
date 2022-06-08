import assert from 'assert';
import async_hooks from 'async_hooks';
import buffer from 'buffer';
import child_process from 'child_process';
import cluster from 'cluster';
import console from 'console';
import constants from 'constants';
import crypto from 'crypto';
import dgram from 'dgram';
import dns from 'dns';
import events from 'events';
import fs from 'fs';
import http from 'http';
import http2 from 'http2';
import https from 'https';
import inspector from 'inspector';
import module from 'module';
import net from 'net';
import os from 'os';
import path from 'path';
import perf_hooks from 'perf_hooks';
import process from 'process';
import readline from 'readline';
import repl from 'repl';
import stream from 'stream';
import string_decoder from 'string_decoder';
import timers from 'timers';
import tls from 'tls';
import trace_events from 'trace_events';
import tty from 'tty';
import url from 'url';
import util from 'util';
import v8 from 'v8';
import vm from 'vm';
import worker_threads from 'worker_threads';
import zlib from 'zlib';
import { createTimers } from './vm-timers';

const builtInNodeModules = {
  assert,
  async_hooks,
  buffer,
  child_process,
  cluster,
  console,
  constants,
  crypto,
  dgram,
  dns,
  events,
  fs,
  http,
  http2,
  https,
  inspector,
  module,
  net,
  os,
  path,
  perf_hooks,
  process,
  readline,
  repl,
  stream,
  string_decoder,
  timers,
  tls,
  trace_events,
  tty,
  url,
  util,
  v8,
  vm,
  worker_threads,
  zlib,
};

/**
 * This function is dangerous. Make sure to use it only with Trusted code.
 */
export const unsafeEvaluate = (input: any, code: string, timeout: number) => {
  const vmContext = {
    input,
    ...builtInNodeModules,
    deferredOutput: undefined,
  };

  vm.runInNewContext(`${code}; deferredOutput = output;`, vmContext, {
    displayErrors: true,
    timeout,
  });

  return vmContext.deferredOutput;
};

/**
 * This function runs asynchronous code in a Node VM.

 * @code should be written as ({input, resolve}) => {something; resolve({...input, something: 1})};
 * Refer to vmContext here for what's available.
 *
 * Some libraries one might expect to be available may not necessarily be available in cloud environments due to
 * being stripped out by webpack. In these cases these libraries may need to be minified and included in the `code`
 * payload.
 *
 * The value given to `resolve` is expected to be the equivalent of `output` above.
 */
export const unsafeEvaluateAsync = async (input: any, code: string, timeout: number) => {
  let vmReject: (reason: unknown) => void;

  // Make sure the timeout is applied. When the processing snippet uses setTimeout or setInterval, the timeout option
  // from VM is broken. See: https://github.com/nodejs/node/issues/3020.
  //
  // We need to manually clear all timers and reject the processing manually.
  const timeoutTimer = setTimeout(() => {
    vmReject(new Error('Timeout exceeded'));
  }, timeout);

  return new Promise((evaluateResolve, evaluateReject) => {
    const timers = createTimers();
    const vmResolve = (value: unknown) => {
      timers.clearAll();
      clearTimeout(timeoutTimer);
      evaluateResolve(value);
    };
    vmReject = (reason: unknown) => {
      timers.clearAll();
      clearTimeout(timeoutTimer);
      evaluateReject(reason);
    };

    const vmContext = {
      input,
      resolve: vmResolve,
      reject: vmReject,
      setTimeout: timers.customSetTimeout,
      setInterval: timers.customSetInterval,
      clearTimeout: timers.customClearTimeout,
      clearInterval: timers.customClearInterval,
      ...builtInNodeModules,
    };
    vm.runInNewContext(code, vmContext, { displayErrors: true, timeout });
  });
};
