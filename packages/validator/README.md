# `@airnode/validator`

Package for json specifications validation. Validation process can be configured with validator templates.

## Usage

The validator can be run as an npm script, by providing template of specification, and the path to the JSON file of specification that will be validated:
```sh
npm run validate --template="[template]" --specs="[specsFile]"
```

Templates are case-insensitive, valid templates are: `config`, `OIS`, `apiSpecifications`/`apiSpecs` and `endpoints`. If arguments are in order `template`, `specs` command can be simplified: `npm run validate [template] [specsFile]`:
```sh
npm run validate config exampleSpecs/config.specs.json
```

Validator will automatically validate the latest available version of provided template, in case specific version should be used in validation, it can be passed as `--templateVersion` argument or as the last argument if they are ordered:
```sh
npm run validate config exampleSpecs/config.specs.json 0.1.0
```

Custom templates can be used, by providing path to the validator template file in place of `template`:
```sh
npm run validate templates/1.0.0/config.json exampleSpecs/config.specs.json
```

## Output

Above mentioned commands will return json in following format:

```
{
  valid: boolean,
  messages: { level: "error" | "warning", message: string }[]
}
```

`valid` is set to `true` in case there are no errors, however there can be still warnings in the `messages`.

## Templates

Validator behavior can be configured with validator templates, which are regular `json` files using special keywords for specification validation. Usage of these keywords is described in the following chapters:

- [basics](docs/basics.md)
- [regular expressions](docs/regex.md)
- [catch](docs/catch.md)
- [conditions](docs/conditions.md)
- [any](docs/any.md)
- [dynamic keys and values](docs/dynamic_params.md)
- [optional parameters](docs/optional.md)
- [nested templates](docs/template.md)

# `@airnode/convertor`

Built-in validator extension capable of conversions between various specifications, conversions are configured using validator templates with conversion actions.

## Usage

Convertor works the same way as validator and can be invoked with the `convert` command, for example:
```sh
npm run convert --template="templates/3.0.0/OAS2OIS.json" --specs="exampleSpecs/OAS.specs.json"
```

Conversions can be invoked without providing any template, specifying which format provided specification is in and to which format it should be converted into, is enough:
```sh
npm run convert --from="OAS" --to="Config" --specs="exampleSpecs/OAS.specs.json"
```

From/to formats are case-insensitive, these are valid conversions:

| From | To |
| ----- | -----|
| oas | ois |
| oas | config |
| ois | config |

Another example of `convert` command:
```sh
npm run convert oas config "exampleSpecs/OAS.specs.json"
```

## Output

On top of validator output, convertor provides an `output` object, which contains the converted specification:

```
{
  valid: boolean,
  messages: { level: "error" | "warning", message: string }[],
  output: object
}
```

Alternatively command can be ran with argument `--specs_only` or just `--so`, which will return only the converted specification.

## Templates

Convertor uses same templates as validator, resulting specification can be written into `output` object with [actions](docs/actions.md).
