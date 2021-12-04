import { plugs } from './plugs';
import { Plug } from './types';

export * from './types';

const json = {
  a: 1,
  b: 2,
  secrets: {
    8: 'supersecret',
  },
  dates: {
    preformat: '2014-06-13 14:37',
    unknown: '25th day of November in the year 2021'
  },
  outputs: {
    sum: 8
  }
};

export function pipe() {
  const pipeline: Plug[] = [
    { name: 'add', inputs: ['a', 'b'], output: 'c' },
    { name: 'add', inputs: ['c', 5], output: 'outputs.sum' },
    { name: 'remove', inputs: ['a'], output: '' },
    { name: 'format-date', inputs: ['dates.preformat', 'yyyy-M-dd H:m', 'dd/M/yyyy h:ma'], output: 'outputs.dateformat' },
    { name: 'redact', inputs: ['secrets.${outputs.sum}'], output: 'outputs.password' },
    { name: 'remove', inputs: ['secrets'], output: '' },
    { name: 'substring', inputs: ['dates.unknown', 0, 2], output: 'temp.day' },
    { name: 'substring', inputs: ['dates.unknown', 12, 20], output: 'temp.month' },
    { name: 'substring', inputs: ['dates.unknown', 33, 37], output: 'temp.year' },
    { name: 'concat', inputs: ['temp.year', '-'], output: 'temp.full' },
    { name: 'concat', inputs: ['temp.full', 'temp.month'], output: 'temp.full' },
    { name: 'concat', inputs: ['temp.full', '-'], output: 'temp.full' },
    { name: 'concat', inputs: ['temp.full', 'temp.day'], output: 'outputs.unknown.date' },
    { name: 'remove', inputs: ['temp'], output: '' },
    { name: 'put', inputs: ['true'], output: 'outputs.bool' },
    { name: 'cast-boolean', inputs: ['outputs.bool'], output: 'outputs.bool' },
  ];

  const result = pipeline.reduce((acc: any, plug) => {
    const plugger = (plugs as any)[plug.name];
    return plugger(acc, plug);
  }, json);

  console.log('==============================');
  console.log(JSON.stringify(result, null, 2));
  console.log('==============================');
}

pipe();
