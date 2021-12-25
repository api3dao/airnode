# `@api3/airnode-validator`

The validator is used by the Docker Images to validate the configuration files you provide when deploying an Airnode.
You can also use the validator to check the configuration files for correct formatting and other issues while creating
them.

## Usage

General usage of validator and convertor is described in the
[API3 Documentation](https://docs.api3.org/airnode/latest/reference/packages/validator.html).

## Build Manually

You can clone and build the Airnode monorepo then run the validator as a yarn script from inside the
`packages/airnode-validator` directory.

```sh
# execute the validator
yarn run cli:validator --template="config" --specs="exampleSpecs/config.json"

# validator output
{
  "valid": true,
  "messages": []
}
```

For debugging purposes it might be useful to run the validator with path to template file instead of providing the
format name:

```sh
yarn run cli:validator --template="templates/0.2/config.json" --specs="myProject/config/config.json"
# OR
yarn run cli:convertor --template="conversions/oas@3.0------ois@1.0.json" --specs="myProject/config/oas.json"
```

## Templates

Validator behavior can be configured with validator templates, which are regular `json` files using special keywords for
specification conversion and validation. Usage of these keywords is described in the following chapters:

- [actions](docs/actions.md)
- [basics](docs/basics.md)
- [regular expressions](docs/regex.md)
- [type checking](docs/type.md)
- [catch](docs/catch.md)
- [conditions](docs/conditions.md)
- [any](docs/any.md)
- [dynamic keys and values](docs/dynamic_params.md)
- [optional parameters](docs/optional.md)
- [nested templates](docs/template.md)

## Other Documentation

Source documentation markdown files are located in `docs/src/` directory. All template related examples are located in
`test/fixtures/` and injected into markdown using
[markdown-snippet-injector](https://github.com/NativeScript/markdown-snippet-injector) by running `yarn run docs`.
Generated markdown files can be found in `docs/`, test files using the same examples can be found in `test/` directory.
