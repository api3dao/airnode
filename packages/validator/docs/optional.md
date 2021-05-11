
## Optional and level

Sometimes a warning, should be considered an error and vice versa, the level of the message can be adjusted with `__level` for a specific parameter. Also some parameters don't have to be in the specification, but if they are it's still fully valid specification without any errors or warnings, for this parameter `__optional` is used.

#### Template
```json
{
  "levelExample": {
    "__regexp": "^true$",
    "__level": "error"
  },
  "__optional": {
    "optionalExample": {}
  }
}
```
---
#### Valid specification

```json
{
  "levelExample": "true"
}
```
---
#### Invalid specification

```json
{
  "levelExample": "false",
  "optionalExample": {}
}
```
#### Expected output
```json
{
  "valid": false,
  "messages": [
    { "level": "error", "message": "levelExample is not formatted correctly" }
  ]
}
```
---

In invalid specification the level of formatting message is error, which results in the whole specification to be not valid, normally the formatting message is only a warning. Also in valid specification there is no message about missing parameter `optionalExample` and in invalid specification there is no `extra parameter` message, which means validator doesn't care if `optionalExample` is or is not in the specification.

## Ignore

If keyword `__ignore` is present, parameters that are not specified in the template on the same level will be ignored, no error or warning messages will be printed.

#### Template
```json
{
  "ignoreExample": {
    "param": {},
    "__ignore": {}
  }
}
```
---
#### Valid specification
```json
{
  "ignoreExample": {
    "param": "This is in template",
    "other": "This is not in template"
  }
}
```
---
#### Invalid specification
```json
{
  "ignoreExample": {
    "param": "This is in template",
    "other": "This is not in template"
  },
  "notIgnored": "This is not in template"
}
```
#### Expected output
```json
{
  "valid": true,
  "messages": [
    { "level": "warning", "message": "Extra field: notIgnored" }
  ]
}
```
---
