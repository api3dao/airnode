# Any

Specification might have a requirement on certain parameters, which at least one of these parameters might fulfill, to ensure this requirement is met, `__any` can be used.

### Template

```json
{
  "vehicles": {
    "__arrayItem": {
      "name": {},
      "location": {}
    },
    "__any": {
      "name": {
        "__regexp": "plane"
      }
    }
  },
  "buildings": {
    "__objectItem": {
      "name": {},
      "location": {}
    },
    "__any": {
      "location": {
        "__regexp": "Malta"
      }
    }
  }
}
```
---
### Valid specification

```json
{
  "vehicles": [
    {
      "name": "bus",
      "location": "Albania"
    },
    {
      "name": "plane",
      "location": "Liechtenstein"
    },
    {
      "name": "plane",
      "location": "Estonia"
    }
  ],
  "buildings": {
    "cabin": {
      "name": "woodland",
      "location": "woods"
    },
    "hotel": {
      "name": "five star",
      "location": "Malta"
    }
  }
}
```
---
### Invalid specification
```json
{
  "vehicles": [
    {
      "name": "bus",
      "location": "Albania"
    },
    {
      "name": "boat",
      "location": "Liechtenstein"
    },
    {
      "name": "plane",
      "location": "Liechtenstein"
    }
  ],
  "buildings": {
    "cabin": {
      "name": "woodland",
      "location": "woods"
    },
    "hotel": {
      "name": "five star",
      "location": "Cyprus"
    }
  }
}
```
### Expected output
```json
{
  "valid": false,
  "messages": [
    { "level": "error", "message": "Required conditions not met in vehicles" },
    { "level": "error", "message": "Required conditions not met in buildings" }
  ]
}
```
---

## Any in condition

`__any` brings many advantages when used in conditions.

### Template

```json
{
  "vehicles": {
    "__arrayItem": {
      "name": {},
      "location": {},
      "__conditions": [
        {
          "__if": {
            "location": ".*"
          },
          "__rootThen": {
            "buildings": {
              "__any": {
                "name": {
                  "__regexp": "^__match$"
                }
              }
            }
          }
        }
      ]
    }
  },
  "buildings": {
    "__objectItem": {
      "name": {},
      "location": {}
    }
  }
}
```
---
### Valid specification

```json
{
  "vehicles": [
    {
      "name": "bus",
      "location": "woodland"
    },
    {
      "name": "plane",
      "location": "five star"
    }
  ],
  "buildings": {
    "cabin": {
      "name": "woodland",
      "location": "woods"
    },
    "hotel": {
      "name": "five star",
      "location": "Malta"
    }
  }
}
```
---
### Invalid specification
```json
{
  "vehicles": [
    {
      "name": "bus",
      "location": "woodland"
    },
    {
      "name": "plane",
      "location": "Malta"
    }
  ],
  "buildings": {
    "cabin": {
      "name": "woodland",
      "location": "woods"
    },
    "hotel": {
      "name": "five star",
      "location": "Malta"
    }
  }
}
```
### Expected output
```json
{
  "valid": false,
  "messages": [
    { "level": "error", "message": "Condition in vehicles[1].location is not met with location" }
  ]
}
```
---
