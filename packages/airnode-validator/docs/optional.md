# Optional

By default, parameters in the specification are required. However, it is possible to create optional parameters, in case
certain parameters are present but not required. For this purpose, `__optional` is used.

If parameters are specified inside an `__optional` key in the template -- but are not present in the specification --
this will not cause any extra parameter messages or missing parameter messages to show.

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
