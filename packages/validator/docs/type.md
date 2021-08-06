# Type checking

If keyword `__regexp` is used in template, it is expected that type of the parameter in specification should be string, similarly in case of `__arrayItem` it should be an array. Other types can be specified by using keyword `__type` and providing a [typescript data type](https://www.typescriptlang.org/docs/handbook/basic-types.html).

### Template

```json
{
	"list": {
		"__arrayItem": {
			"item": {}
		}
	},
	"str": {
		"__type": "string"
	},
	"regex": {
		"__regexp": ".*"
	},
	"num": {
		"__type": "number"
	}
}
```
---
### Valid specification

```json
{
	"list": [
		{
			"item": "This is array"
		}
	],
	"str": "This is string",
	"regex": "Also a string",
	"num": 123
}
```
---
### Invalid specification

```json
{
	"list": {
		"item": "This is object"
	},
	"str": 123,
	"regex": {},
	"num": "123"
}
```
### Expected output
```json
{
  "valid": false,
  "messages": [
    { "level": "error", "message": "list: Expected array, got object" },
    { "level": "error", "message": "str: Expected string, got number" },
    { "level": "error", "message": "regex: Expected string, got object" },
    { "level": "error", "message": "num: Expected number, got string" },
    { "level": "warning", "message": "Extra field: list.item" }
  ]
}
```
---