# Conditions

### Basics

Conditions are objects containing `__if` and `__then` objects, these objects are placed into array `__conditions`, which can contain any amount of condition objects. Object `__if` contains parameter name with regular expression, if the regular expression is matched in provided specification, validator will validate everything that's in the `__then` object. Here is an example of a very basic condition:

#### Template

```json
{
	"conditionsExample": {
		"value": {},
		"__conditions": [
			{
				"__if": {
					"value": "^one$"
				},
				"__then": {
					"one": {
						"__regexp": "^This is required by one$"
					}
				}
			},
			{
				"__if": {
					"value": "^two$"
				},
				"__then": {
					"two": {
						"__regexp": "^This is required by two$"
					}
				}
			}
		]
	}
}
```
---
#### Valid specification
```json
{
  "conditionsExample": {
    "value": "one",
    "one": "This is required by one"
  }
}
```
---
#### Invalid specification
```json
{
  "conditionsExample": {
    "value": "two",
    "one": "This is required by two"
  }
}
```
#### Expected output

```json
{
  "valid": false,
  "messages": [
    { "level": "error", "message": "Missing parameter conditionsExample.two" },
    { "level": "warning", "message": "Extra field: conditionsExample.one" }
  ]
}
```
---

In this example parameter `conditionsExample.value` is required, if it's value is `one`, first condition will be checked and specification must contain parameter `conditionsExample.one` with value `This is required by one`. If `conditionsExample.one` isn't in the specification, or it's value is not `This is required by one`, validation will return an error. In the valid specification example the second condition is not checked at all because value of `conditionsExample.value` is not `two`. In the invalid specification example the second condition is applied, but parameter `conditionsExample.two` is missing from specification and since first condition is ignored (`conditionsExample.value` is not `one`) and parameter `conditionsExample.one` is not required it is labeled as extra parameter.

### Require

`__require` consists of a parameter path that validator will check and throw error if it doesn't exist. The path is relative to the location of the parameter, unless it starts with `/`, in that case it is an absolute path starting in the root of the specification. So far the `__require` functionality can be achieved by simply including the parameter in the template, the strength of `__require` becomes apparent when combined with `__this_name` keyword. `__this_name` instances in the required parameter path will be replaced with name of the parameter the condition is nested in.

#### Template
```json
{
  "items": {
		"__objectItem": {
			"__keyRegexp": "^require[0-9]$",
			"__conditions": [
				{
					"__require": {
						"/outer.__this_name.inner": {}
					}
				}
			]
		}
	}
}
```
---
#### Valid specification
```json
{
  "items": {
		"require0": {},
		"require5": {}
	},
	"outer": {
		"require0": {
			"inner": {}
		},
		"require5": {
			"inner": {}
		}
	}
}
```
---
#### Invalid specification
```json
{
	"items": {
		"require0": {},
		"require5": {}
	},
	"outer": {
		"require0": {},
		"require1": {
			"inner": {}
		}
	}
}
```
#### Expected output
```json
{
	"valid": false,
	"messages": [
		{ "level": "error", "message": "Missing parameter outer.require0.inner" },
		{ "level": "error", "message": "Missing parameter outer.require5.inner" },
		{ "level": "warning", "message": "Extra field: outer.require1" }
	]
}
```
---

In this example parameters inside `items` must be named `require` followed by number from 0 to 9 (determined by `__keyRegexp` parameter), `__require` condition's parameter starts with `/`, this means required parameter will be evaluated from root of the specification not from object `items`, where the condition is nested in. In both specification examples are 2 items (`require0` and `require5`), this means `__this_name` in the require parameter path will be replaced with respective parameters, which results in 2 required parameters (`outer.require0.inner` and `outer.require5.inner`).

### Root then

`__require` conditions can be evaluated from root of the specification if required parameter name starts with `/` this behaviour can be achieved in if/then conditions as well, by replacing parameter `__then` with `__rootThen`

### Regular expression matches in if/then conditions

Regular expressions are often used in `__if` parameter of condition, matched string from the regular expression can be access in `__then` object with keyword `__match`, in this case `__if` object must specify if it's matching key of parameter (`__this_name`), or it's value (`__this`).

