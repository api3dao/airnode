'use strict';

const specsStructure = {
  'title': {},
  'servers': {
    '__maxSize': 1,
    '__arrayItem': {
      'url': {
        '__regexp': '^(https?|ftp)://[^\\s/$.?#].[^\\s]*$'
      },
    },
  },
  'paths': {
    '__keyRegexp': '^\\/[^\\s\'"\\\\]+$',
    '__objectItem': {
      '__keyRegexp': '^(get|post)$',
      '__objectItem': {
        'parameters': {
          '__arrayItem': {
            'name': {},
            'in': {
              '__regexp': '^(path|query|header|cookie)$'
            },
          },
        }
      }
    }
  },
  'components': {
    'securitySchemes': {
      '__keyRegexp': '^[^\\s\'"\\\\]+$',
      '__objectItem': {
        'type': {
          '__regexp': '^(apiKey|http|oauth2|openIdConnect)$'
        },
        'name': {},
        'in': {
          '__regexp': '^(query|header|cookie)$'
        },
      }
    }
  },
  'security': {
    '__arrayItem': {
      '__keyRegexp': '^[^\\s\'"\\\\]+$',
      '__objectItem': {
        '__arrayItem': {
          'securitySchemeName': {
            '__regexp': '^[^\\s\'"\\\\]+$'
          },
          'type': {
            '__regexp': '^(apiKey|http|oauth2|openIdConnect)$'
          },
          'name': {},
          'in': {
            '__regexp': '^(query|header|cookie)$'
          },
          'value': {}
        }
      }
    }
  }
};

function validateSpecs(specs, specsStruct, paramPath) {
  let messages = [];
  let valid = true;
  let checkExtraFields = true;

  for (const key of Object.keys(specsStruct)) {
    if (key === '__regexp') {
      if (!specs.match(new RegExp(specsStruct[key]))) {
        messages.push({ level: 'warning', message: `${paramPath} is not formatted correctly` });
      }

      checkExtraFields = false;
      continue;
    }

    if (key === '__keyRegexp') {
      for (const item of Object.keys(specs)) {
        if (!item.match(new RegExp(specsStruct[key]))) {
          messages.push({ level: 'error', message: `Key ${item} in ${paramPath}${paramPath ? '.' : ''}${item} is formatted incorrectly` });
        }
      }

      checkExtraFields = false;
      continue;
    }

    if (key === '__maxSize') {
      if (specsStruct[key] < specs.length) {
        messages.push({ level: 'error', message: `${paramPath}${paramPath ? '.' : ''}${key} must contain ${specsStruct[key]} or less items` });
        valid = false;
      }

      checkExtraFields = false;
      continue;
    }

    if (key === '__arrayItem') {
      for (let i = 0; i < specs.length; i++) {
        let result = validateSpecs(specs[i], specsStruct[key], `${paramPath}[${i}]`);
        messages.push(...result.messages);

        if (!result.valid) {
          valid = false;
        }
      }

      checkExtraFields = false;
      continue;
    }

    if (key === '__objectItem') {
      for (const item of Object.keys(specs)) {
        let result = validateSpecs(specs[item], specsStruct[key], `${paramPath}${paramPath ? '.' : ''}${item}`);
        messages.push(...result.messages);

        if (!result.valid) {
          valid = false;
        }
      }

      checkExtraFields = false;
      continue;
    }

    if (!specs[key]) {
      messages.push({ level: 'error', message: `Missing parameter ${paramPath}${paramPath ? '.' : ''}${key}`});
      valid = false;

      continue;
    }

    if (!Object.keys(specsStruct[key]).length) {
      continue;
    }

    let result = validateSpecs(specs[key], specsStruct[key], `${paramPath}${paramPath ? '.' : ''}${key}`);
    messages.push(...result.messages);

    if (!result.valid) {
      valid = false;
    }
  }

  if (checkExtraFields) {
    for (const key of Object.keys(specs)) {
      if (!specsStruct[key]) {
        messages.push({ level: 'warning', message: `Extra field: ${paramPath}${paramPath ? '.' : ''}${key}` });
      }
    }
  }

  return { valid, messages };
}

function isSpecsValid(specs) {
  let parsedSpecs;

  try {
    parsedSpecs = JSON.parse(specs);
  } catch (e) {
    return { valid: false, messages: [{ level: 'error', message: `${e.name}: ${e.message}` }] };
  }

  return validateSpecs(parsedSpecs, specsStructure, '');
}

module.exports = { isSpecsValid };
