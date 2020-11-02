# `validator`

A tool capable of determining if provided OIS is valid or not.

## Usage

Function `isOisValid` in `lib/validator.js` takes json string of OIS as parameter and returns object with following structure:
```
{
    valid: boolean,
    messages: array
}
```
Where array `messages` contains message objects:
```
{
    level: 'error' | 'warning',
    message: string
}
```
If provided OIS is valid, parameter `valid` will be true, however parameter `messages` still might contain messages with `level` set to `warning`. If `valid` is `false`, there will be always one or more error messages. Similarly functions `isApiSpecsValid` and `isEndpointsValid` check only the API and endpoint specifications contained in the OIS.


## Validator structure

To make modifications to OIS format as simple as possible, validator uses json structure that defines the valid format.

### Basics

Here is an example of a very basic structure:
```
{
    'server': {
        'url': {}
    },
    'component': {
        'securityScheme': {
            'in': {},
            'name': {},
            'type': {}
        }
    }
}
```

This means all the parameters are required, OIS will be valid only if it has all of them. Empty parentheses `{}` mean parameter can have any value except non-empty object. Example of valid OIS using validator structure above:

```
{
    "server": {
        "url": "https://just.example.com"
    },
    "component": {
        "securityScheme": {
            "in": "query",
            "name": "example",
            "type": {}
        }
    }
}
```

Expected result:

```
{
    "valid": true,
    "messages": []
}
```
---
Example of invalid input:

```
{
    "server": {
        "extra": {}
    },
    "component": {
        "securityScheme": {}
    }
}
```
Expected result:

```
{
    "valid": false,
    "messages": [
        { "level": "error", "message": "Missing parameter server.url" },
        { "level": "warning", "message": "Extra field: server.extra" },
        { "level": "error", "message": "Missing parameter component.securityScheme.in" },
        { "level": "error", "message": "Missing parameter component.securityScheme.name" },
        { "level": "error", "message": "Missing parameter component.securityScheme.type" }
    ]
}
```

### Regular expressions

To ensure parameters are in correct format, regular expressions are used. Token `__regexp` means, that value of the parameter, has to match the provided regular expression. Similarly `__keyRegexp`, is checking if the key of parameter matches the regular expression.

**Cheatsheet**

`^(one|two)$` - all the valid strings are `one` and `two`

`(?<={)[^\/{}]+(?=})` - anything thats between `{` and `}` (usage example at parameters in paths)

`^[^\s'"\\]+$` - any string with at least 1 character and not containing any whitespaces, `'`, `"` or `\\`

### Arrays and objects

Token `__arrayItem` means that the parameter is an array and contents of the token describe what should be the structure of the contents in the array. `maxSize` is an array specific token, which can be used to set maximal count of elements in the array.

`__objectItem` is used in combination with `__keyRegexp` or in conditions, it describes the structure of the object inside the parameter.

Validator structure example:

```
{
    'server': {
        '__maxSize': 1,
        '__arrayItem': {
            'url': {
                '__regexp': '^(https?|ftp)://[^\\s/$.?#].[^\\s]*$'
            }
        }
    },
    'component': {
        'securitySchemes': {
            '__objectItem': {
                'in': {
                    '__regexp': '^(query|header|cookie)$'
                },
                'name': {
                    '__regexp': '^[^\\s\'"\\\\]+$'
                },
                'type': {}
            }
        }
    },
    'security': {
        '__objectItem': {
            '__arrayItem': {}
        }
    }
}
```
---
Valid input:
```
{
  "server": [
    {
      "url": "https://just.example.com"
    }
  ],
  "component": {
    "securitySchemes": {
      "scheme1": {
        "in": "query",
        "name": "example1",
        "type": {}
      },
      "scheme2": {
        "in": "query",
        "name": "example2",
        "type": {}
      }
    }
  },
  "security": {
    "scheme1": [],
    "scheme2": []
  }
}
```
---
Invalid input:
```
{
  "server": [
    {
      "url": "https://just.example.com"
    },
    {
      "url": "example.com"
    }
  ],
  "component": {
    "securitySchemes": {
      "scheme": {
        "in": "invalid",
        "name": {},
        "type": {}
      }
    }
  },
  "security": {
    "scheme": [
      {
        "extra": "extra"
      }
    ]
  }
}
```
Expected result:
```
{
    "valid": false,
    "messages": [
        { "level": "error", "message": "server must contain 1 or less items" },
        { "level": "warning", "message": "server[1].url is not formatted correctly" },
        { "level": "warning", "message": "component.securitySchemes.scheme.in is not formatted correctly" },
        { "level": "warning", "message": "component.securitySchemes.scheme.name is not formatted correctly" },
        { "level": "warning", "message": "Extra field: security.scheme[0].extra" }
    ] 
}
```

