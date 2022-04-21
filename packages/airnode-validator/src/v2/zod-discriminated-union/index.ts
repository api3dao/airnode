// Copied from: https://github.com/colinhacks/zod/issues/792#issuecomment-1023251415
// TODO: Remove once https://github.com/colinhacks/zod/pull/899 is released
import { z } from 'zod';

const getDiscriminatorValue = (type: z.ZodObject<any, any, any>, discriminator: string) => {
  const shape = type._def.shape();
  return shape[discriminator].value;
};

/**
 * A constructor of a discriminated union schema. Its behaviour is very similar to that of the z.union() function.
 * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
 * have a different value for each object in the union.
 * @param discriminator the name of the discriminator property
 * @param types an array of object schemas
 */
export const zodDiscriminatedUnion = <
  Discriminator extends string,
  TShape extends { [key in Discriminator]: z.ZodLiteral<any> } & z.ZodRawShape,
  T extends [z.ZodObject<TShape, any, any>, z.ZodObject<TShape, any, any>, ...z.ZodObject<TShape, any, any>[]]
>(
  discriminator: Discriminator,
  types: T
): z.ZodUnion<T> => {
  // Get all the valid discriminator values
  let validDiscriminatorValues: string[];
  try {
    validDiscriminatorValues = types.map((type) => getDiscriminatorValue(type, discriminator));
  } catch (e) {
    throw new Error(
      'zodDiscriminatedUnion: Cannot read the discriminator value from one of the provided object schemas'
    );
  }

  // Assert that all the discriminator values are unique
  if (new Set(validDiscriminatorValues).size !== validDiscriminatorValues.length) {
    throw new Error('zodDiscriminatedUnion: Some of the discriminator values are not unique');
  }

  return z.record(z.unknown()).superRefine((val: any, ctx) => {
    // Find the schema for the provided discriminator value
    const schema = types.find((type) => getDiscriminatorValue(type, discriminator) === val[discriminator]);

    if (schema) {
      try {
        schema.parse(val);
      } catch (e) {
        if (!(e instanceof z.ZodError)) {
          throw e;
        }
        for (const issue of e.issues) {
          ctx.addIssue(issue);
        }
      }
    } else {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid discriminator value. Expected one of: ${validDiscriminatorValues.join(', ')}. Received ${
          val[discriminator]
        }.`,
        path: [discriminator],
      });
    }
  }) as any;
};
