# Nested templates

Templates can be recursive. That is, a template can contain a pointer to another template in the form of a relative path provided in `__template`.

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
    { "level": "error", "message": "Error in root template" },
    { "level": "error", "message": "Error in template nested in nested" }
  ]
}
```

---