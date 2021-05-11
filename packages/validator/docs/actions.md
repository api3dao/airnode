# Actions

If any action is specified in template, object `output` will be returned when processing a specification. This object is at first empty, by inserting or copying parameters from specification it can construct desired specification.

### Copy action

`__copy` object located inside `__actions` array of some parameter will copy the value of parameter it is nested in into provided `__target`, which is evaluated as an absolute path.

#### Template
```json
{
  "outerParameter": {
    "innerParameter": {
      "__actions": [
        {
          "__copy": {
            "__target": "outerParameter.innerParameter"
          }
        },
        {
          "__copy": {
            "__target": "backup"
          }
        }
      ]
    }
  }
}
```
---
#### Input

```json
{
  "outerParameter": {
    "innerParameter": "valueToCopy"
  }
}
```
#### Expected output
```json
{
  "outerParameter": {
    "innerParameter": "valueToCopy"
  },
  "backup": "valueToCopy"
}
```
---

### Insert action

Keyword `__insert` works similarly to `__copy`, except it doesn't copy a value of parameter, but inserts value provided in `__target`

#### Template

```json
{
  "outerParameter": {
    "innerParameter": {
      "__actions": [
        {
          "__insert": {
            "__target": "outerParameter.innerParameter",
            "__value": "inserted"
          }
        },
        {
          "__insert": {
            "__target": "parameter",
            "__value": "inserted"
          }
        }
      ]
    }
  }
}
```
---
#### Input

```json
{
  "outerParameter": {
    "innerParameter": {}
  }
}
```
#### Expected output

```json
{
  "outerParameter": {
    "innerParameter": "inserted"
  },
  "parameter": "inserted"
}
```
---

### Target path

`__target` in actions specifies path to parameter that will be modified, there can be an array in this path, to deal with this path can contain `[]` which will push back new item into the array and use it in the target, or path can use `[_]` which points to last item in the array. Parameter from path where the action is located can be accessed via `{{X}}`, where X is position of the parameter in the path numbered from 0. Target path can also include keyword `__all`, in which the action will be performed on every child of previous element.

Accessing parameter on index `X` (`{{X}}`) can be used in conditions the same way as in actions.

#### Template

```json
{
  "array": {
    "__arrayItem": {
      "__objectItem": {
        "__actions": [
          {
            "__copy": {
              "__target": "array[].{{1}}"
            }
          },
          {
            "__insert": {
              "__target": "array[_].parameter",
              "__value": {}
            }
          },
          {
            "__insert": {
              "__target": "array.__all.inserted",
              "__value": {}
            }
          }
        ]
      }
    }
  },
  "all": {
    "__actions": [
      {
        "__copy": {
          "__target": "all"
        }
      }
    ],
    "__ignore": {}
  },
  "__actions": [
    {
      "__insert": {
        "__target": "all.__all.inserted",
        "__value": {}
      }
    }
  ]
}
```
---
##### Input

```json
{
  "array": [
    {
      "param0": "0"
    },
    {
      "param1": "1"
    },
    {
      "param2": "2"
    }
  ],
  "all": {
    "item1": {},
    "item2": {},
    "item3": {}
  }
}
```
#### Expected output

```json
{
  "array": [
    {
      "param0": "0",
      "parameter": {},
      "inserted": {}
    },
    {
      "param1": "1",
      "parameter": {},
      "inserted": {}
    },
    {
      "param2": "2",
      "parameter": {},
      "inserted": {}
    }
  ],
  "all": {
    "item1": {
      "inserted": {}
    },
    "item2": {
      "inserted": {}
    },
    "item3": {
      "inserted": {}
    }
  }
}
```
---
`__actions` are performed sequentially, per array element, so first the path `array[].{{1}}` is expanded to: `array[].param0`, `array[].param1`, and `array[].param2`, respectively, so their values get "copied" back to their original positions. For a given `array` object, `array[_]` points to its last element; in our example: `array[].param0`, `array[].param1`, and `array[].param2`, respectively. So `parameter` gets inserted after each of these elements. Finally, the insert target `array.__all.inserted` inserts an `inserted` element at the end of each `array` object.

Similarily, in the `all` array, the elements are copied into their original positions via `"__target": "all"`, and an element `inserted` is inserted into each of these elements via `"__target": "all.__all.inserted"`.
