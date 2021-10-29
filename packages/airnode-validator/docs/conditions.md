# Conditions

## Basic condition

Conditions consist of `__if` and `__then` objects, these objects are placed into array `__conditions`, which can contain
any amount of conditional objects. Object `__if` contains parameter name with regular expression, if the regular
expression is matched in provided specification, validator will check if specification matches everything that's in the
`__then` object.

Even if evaluation of `__then` object takes place, all messages from this validation are discarded and replaced with
single error message.

### Template

```json
{
  "numbers": {
    "__arrayItem": {
      "value": {},
      "description": {},
      "__conditions": [
        {
          "__if": {
            "value": "^one$"
          },
          "__then": {
            "description": {
              "__regexp": "^This is required by one$",
              "__catch": {
                "__level": "error"
              }
            }
          }
        },
        {
          "__if": {
            "value": "^two$"
          },
          "__then": {
            "description": {
              "__regexp": "^This is required by two$",
              "__catch": {
                "__level": "error"
              }
            }
          }
        }
      ]
    }
  }
}
```

---

### Valid specification

```json
{
  "numbers": [
    {
      "value": "one",
      "description": "This is required by one"
    },
    {
      "value": "two",
      "description": "This is required by two"
    },
    {
      "value": "three",
      "description": "No requirement for three"
    }
  ]
}
```

---

### Invalid specification

```json
{
  "numbers": [
    {
      "value": "one",
      "description": "No requirement for one"
    },
    {
      "value": "two",
      "description": "This is required by one"
    }
  ]
}
```

### Expected output

```json
{
  "valid": false,
  "messages": [
    { "level": "error", "message": "Condition in numbers.[0].value is not met with value" },
    { "level": "error", "message": "Condition in numbers.[1].value is not met with value" }
  ]
}
```

---

## Matched pattern in `__then`

Matched pattern of regular expression in `__if` object can be accessed with `__match` anywhere in `__then` object.

### Template

```json
{
  "numbers": {
    "__arrayItem": {
      "value": {},
      "description": {
        "__objectItem": {}
      },
      "__conditions": [
        {
          "__if": {
            "value": ".*"
          },
          "__then": {
            "description": {
              "__match": {
                "__regexp": "^This is required by __match$",
                "__catch": {
                  "__level": "error"
                }
              }
            }
          }
        }
      ]
    }
  }
}
```

---

### Valid specification

```json
{
  "numbers": [
    {
      "value": "one",
      "description": {
        "one": "This is required by one"
      }
    },
    {
      "value": "two",
      "description": {
        "two": "This is required by two"
      }
    }
  ]
}
```

---

### Invalid specification

```json
{
  "numbers": [
    {
      "value": "one",
      "description": {
        "one": "This is required by two"
      }
    },
    {
      "value": "two",
      "description": {
        "two": "This is required by three"
      }
    }
  ]
}
```

### Expected output

```json
{
  "valid": false,
  "messages": [
    { "level": "error", "message": "Condition in numbers.[0].value is not met with value" },
    { "level": "error", "message": "Condition in numbers.[1].value is not met with value" }
  ]
}
```

---

## `__catch` in condition

As the default error message in conditions is not very specific, it can be replaced with custom message by adding
[catch](catch.md) parameter into condition object.

### Template

```json
{
  "numbers": {
    "__arrayItem": {
      "value": {},
      "description": {},
      "__conditions": [
        {
          "__if": {
            "value": "^one$"
          },
          "__then": {
            "description": {
              "__regexp": "^This is required by one$",
              "__catch": {
                "__level": "error"
              }
            }
          },
          "__catch": {
            "__message": "__fullPath only allowed value is: 'This is required by one'"
          }
        },
        {
          "__if": {
            "value": "^two$"
          },
          "__then": {
            "description": {
              "__regexp": "^This is required by two$",
              "__catch": {
                "__level": "error"
              }
            }
          },
          "__catch": {
            "__message": "__fullPath only allowed value is: 'This is required by two'"
          }
        }
      ]
    }
  }
}
```

---

### Invalid specification

```json
{
  "numbers": [
    {
      "value": "one",
      "description": "No requirement for one"
    },
    {
      "value": "two",
      "description": "This is required by one"
    }
  ]
}
```

