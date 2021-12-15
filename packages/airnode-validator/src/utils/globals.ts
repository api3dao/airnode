export const regexList = {
  arrayIndex: /\[([0-9]+)\]$/, // number surrounded with [] at the end of string
  arrayIndexOnly: /(?<=\[)[0-9]+(?=\])/, // matches only the array index (does not include surrounding [])
  convertorArrayOperation: /\[([0-9]*|_)\]$/, // any array operation in convertor
  noEscapeApostrophe: /(?<!\\)[']/g, // only non escaped apostrophes
  parameterValuePath: /(?<=\[)\[.+?\](?=\])/g, // parameter path to value that is being retrieved from specification - [[ 'param', 'path' ]]
  parameterNameIndex: /\{\{([0-9]+?)\}\}/g, // number surrounded by {{}}
  patchVersion: /(?<=([0-9]+\.[0-9]+))\.[0-9]+$/g, // matches third group of numbers separated by .
  regexTokens: /[\.\\\[\]\(\)]/g, // characters used in regular expressions and should be escaped before creating regex
  templateVersion: /^[0-9]+\.[0-9]+(\.[0-9]+)?$/, // format of validator template versions
};

export const keywords = {
  actions: '__actions',
  all: '__all',
  any: '__any',
  arrayItem: '__arrayItem',
  catch: '__catch',
  conditions: '__conditions',
  copy: '__copy',
  fullPath: '__fullPath',
  if: '__if',
  ignore: '__ignore',
  insert: '__insert',
  keyRegexp: '__keyRegexp',
  level: '__level',
  match: '__match',
  maxSize: '__maxSize',
  message: '__message',
  noCheck: '__noCheck',
  objectItem: '__objectItem',
  optional: '__optional',
  path: '__path',
  prefix: '__prefix',
  regexp: '__regexp',
  rootThen: '__rootThen',
  target: '__target',
  template: '__template',
  then: '__then',
  this: '__this',
  thisName: '__this_name',
  type: '__type',
  value: '__value',
};
