import { ZodError } from 'zod';
import { postProcessApiSpecifications, preProcessApiSpecifications } from './processing';
import * as fixtures from '../../test/fixtures';

describe('processing', () => {
  describe('pre-processing', () => {
    it('valid processing code', async () => {
      const config = fixtures.buildConfig();
      const preProcessingSpecifications = [
        {
          environment: 'Node 14' as const,
          value: 'const output = {...input, from: `garbage-${input.from}`};',
        },
        {
          environment: 'Node 14' as const,
          value: 'const output = {...input, from: input.from.substring(9)};',
        },
      ];
      config.ois[0].endpoints[0] = { ...config.ois[0].endpoints[0], preProcessingSpecifications };

      const parameters = { _type: 'int256', _path: 'price', from: '*ETH' };
      const aggregatedApiCall = fixtures.buildAggregatedRegularApiCall({ parameters });

      const result = await preProcessApiSpecifications({ config, aggregatedApiCall });

      expect(result.aggregatedApiCall.parameters).toEqual({
        _path: 'price',
        _type: 'int256',
        from: 'ETH',
      });
    });

    it('invalid processing code', async () => {
      const config = fixtures.buildConfig();
      const preProcessingSpecifications = [
        {
          environment: 'Node 14' as const,
          value: 'something invalid; const output = {...input, from: `garbage-${input.from}`};',
        },
        {
          environment: 'Node 14' as const,
          value: 'const output = {...input, from: input.from.substring(8)};',
        },
      ];
      config.ois[0].endpoints[0] = { ...config.ois[0].endpoints[0], preProcessingSpecifications };

      const parameters = { _type: 'int256', _path: 'price', from: 'ETH' };
      const aggregatedApiCall = fixtures.buildAggregatedRegularApiCall({ parameters });

      const throwingFunc = async () => preProcessApiSpecifications({ config, aggregatedApiCall });

      await expect(throwingFunc).rejects.toEqual(new Error('Unexpected identifier'));
    });

    it('throws validation error if result does not have parameters shape', async () => {
      const config = fixtures.buildConfig();
      const preProcessingSpecifications = [
        {
          environment: 'Node 14' as const,
          value: 'const output = {...input, object: {a: 123, b: false}};',
        },
      ];
      config.ois[0].endpoints[0] = { ...config.ois[0].endpoints[0], preProcessingSpecifications };

      const parameters = { _type: 'int256', _path: 'price', from: '*ETH' };
      const aggregatedApiCall = fixtures.buildAggregatedRegularApiCall({ parameters });

      const throwingFunc = async () => preProcessApiSpecifications({ config, aggregatedApiCall });

      await expect(throwingFunc).rejects.toEqual(
        new ZodError([
          {
            code: 'invalid_type',
            expected: 'string',
            received: 'object',
            path: ['object'],
            message: 'Expected string, received object',
          },
        ])
      );
    });
  });
});

describe('post-processing', () => {
  it('parameters - valid processing code', async () => {
    const config = fixtures.buildConfig();
    const postProcessingSpecifications = [
      {
        environment: 'Node 14' as const,
        value: 'const output = parseInt(input.price)*2;',
      },
      {
        environment: 'Node 14' as const,
        value: 'const output = parseInt(input)*2;',
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
        environment: 'Node 14' as const,
        value: 'const output = parseInt(input.price)*1000;',
      },
      {
        environment: 'Node 14' as const,
        value: 'Something Unexpected; const output = parseInt(input)*2;',
      },
    ];
    const endpoint = { ...config.ois[0].endpoints[0], postProcessingSpecifications };

    const throwingFunc = async () => postProcessApiSpecifications({ price: 1000 }, endpoint);

    await expect(throwingFunc).rejects.toEqual(new Error('Unexpected identifier'));
  });
});
