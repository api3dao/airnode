
# Optional and level

Some parameters in specification can be present but in case they are not there, it shouldn't be an issue as well. For this `__optional` is used, parameters inside it will not cause any extra parameter messages or missing parameter messages to show.

### Template

```json
{
  "__optional": {
    "optionalExample": {
      "__regexp": "optional"
    },
    "outer": {
      "inner": {}
    }
  }
}
```
---
### Valid specification

```json
{
  "optionalExample": "This is optional"
}
```
---
### Invalid specification

```json
{
  "optionalExample": "test",
  "outer": {}
}
```
### Expected output
```json
{
  "valid": false,
  "messages": [
    { "level": "warning", "message": "optionalExample is not formatted correctly" },
    { "level": "error", "message": "Missing parameter outer.inner" }
  ]
}
```
---