#### Template
```json
{
	"items": {
		"__objectItem": {
			"__conditions": [
				{
					"__if": {
						"__this": "^matchedValue$"
					},
					"__rootThen": {
						"thenItems": {
							"byValue": {
								"__regexp": "^__match$"
							}
						}
					}
				}
			]
		},
		"__conditions": [
			{
				"__if": {
					"__this_name": "^matchedKey$"
				},
				"__rootThen": {
					"thenItems": {
						"byKey": {
							"__regexp": "^__match$"
						}
					}
				}
			}
		]
	},
	"thenItems": {}
}
```
---
#### Valid specification

```json
{
	"items": {
		"item1": "matchedValue",
		"matchedKey": "item2"
	},
	"thenItems": {
		"byValue": "matchedValue",
		"byKey": "matchedKey"
	}
}
```
---
#### Invalid specification

```json
{
	"items": {
		"item1": "matchedValue",
		"matchedKey": "item2"
	},
	"thenItems": {}
}
```

#### Expected output
```json
{
	"valid": false,
	"messages": [
		{ "level": "error", "message": "Missing parameter thenItems.byValue" },
		{ "level": "error", "message": "Missing parameter items.matchedKey" }
	]
}
```
---

This example highlights differences between `__this` and `__this_name` in if/then conditions. First condition matches the value of parameter, if the value is `matchedValue`, parameter `thenItems.byValue` becomes required, since `__match` keyword was replaced with `matchedValue` in the then section. `__this_name` will match `matchedKey` and require `thenItems.byKey` parameter. Notice the different positions of both conditions, `__this` is evaluated for the object the condition is nested in, whereas `__this_name` is evaluated from object the parameter, which key will be evaluated is nested in.

### Parameter values in then condition

Value of any parameter in the specification can accessed by providing relative or absolute path to the parameter. Path can be provided anywhere in format `[[path]]`, in case of absolute path (evaluated from specifiaction root) it is `[[/path]]`.

#### Template

```json
{
	"container": {
		"__conditions": [
			{
				"__if": {
					"param": ".*"
				},
				"__rootThen": {
					"[[/used.name]]": {
						"__regexp": "^[[param]]$",
						"__level": "error"
					}
				}
			}
		]
	},
	"used": {
		"name": {}
	}
}
```
---
#### Valid specification

```json
{
	"container": {
		"param": "value"
	},
	"used": {
		"name": "thenParam"
	},
	"thenParam": "value"
}
```
---
#### Invalid specification
```json
{
	"container": {
		"param": "value"
	},
	"used": {
		"name": "thenParam"
	},
	"thenParam": "notValue"
}
```
#### Expected output
```json
{
	"valid": false,
	"messages": [
		{ "level": "error", "message": "thenParam is not formatted correctly" }
	]
}
```
---

### Any

Section `__then` can contain keyword `__any`, on level where array or object is expected. Validator will check every nested item/object, if none of them satisfies the `__then` section of condition, the specs will be invalid.

#### Template

```json
{
	"items": {
		"__objectItem": {
			"__keyRegexp": ".*"
		},
		"__conditions": [
			{
				"__if": {
					"__this_name": "^anyExample$"
				},
				"__rootThen": {
					"thenItems": {
						"__any": {
							"valid": {}
						}
					}
				}
			}
		]
	},
	"thenItems": {
		"item1": {},
		"item2": {},
		"item3": {}
	}
}
```
---
#### Valid specification

```json
{
	"items": {
		"anyExample": {}
	},
	"thenItems": {
		"item1": {},
		"item2": {
			"valid": "true"
		},
		"item3": {}
	}
}
```
---
#### Invalid specification
```json
{
	"items": {
		"anyExample": {}
	},
	"thenItems": {
		"item1": {},
		"item2": {},
		"item3": {}
	}
}
```
#### Expected output
```json
{
	"valid": false,
	"messages": [
		{ "level": "error", "message": "Condition in items.anyExample is not met with anyExample" }
	]
}
```
---

This example template, will evaluate all nested objects in `thenItems`, if any of those objects is matching `__then` section of condition, the specification is valid, otherwise it will return condition not met error.
