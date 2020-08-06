'use strict';

const validator = require('..');

const specs1 = `{
"servers": [
    {
        "url":  "https://myapi.com/api"
    }
],
"paths": {
    "/myPath": {
      "get": {
        "parameters": [
          {
            "name": "myParameter",
            "in": "query"
          }
        ]
      }
    }   
},
"components": {
    "securitySchemes": {
      "mySecurityScheme": {
        "type": "apiKey",
        "name": "X-MY-API-KEY",
        "in": "query"
      }
    }
},
"security": {
      "mySecurityScheme": []
        }
}`;

const specs2 = `{
"servers": [],
"paths": {},
"components": {
    "securitySchemes": {}
},
"security": {}
}`;

const specs3 = `{
"servers": [
    {
        "url":  "https:/myapi.com/api"
    }
],
"paths": {
    "/myPath": {
      "get": {
        "parameters": [
          {
            "name": "myParameter",
            "in": "query"
          }
        ]
      }
    }   
},
"components": {
    "securitySchemes": {
      "mySecurityScheme": {
        "type": "apiKey",
        "name": "X-MY-API-KEY",
        "in": "query"
      }
    }
},
"security": {
      "mySecurityScheme": []
        }
}`;

const specs4 = `{
"servers": [
    {
        "url":  "https://myapi.com/api "
    }
],
"paths": {
    "myPath": {
      "get ": {
        "parameters": [
          {
            "name": "myParameter",
            "in": "query "
          }
        ]
      }
    }   
},
"components": {
    "securitySchemes": {
      "mySecurityScheme ": {
        "type": "apiKey",
        "name": "X-MY-API-KEY",
        "in": "Query"
      }
    }
},
"security": {
  "mySecurityScheme ": []
    }
}`;

const specs5 = `{
"servers": [
    {
        "url":  "https://myapi.com/api"
    }
],
"paths": {
    "/myPath": {
      "get": {
        "parameters": [
          {
            "name": "myParameter",
            "in": "path"
          },
          {
            "name": "myParameter",
            "in": "query"
          },
          {
            "name": "myParameter",
            "in": "header"
          }
        ]
      }
    },
    "/myPath2": {
      "get": {
        "parameters": [
          {
            "name": "myParameter",
            "in": "path"
          },
          {
            "name": "myParameter",
            "in": "query"
          },
          {
            "name": "myParameter",
            "in": "header"
          }
        ]
      }
    }   
},
"components": {
    "securitySchemes": {
      "mySecurityScheme": {
        "type": "apiKey",
        "name": "X-MY-API-KEY",
        "in": "query"
      },
      "mySecurityScheme2": {
        "type": "http",
        "in": "header",
        "scheme": "Basic"
      }
    }
},
"security": {
  "mySecurityScheme": [],
  "mySecurityScheme2": []
    }
}`;

const specs6 = `{
"servers": [
    {
        "url":  "https://myapi.com/api"
    },
    {
        "url":  "https://myapi.com/api"
    }
],
"paths": {
    "/myPath": {
      "get": {
        "parameters": [
          {
            "name": "myParameter",
            "in": "path"
          },
          {
            "name": "myParameter",
            "in": "query"
          },
          {
            "name": "myParameter",
            "in": "header"
          }
        ]
      }
    },
    "/myPath2": {
      "get": {
        "parameters": [
          {
            "name": "myParameter",
            "in": "path"
          },
          {
            "name": "myParameter",
            "in": "query"
          },
          {
            "name": "myParameter",
            "in": "header"
          }
        ]
      }
    }   
},
"components": {
    "securitySchemes": {
      "mySecurityScheme": {
        "type": "apiKey",
        "name": "X-MY-API-KEY",
        "in": "query"
      },
      "mySecurityScheme2": {
        "type": "apiKey",
        "name": "X-MY-API-KEY",
        "in": "header"
      }
    }
},
"security": {
      "mySecurityScheme": [],
      "mySecurityScheme2": []
    }
}`;

const specs7 = `{
"servers": [],
"paths": {},
"components": {
    "securitySchemes": {}
},
"security": {}
}`;

const specs8 = `{
"servers": [],
"paths": {},
"components": {
    "securitySchemes": {}
},
"security": {}`;