### Expected output

```json
{
  "valid": false,
  "messages": [
    { "level": "error", "message": "numbers.[0].value only allowed value is: 'This is required by one'" },
    { "level": "error", "message": "numbers.[1].value only allowed value is: 'This is required by two'" }
  ]
}
```

---

## Root then

Conditions can be evaluated from root of the template by using `__rootThen` in place of `__then`.

### Template

```json
{
  "itemsList": {
    "__arrayItem": {
      "name": {},
      "__conditions": [
        {
          "__if": {
            "name": ".*"
          },
          "__rootThen": {
            "items": {
              "__match": {}
            }
          }
        }
      ]
    }
  },
  "items": {
    "__objectItem": {}
  }
}
```

---

### Valid specification

```json
{
  "itemsList": [
    {
      "name": "item0"
    },
    {
      "name": "item1"
    }
  ],
  "items": {
    "item0": {},
    "item1": {}
  }
}
```

---

### Invalid specification

```json
{
  "itemsList": [
    {
      "name": "item0"
    },
    {
      "name": "item1"
    }
  ],
  "items": {
    "item1": {}
  }
}
```

### Expected output

```json
{
  "valid": false,
  "messages": [{ "level": "error", "message": "Condition in itemsList.[0].name is not met with name" }]
}
```

---

## `__this` and `__this_name`

`__if` contains name of the parameter, but it can contain keywords `__this` or `__this_name` as well. `__this` will be
matching value of parameter, the condition is nested in, `__this_name` will be matching the key of the parameter.

### Template

```json
{
  "original": {
    "version": {
      "__conditions": [
        {
          "__if": {
            "__this": ".*"
          },
          "__rootThen": {
            "backup": {
              "version": {
                "__regexp": "^__match$",
                "__catch": {
                  "__level": "error"
                }
              }
            }
          }
        }
      ]
    },
    "__objectItem": {},
    "__conditions": [
      {
        "__if": {
          "__this_name": ".*"
        },
        "__rootThen": {
          "backup": {
            "__match": {}
          }
        }
      }
    ]
  },
  "backup": {
    "__objectItem": {}
  }
}
```

---

### Valid specification

```json
{
  "original": {
    "version": "1.0.2",
    "item0": "abc",
    "item1": "def",
    "item2": "ghi"
  },
  "backup": {
    "version": "1.0.2",
    "item0": "abc",
    "item1": "def",
    "item2": "ghi"
  }
}
```

---

### Invalid specification

```json
{
  "original": {
    "version": "1.0.2",
    "item0": "abc",
    "item1": "def",
    "item2": "ghi"
  },
  "backup": {
    "version": "1.0.0",
    "item0": "abc",
    "item1": "456"
  }
}
```

### Expected output

```json
{
  "valid": false,
  "messages": [
    { "level": "error", "message": "Condition in original.version is not met with version" },
    { "level": "error", "message": "Condition in original.item2 is not met with item2" }
  ]
}
```

---

## Other types in the condition

The `__if` section evaluates regular expression, but if the data type is other than string it will compare provided
value with the value in the specification.

### Template

```json
{
  "__arrayItem": {
    "__objectItem": {
      "__conditions": [
        {
          "__if": {
            "__this": false
          },
          "__rootThen": {
            "__any": {
              "bool": {
                "__regexp": "^true$"
              }
            }
          }
        }
      ]
    },
    "__conditions": [
      {
        "__if": {
          "number": 10
        },
        "__then": {
          "num": {
            "__regexp": "^ten$"
          }
        }
      }
    ]
  }
}
```

---

### Valid specification

```json
[
  {
    "number": 10,
    "num": "ten"
  },
  {
    "number": 3
  },
  {
    "boolean": false
  },
  {
    "bool": "true"
  }
]
```

---

### Invalid specification

```json
[
  {
    "number": 10
  },
  {
    "bool": true
  },
  {
    "boolean": false
  }
]
```

### Expected output

```json
{
  "valid": false,
  "messages": [
    {
      "level": "error",
      "message": "Condition in [0].number is not met with number"
    },
    {
      "level": "error",
      "message": "Condition in [2].boolean is not met with boolean"
    }
  ]
}
```

---
