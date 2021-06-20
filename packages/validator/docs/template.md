# Nested templates

In case a template contains another template, the nested template doesn't have to be copied, relative path to the template can be provided in `__template` and parameter will be evaluated using provided template.

## `docs/template.json`
```json
{
  "path": {
    "__regexp": "^docs\\/template\\.json$",
    "__catch": {
      "__level": "error",
      "__message": "Error in root template"
    }
  },
  "nested": {
    "__template": "nested/template.json"
  }
}
```
## `docs/nested/template.json`
```json
{
  "path": {
    "__regexp": "^docs\\/nested\\/template\\.json$",
    "__catch": {
      "__level": "error",
      "__message": "Error in template nested in __prefix"
    }
  }
}
```
---
### Valid specification

```json
{
  "path": "docs/template.json",
  "nested": {
    "path": "docs/nested/template.json"
  }
}
```
---
### Invalid specification

```json
{
  "path": "docs/nested/template.json",
  "nested": {
    "path": "docs/template.json"
  }
}
```
### Expected output
```json
{
  "valid": false,
  "messages": [
    { "level": "warning", "message": "Error in root template" },
    { "level": "warning", "message": "Error in template nested in nested" }
  ]
}
```
---