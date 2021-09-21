# Dynamic keys and values

The validator can access both keys from the parameter path and values from the specification. These dynamic parameters consist of placeholders that are on evaluation replaced with strings contained in other parts of the specification.

## Retrieving key from parameter path

Any key or value can contain a number surrounded by {{}}, that is: `{{x}}` where `x` is an integer. This indicates that `{{x}}` will be replaced by the key located on the `x`-th index in the parameter path. For example `{{0}}` located in value with parameter path `outer.arr[2].inner` will be replaced with `outer`, similarly `{{1}}` will be replaced with `arr[2]` and so on.

### Template

```json
{
  "__objectItem": {
    "__keyRegexp": "^{{0}}[0-9]+$",
    "__objectItem": {
      "name": {
        "__regexp": "^{{1}}$"
      }
    }
  }
}
```

---
### Valid specification

```json
{
  "bus": {
    "bus1": {
      "name": "bus1"
    },
    "bus2": {
      "name": "bus2"
    }
  },
  "plane": {
    "plane1": {
      "name": "plane1"
    }
  }
}
```

---
### Invalid specification

```json
{
  "bus": {
    "plane1": {
      "name": "plane1"
    },
    "bus2": {
      "name": "bus1"
    }
  },
  "plane": {
    "plane1": {
      "name": "bus1"
    }
  }
}
```

### Expected output

```json
{
  "valid": false,
  "messages": [
    { "level": "error", "message": "Key plane1 in bus.plane1 is formatted incorrectly" },
    { "level": "warning", "message": "bus.bus2.name is not formatted correctly" },
    { "level": "warning", "message": "plane.plane1.name is not formatted correctly" }
  ]
}
```

---

## Retrieving value of any parameter in specification

Value of any parameter in the specification can be accessed by providing relative or absolute path to the parameter. Value of parameter is read by providing parameter path as a standard typescript array, in which each item is a key of parameter path. This array is then surrounded with `[]`. Parameter path will be evaluated relative to current position in the specification, however parameter path can be evaluated from the root of current template (absolute evaluation), by inserting `/` as the very first item of the array. Also if value is being retrieved inside a condition, relative path will be in the same position as condition and will not change even in nested parameters inside `__then`/`__rootThen` objects.

### Template

```json
{
  "bus": {
    "__arrayItem": {
      "details": {
        "doors": {
          "__regexp": "[0-9]+"
        },
        "wheels": {
          "__regexp": "[0-9]+"
        }
      },
      "owner": {
        "__regexp": "^[[ '/', 'company', 'name' ]]$"
      },
      "name": {},
      "__conditions": [
        {
          "__if": {
            "name": ".*"
          },
          "__then": {
            "name": {
              "__regexp": "[[ 'details', 'wheels' ]]",
              "__catch": {
                "__level": "error"
              }
            }
          }
        }
      ]
    }
  },
  "company": {
    "name": {}
  }
}
```

---
### Valid specification

```json
{
  "bus": [
    {
      "details": {
        "doors": "3",
        "wheels": "6"
      },
      "name": "6-wheeler",
      "owner": "anon"
    },
    {
      "details": {
        "doors": "4",
        "wheels": "8"
      },
      "name": "8-wheeler",
      "owner": "anon"
    }
  ],
  "company": {
    "name": "anon"
  }
}
```

---
### Invalid specification

```json
{
  "bus": [
    {
      "details": {
        "doors": "3",
        "wheels": "6"
      },
      "name": "8-wheeler",
      "owner": "anon"
    },
    {
      "details": {
        "doors": "4",
        "wheels": "8"
      },
      "name": "8-wheeler",
      "owner": "anonymous"
    }
  ],
  "company": {
    "name": "anon"
  }
}
```

### Expected output

```json
{
  "valid": false,
  "messages": [
    { "level": "error", "message": "Condition in bus.[0].name is not met with name" },
    { "level": "warning", "message": "bus.[1].owner is not formatted correctly" }
  ]
}
```

---
