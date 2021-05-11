# Basics

Most basic validator template can simply include names of all required parameters, which will result in validator accepting any specification that has exactly these parameters with any values.

### Template
```json
{
  "server": {
    "url": {}
  },
  "component": {
    "securityScheme": {
      "in": {},
      "name": {},
      "type": {}
    }
  }
}
```
---
### Valid specification
```json
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
### Expected output
```json
{
    "valid": true,
    "messages": []
}
```
---
### Invalid specification
```json
{
    "server": {
        "extra": {}
    },
    "component": {
        "securityScheme": {}
    }
}
```
### Expected output
```json
{
    "valid": false,
    "messages": [
        { "level": "error", "message": "Missing parameter server.url" },
        { "level": "error", "message": "Missing parameter component.securityScheme.in" },
        { "level": "error", "message": "Missing parameter component.securityScheme.name" },
        { "level": "error", "message": "Missing parameter component.securityScheme.type" },
        { "level": "warning", "message": "Extra field: server.extra" }
    ]
}
```
---

# Arrays and objects

Token `__arrayItem` means that the parameter is an array and contents of the token describe what should be the structure of the contents in the array. `maxSize` is an array specific token, which can be used to set maximal count of elements in the array.

`__objectItem` is used in combination with `__keyRegexp` or in conditions, it describes the structure of the object inside the parameter.

#### Template
```json
{
  "server": {
    "__maxSize": 1,
    "__arrayItem": {
      "url": {
        "__regexp": "^(https?|ftp)://[^\\s/$.?#].[^\\s]*$"
      }
    }
  },
  "component": {
    "securitySchemes": {
      "__objectItem": {
        "in": {
          "__regexp": "^(query|header|cookie)$"
        },
        "name": {
          "__regexp": "^[^\\s'\"\\\\]+$"
        },
        "type": {}
      }
    }
  },
  "security": {
    "__objectItem": {
      "__arrayItem": {}
    }
  }
}
```
---
#### Valid specification
```json
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
#### Invalid specification
```json
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
#### Expected output
```json
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
---