const specs9 = `{
"servers": [],
"paths": {
    "/myPath": {
      "post": {
        "parameters": []
      }
    }
},
"components": {
    "securitySchemes": {
        "mySecurityScheme": {
            "type": "apiKey",
            "name": "X-MY-API-KEY",
            "in": "query"
          }
    }
},
"security": {
    "mySecurityScheme": []
    }
}`;

const specs10 = `{
"servers": [],
"paths": {
    "/myPath": {}
},
"components": {
    "securitySchemes": {
        "mySecurityScheme": {
            "type": "apiKey",
            "name": "X-MY-API-KEY",
            "in": "query"
          }
    }
},
"security": {
  "mySecurityScheme": []
}
}`;

const specs11 = `{
"paths": {
    "/myPath": {
        "post": {}
    }
},
"components": {
    "securitySchemes": {
        "mySecurityScheme": {
          }
    }
}
}`;

const specs12 = `{
"servers": [
    {
        "url":  "https://myapi.com/api"
    }
],
"paths": {
    "/myPath": {
      "get": {
        "parameters": [
          {}
        ]
      }
    },
    "/myPath2": {
      "post": {
        "parameters": [
          {
            "in": "query"
          },
          {
            "name": "myParameter",
            "in": "query"
          },
          {
            "name": "myParameter"
          }
        ]
      }
    }   
},
"components": {
    "securitySchemes": {
      "mySecurityScheme": {},
      "mySecurityScheme2": {
        "type": "apiKey",
        "name": "X-MY-API-KEY",
        "in": "header"
      }
    }
},
"security": {
      "mySecurityScheme": [],
      "mySecurityScheme2": []
        }
    }`;

const specs13 = `{}`;

const specs14 = `{
"extra": {
    "inside": "extra"
},
"servers": [
    {
        "url":  "https://myapi.com/api",
        "extra": "field"
    }
],
"paths": {
    "/myPath": {
      "get": {
        "parameters": [
          {
            "name": "myParameter",
            "in": "query",
            "extra": "field"
          }
        ],
        "others": [
            {
                "name": "myParameter",
            "in": "query"
            }
        ]
      }
    }   
},
"components": {
    "securitySchemes": {
      "mySecurityScheme": {
        "type": "apiKey",
        "name": "X-MY-API-KEY",
        "in": "query",
        "extra": "field"
      }
    },
    "extra": {}
},
"security": {
  "mySecurityScheme": []
    }
}`;

const specs15 = `{
"servers": [
    {
        "url":  "https://myapi.com/api"
    }
],
"paths": {},
"components": {
    "securitySchemes": {
      "mySecurityScheme": {
        "type": "invalid",
        "in": "query"
      },
      "mySecurityScheme2": {
        "type": "apiKey",
        "in": "query"
      },
      "mySecurityScheme3": {
        "type": "apiKey",
        "in": "query",
        "scheme": "invalid"
      },
      "mySecurityScheme4": {
        "type": "http",
        "in": "query",
        "scheme": "invalid"
      }
    }
},
"security": {
  "mySecurityScheme": [],
  "mySecurityScheme2": [],
  "mySecurityScheme3": [],
  "mySecurityScheme4": [],
  "mySecurityScheme5": []
}
}`;

function formattingMessage(paramPath, error = false) {
  return { level: error ? 'error' : 'warning', message: `${paramPath} is not formatted correctly` };
}

function keyFormattingMessage(key, paramPath) {
  return { level: 'error', message: `Key ${key} in ${paramPath} is formatted incorrectly` };
}

function sizeExceededMessage(paramPath, maxSize) {
  return { level: 'error', message: `${paramPath} must contain ${maxSize} or less items` };
}

function missingParamMessage(param) {
  return { level: 'error', message: `Missing parameter ${param}` };
}

function extraFieldMessage(param) {
  return { level: 'warning', message: `Extra field: ${param}` };
}

