export const regexList = {
  arrayIndex: /\[([0-9]+)\]$/, // number surrounded with [] at the end of string
  arrayIndexOnly: /(?<=\[)[0-9]+(?=\])/, // matches only the array index (does not include surrounding [])
  convertorArrayOperation: /\[([0-9]*|_)\]$/, // any array operation in convertor
  noEscapeApostrophe: /(?<!\\)[']/g, // only non escaped apostrophes
  parameterValuePath: /(?<=\[)\[.+?\](?=\])/g, // parameter path to value that is being retrieved from specification - [[ 'param', 'path' ]]
  parameterNameIndex: /\{\{([0-9]+?)\}\}/g, // number surrounded by {{}}
  regexTokens: /[\.\\\[\]\(\)]/g, // characters used in regular expressions and should be escaped before creating regex
};
