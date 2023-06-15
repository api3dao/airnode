import { postProcessApiSpecifications, preProcessApiSpecifications } from './processing';
import * as fixtures from '../../test/fixtures';

describe('pre-processing', () => {
  it('valid processing code', async () => {
    const config = fixtures.buildConfig();
    const preProcessingSpecifications = [
      {
        environment: 'Node' as const,
        value: 'const output = {...input, from: "ETH"};',
        timeoutMs: 5_000,
      },
      {
        environment: 'Node' as const,
        value: 'const output = {...input, newProp: "airnode"};',
        timeoutMs: 5_000,
      },
    ];
    config.ois[0].endpoints[0] = { ...config.ois[0].endpoints[0], preProcessingSpecifications };

    const parameters = { _type: 'int256', _path: 'price' };
    const aggregatedApiCall = fixtures.buildAggregatedRegularApiCall({ parameters });

    const result = await preProcessApiSpecifications({ type: 'regular', config, aggregatedApiCall });

    expect(result.aggregatedApiCall.parameters).toEqual({
      _path: 'price',
      _type: 'int256',
      from: 'ETH',
      newProp: 'airnode',
    });
  });

  it('invalid processing code', async () => {
    const config = fixtures.buildConfig();
    const preProcessingSpecifications = [
      {
        environment: 'Node' as const,
        value: 'something invalid; const output = {...input, from: `ETH`};',
        timeoutMs: 5_000,
      },
      {
        environment: 'Node' as const,
        value: 'const output = {...input, newProp: "airnode"};',
        timeoutMs: 5_000,
      },
    ];
    config.ois[0].endpoints[0] = { ...config.ois[0].endpoints[0], preProcessingSpecifications };

    const parameters = { _type: 'int256', _path: 'price', from: 'TBD' };
    const aggregatedApiCall = fixtures.buildAggregatedRegularApiCall({ parameters });

    const throwingFunc = () => preProcessApiSpecifications({ type: 'regular', config, aggregatedApiCall });

    await expect(throwingFunc).rejects.toEqual(new Error('SyntaxError: Unexpected identifier'));
  });

  it('makes reserved parameters inaccessible for HTTP gateway requests', async () => {
    const config = fixtures.buildConfig();
    const preProcessingSpecifications = [
      {
        environment: 'Node' as const,
        // pretend the user is trying to 1) override _path and 2) set a new parameter based on
        // the presence of the reserved parameter _type (which is inaccessible)
        value: 'const output = {...input, from: "ETH", _path: "price.newpath", myVal: input._type ? "123" : "456" };',
        timeoutMs: 5_000,
      },
    ];
    config.ois[0].endpoints[0] = { ...config.ois[0].endpoints[0], preProcessingSpecifications };

    const parameters = { _type: 'int256', _path: 'price' };
    const aggregatedApiCall = fixtures.buildAggregatedRegularApiCall({ parameters });

    const result = await preProcessApiSpecifications({ type: 'http-gateway', config, aggregatedApiCall });

    expect(result.aggregatedApiCall.parameters).toEqual({
      _path: 'price', // _path is not overridden
      _type: 'int256',
      from: 'ETH',
      myVal: '456', // myVal is set to "456" because _type is not present in the environment
    });
  });
});

describe('post-processing', () => {
  it('parameters - valid processing code', async () => {
    const config = fixtures.buildConfig();
    const postProcessingSpecifications = [
      {
        environment: 'Node' as const,
        value: 'const output = parseInt(input.price)*2;',
        timeoutMs: 5_000,
      },
      {
        environment: 'Node' as const,
        value: 'const output = parseInt(input)*2;',
        timeoutMs: 5_000,
      },
    ];
    const endpoint = { ...config.ois[0].endpoints[0], postProcessingSpecifications };

    const result = await postProcessApiSpecifications({ price: 1000 }, endpoint);

    expect(result).toEqual(4000);
  });

  it('parameters - invalid processing code', async () => {
    const config = fixtures.buildConfig();
    const postProcessingSpecifications = [
      {
        environment: 'Node' as const,
        value: 'const output = parseInt(input.price)*1000;',
        timeoutMs: 5_000,
      },
      {
        environment: 'Node' as const,
        value: 'Something Unexpected; const output = parseInt(input)*2;',
        timeoutMs: 5_000,
      },
    ];
    const endpoint = { ...config.ois[0].endpoints[0], postProcessingSpecifications };

    const throwingFunc = () => postProcessApiSpecifications({ price: 1000 }, endpoint);

    await expect(throwingFunc).rejects.toEqual(new Error('SyntaxError: Unexpected identifier'));
  });
});