describe('validator', () => {
  describe('api specs', () => {
    test('valid configuration', () => {
      expect(validator.isSpecsValid(specs1)).toMatchObject({ valid: true, messages: [] });
      expect(validator.isSpecsValid(specs2)).toMatchObject({ valid: true, messages: [] });
    });

    test('invalid formatting', () => {
      expect(validator.isSpecsValid(specs3)).toMatchObject({
        valid: true,
        messages: [formattingMessage('servers[0].url')],
      });
      expect(validator.isSpecsValid(specs4)).toMatchObject({
        valid: true,
        messages: [
          formattingMessage('servers[0].url'),
          keyFormattingMessage('myPath', 'paths.myPath'),
          keyFormattingMessage('get ', 'paths.myPath.get '),
          formattingMessage('paths.myPath.get .parameters[0].in'),
          keyFormattingMessage('mySecurityScheme ', 'components.securitySchemes.mySecurityScheme '),
          formattingMessage('components.securitySchemes.mySecurityScheme .in'),
          keyFormattingMessage('mySecurityScheme ', 'security.mySecurityScheme ')
        ],
      });
    });

    test('multiple array items', () => {
      expect(validator.isSpecsValid(specs5)).toMatchObject({ valid: true, messages: [] });
      expect(validator.isSpecsValid(specs6)).toMatchObject({
        valid: false,
        messages: [sizeExceededMessage('servers.__maxSize', 1)],
      });
    });

    test('edge cases', () => {
      expect(validator.isSpecsValid(specs7)).toMatchObject({ valid: true, messages: [] });
      expect(validator.isSpecsValid(specs8)).toMatchObject({
        valid: false,
        messages: [{ level: 'error', message: 'SyntaxError: Unexpected end of JSON input' }],
      });
      expect(validator.isSpecsValid(specs9)).toMatchObject({ valid: true, messages: [] });
      expect(validator.isSpecsValid(specs10)).toMatchObject({ valid: true, messages: [] });
    });

    test('missing parameters', () => {
      expect(validator.isSpecsValid(specs11)).toMatchObject({
        valid: false,
        messages: [
          missingParamMessage('servers'),
          missingParamMessage('paths./myPath.post.parameters'),
          missingParamMessage('components.securitySchemes.mySecurityScheme.type'),
          missingParamMessage('security.mySecurityScheme'),
          missingParamMessage('components.securitySchemes.mySecurityScheme.in'),
          missingParamMessage('security'),
        ],
      });
      expect(validator.isSpecsValid(specs12)).toMatchObject({
        valid: false,
        messages: [
          missingParamMessage('paths./myPath.get.parameters[0].name'),
          missingParamMessage('paths./myPath.get.parameters[0].in'),
          missingParamMessage('paths./myPath2.post.parameters[0].name'),
          missingParamMessage('paths./myPath2.post.parameters[2].in'),
          missingParamMessage('components.securitySchemes.mySecurityScheme.type'),
          missingParamMessage('components.securitySchemes.mySecurityScheme.in')
        ],
      });
      expect(validator.isSpecsValid(specs13)).toMatchObject({
        valid: false,
        messages: [
          missingParamMessage('servers'),
          missingParamMessage('paths'),
          missingParamMessage('components'),
          missingParamMessage('security'),
        ],
      });
    });

    test('extra fields', () => {
      expect(validator.isSpecsValid(specs14)).toMatchObject({
        valid: true,
        messages: [
          extraFieldMessage('servers[0].extra'),
          extraFieldMessage('paths./myPath.get.parameters[0].extra'),
          extraFieldMessage('paths./myPath.get.others'),
          extraFieldMessage('components.securitySchemes.mySecurityScheme.extra'),
          extraFieldMessage('components.extra'),
          extraFieldMessage('extra'),
        ],
      });
    });

    test('conditional checks', () => {
      expect(validator.isSpecsValid(specs15)).toMatchObject({
        valid: false,
        messages: [
        formattingMessage('components.securitySchemes.mySecurityScheme.type', true),
          missingParamMessage('components.securitySchemes.mySecurityScheme2.name'),
          missingParamMessage('components.securitySchemes.mySecurityScheme3.name'),
          extraFieldMessage('components.securitySchemes.mySecurityScheme3.scheme'),
          formattingMessage('components.securitySchemes.mySecurityScheme4.scheme', true),
          missingParamMessage('components.securitySchemes.mySecurityScheme5')
        ]
      });
    });
  });
});
