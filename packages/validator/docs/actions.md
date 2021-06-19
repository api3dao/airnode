# Actions

If any action is specified in template, object `output` will be returned when processing a specification. This object is at first empty, by inserting or copying parameters from specification it can construct desired specification.

## Copy action

`__copy` object located inside `__actions` array of some parameter will copy the value of parameter it is nested in into provided `__target`, which is evaluated as an absolute path.

### Template

```json
{
  "company": {},
  "inventory": {
    "__arrayItem": {
      "name": {},
      "quantity": {}
    },
    "__actions": [
      {
        "__copy": {
          "__target": "[ 'backups', '[[ \\'/\\', \\'company\\' ]]' ]"
        }
      }
    ]
  }
}
```
---
### Input

```json
{
  "company": "anon",
  "inventory": [
    {
      "name": "item1",
      "quantity": 10
    },
    {
      "name": "item2",
      "quantity": 3
    }
  ]
}
```
### Expected output

```json
{
  "valid": true,
  "messages": [],
  "output": {
    "backups": {
      "anon": [
        {
          "name": "item1",
          "quantity": 10
        },
        {
          "name": "item2",
          "quantity": 3
        }
      ]
    }
  }
}
```
---

## Insert action

Keyword `__insert` works similarly to `__copy`, except it doesn't copy a value of parameter, but inserts value provided in `__value`

### Template

```json
{
  "original": {},
  "__actions": [
    {
      "__insert": {
        "__target": "[ 'example1' ]",
        "__value": "inserted"
      }
    },
    {
      "__insert": {
        "__target": "[ 'example2' ]",
        "__value": {
          "obj": {
            "value": "inserted"
          }
        }
      }
    }
  ]
}
```
---
### Input

```json
{
  "original": {}
}
```
### Expected output

```json
{
  "valid": true,
  "messages": [],
  "output": {
    "example1": "inserted",
    "example2": {
      "obj": {
        "value": "inserted"
      }
    }
  }
}
```
---

## Arrays in `__target`

Arrays in `__target` can be accessed as regular items in arrays with `[x]`, where `x` is index of the item that will be accessed. However, in arrays inside `__target` last item of the array can be accessed with `[_]` and new item can be inserted into array with `[]`.

Actions are the only concept of validator templates in which ordering matters. Actions are performed sequentially from top to bottom, this means action at the very top of the template will be performed before all actions underneath. This is important to keep in mind when working with arrays. At first an item should be inserted into an array with `[]`, after that the item can be filled with desired data by accessing the last item with `[_]`.

### Template

```json
{
  "__objectItem": {
    "__objectItem": {
      "location": {},
      "__actions": [
        {
          "__copy": {
            "__target": "[ 'vehicles[]' ]"
          }
        },
        {
          "__insert": {
            "__target": "[ 'vehicles[_]' ]",
            "__value": {
              "type": "{{0}}",
              "name": "{{1}}"
            }
          }
        }
      ]
    }
  }
}
```
---
### Input

```json
{
  "bus": {
    "small_bus": {
      "location": "Portugal"
    },
    "long_bus": {
      "location": "Slovenia"
    }
  },
  "plane": {
    "jet": {
      "location": "Turkey"
    }
  }
}
```
### Expected output

```json
{
  "valid": true,
  "messages": [],
  "output": {
    "vehicles": [
      {
        "location": "Portugal",
        "type": "bus",
        "name": "small_bus"
      },
      {
        "location": "Slovenia",
        "type": "bus",
        "name": "long_bus"
      },
      {
        "location": "Turkey",
        "type": "plane",
        "name": "jet"
      }
    ]
  }
}
```
---

## All

Action can be also performed on every parameter somewhere in the parameter path, this is achieved by using `__all`.

### Template

```json
{
  "__actions": [
    {
      "__copy": {
        "__target": "[]"
      }
    },
    {
      "__insert": {
        "__target": "[ 'allArray', '__all', 'inserted' ]",
        "__value": "inserted"
      }
    },
    {
      "__insert": {
        "__target": "[ 'allObject', '__all', 'inserted' ]",
        "__value": "inserted"
      }
    }
  ],
  "allArray": {
    "__arrayItem": {
      "name": {}
    }
  },
  "allObject": {
    "__objectItem": {}
  }
}
```
---
### Input

```json
{
  "allArray": [
    {
      "name": "item1"
    },
    {
      "name": "item2"
    }
  ],
  "allObject": {
    "item3": {},
    "item4": {}
  }
}
```
### Expected output

```json
{
  "valid": true,
  "messages": [],
  "output": {
    "allArray": [
      {
        "name": "item1",
        "inserted": "inserted"
      },
      {
        "name": "item2",
        "inserted": "inserted"
      }
    ],
    "allObject": {
      "item3": {
        "inserted": "inserted"
      },
      "item4": {
        "inserted": "inserted"
      }
    }
  }
}
```
---