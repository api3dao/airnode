# `@airnode/validator`

Package for JSON specifications validation. Validation process can be configured with validator templates.

## Usage

The validator can be run as a yarn script, by providing template of specification, and the path to the JSON file of
specification that will be validated:

```sh
yarn run validate --template="[template]" --specs="[specsFile]"
```

Templates are case-insensitive, valid templates are: `config`, `OIS`, `apiSpecifications`/`apiSpecs` and `endpoints`:

```sh
yarn run validate --template="config" --specs="exampleSpecs/config.specs.json"
```

Validator will automatically validate the latest available version of provided template, in case a specific version
should be used in validation, it can be appended to template argument:

```sh
yarn run validate --template="config@1.0.0" --specs="exampleSpecs/config.specs.json"
```

Custom templates can be used, by providing path to the validator template file in place of `template`:

```sh
yarn run validate --template="templates/1.0.0/config.json" --specs="exampleSpecs/config.specs.json"
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

Validator behavior can be configured with validator templates, which are regular `json` files using special keywords for
specification validation. Usage of these keywords is described in the following chapters:

- [basics](docs/basics.md)
- [regular expressions](docs/regex.md)
- [type checking](docs/type.md)
- [catch](docs/catch.md)
- [conditions](docs/conditions.md)
- [any](docs/any.md)
- [dynamic keys and values](docs/dynamic_params.md)
- [optional parameters](docs/optional.md)
- [nested templates](docs/template.md)

# `@airnode/convertor`

Built-in validator extension capable of conversions between various specifications, conversions are configured using
validator templates with conversion actions.

## Usage

Convertor works the same way as validator and can be invoked with the `convert` command, for example:

```sh
yarn run convert --template="conversions/oas@3.0.0------ois@1.0.0.json" --specs="exampleSpecs/OAS.specs.json"
```

Conversions can be invoked without providing any template, specifying which format provided specification is in and to
which format it should be converted into, is enough:

```sh
yarn run convert --from="OAS" --to="OIS" --specs="exampleSpecs/OAS.specs.json"
```

Specification formats are case-insensitive, currently available conversions are from `OAS` to `OIS` or from `OIS` to
`config`. Version of the format can be provided as in `validate` command:

```sh
yarn run convert --from="OIS@pre-alpha" --to="config@pre-alpha" --specs="exampleSpecs/ois.specs.json"
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

Alternatively command can be ran with argument `--specs-only`, which will return only the converted specification.

## Templates

Convertor uses the same templates as validator. The resulting specification can be written into `output` object with
[actions](docs/actions.md).

# Documentation

Source documentation markdown files are located in `docs/src/` directory. All template related examples are located in
`test/fixtures/` and injected into markdown using
[markdown-snippet-injector](https://github.com/NativeScript/markdown-snippet-injector) by running `yarn run docs`.
Generated markdown files can be found in `docs/`, test files using the same examples can be found in `test/` directory.