### Conditions

All the conditions of the parameter are objects inside array with key `__conditions`. Condition has to contain token `__require` or both tokens `__if` and `__then`.

`__require` consists of a parameter path that validator will check and throw error if it doesn't exist. The path is relative to the location of the parameter, but if it starts with `/` it is absolute path starting in the root of the whole specification. The path can also contain special token `__this_name` which will be replaced by the name of parameter that the condition relates to.

`__if` contains name of the parameter which the validator should check and regular expression, which will be matched with the value of provided parameter. `__then` contains structure that will be checked only if the condition in `__if` is fulfilled.

`__if` can also contain `__this` keyword, in this case validator, won't be checking parameters of in the value of the object, but key of the object. Value of `__this` is a regular expression, if the regular expression is fulfilled, section `__then` can contain keyword `__match`, which will be replaced with result of the regular expression in `__this`.

Section `__then` can contain keyword `__any`, on level where array or object is expected. Validator will check every item/object, if none of them fulfills the condition, the specs will be invalid.

Sometimes a warning, should be considered an error and vice versa, the level of the message can be adjusted with `__level` for specific parameter.

Validator structure example:
```
{
  'array': {
    '__arrayItem': {
      '__keyRegexp': '^/[a-zA-Z{}/]+$',
      '__conditions': [
        {
          '__if': {
            '__this': '(?<={)[^\\/{}]+(?=})'
          },
          '__then': {
            'param': {
              '__regexp': '^__match$',
              '__level': 'error'
            }
          }
        }
      ],
      '__objectItem': {
        '__conditions': [
          {
            '__if': {
              'name': '^condition$'
            },
            '__then': {
              'fulfilled': {
                '__regexp': '^(yes|no)$'
              }
            }
          },
          {
            '__if': {
              'two': '.*'
            },
            '__then': {
              '__any': {
                '__regexp': '^two$'
              }
            }
          },
          {
            '__require': {
              'relative': {}
            }
          },
          {
            '__require': {
              '/absolute.__this_name': {}
            }
          }
        ]
      }
    }
  }
}
```
---
Valid input:
```
{
  "array": [
    {
      "/one": {
        "relative": "param"
      }
    },
    {
      "/condition": {
        "name": "condition",
        "fulfilled": "yes",
        "relative": "param"
      }
    },
    {
      "/path/{param}": {
        "relative": "param",
        "param": "param"
      }
    },
    {
      "/two": {
        "two": "value",
        "name": "two",
        "relative": "param"
      }
    }
  ],
  "absolute": {
    "/one": "one",
    "/condition": "condition",
    "/path/{param}": "two",
    "/two": "three"
  }
}
```
---
Invalid input:
```
{
  "array": [
    {
      "/one": {
        "notRelative": "param"
      }
    },
    {
      "/condition": {
        "name": "condition",
        "fulfilled": "invalid",
        "relative": "param"
      }
    },
    {
      "/path/{param}": {
        "relative": "another",
        "param": "random"
      }
    },
    {
      "/two": {
        "two": "different",
        "relative": "param"
      }
    }
  ],
  "absolute": {
    "/condition": "condition",
    "/path/{param}": "two",
    "/two": "two"
  }
}
```
Expected output:
```
{
    valid: false,
    messages: [
        { "level": "error", "message": "Missing parameter array[0]./one.relative" },
        { "level": "error", "message": "Missing parameter absolute./one" },
        { "level": "warning", "message": "array[1]./condition.fulfilled is not formatted correctly" },
        { "level": "error", "message": "Condition in array[2]./path/{param} is not met with param" },
        { "level": "error", "message": "Required conditions not met in array[3]./two" }
    ]
}
```