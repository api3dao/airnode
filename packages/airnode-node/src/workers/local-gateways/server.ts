import { logger } from '@api3/airnode-utilities';
import express, { Request, Response } from 'express';
import { z } from 'zod';
import bodyParser from 'body-parser';
import { verifyHttpRequest, verifyHttpSignedDataRequest, verifyRequestOrigin } from './validation';
import { Config, EnabledGateway, LocalProvider } from '../../config';
import { processHttpRequest, processHttpSignedDataRequest } from '../../handlers';

type GatewayName = 'httpGateway' | 'httpSignedDataGateway';

// We do not want to enable ".strict()" - we want to allow extra fields in the request body
const httpRequestBodySchema = z.object({
  parameters: z.any(), // Parameter validation is performed later
});
// We do not want to enable ".strict()" - we want to allow extra fields in the request body
const httpSignedDataBodySchema = z.object({
  encodedParameters: z.string(),
});
const DEFAULT_PORT = 3000;
const DEFAULT_PATH_KEY = '05701bc4-4eb4-4f60-b4eb-075c80ea98c6';

export function getGatewaysUrl(port: number = DEFAULT_PORT, path?: string) {
  const base = `http://localhost:${port || DEFAULT_PORT}`;
  if (!path) return base;
  return base + (path.startsWith('/') ? path : `/${path}`);
}

export const HTTP_SIGNED_DATA_BASE_PATH = '/http-signed-data';
export const HTTP_BASE_PATH = '/http-data';

export function startGatewayServer(config: Config, enabledGateways: GatewayName[]) {
  if (enabledGateways.length === 0) {
    logger.log('Not starting API gateway server because there is no gateway enabled.');
    return;
  }

  const app = express();
  app.use(bodyParser.json());
  const cloudProviderSettings = config.nodeSettings.cloudProvider as LocalProvider;
  const port = cloudProviderSettings.gatewayServerPort ?? DEFAULT_PORT;

  if (enabledGateways.includes('httpSignedDataGateway')) {
    const httpSignedDataGatewayPath = `${HTTP_SIGNED_DATA_BASE_PATH}/${DEFAULT_PATH_KEY}/:endpointId`;
    const httpSignedDataRequestHandler = async function (req: Request, res: Response) {
      logger.log(`Received request for http signed data`);

      const originVerification = verifyRequestOrigin(
        (config.nodeSettings.httpSignedDataGateway as EnabledGateway).corsOrigins,
        req.headers.origin
      );
      if (req.method === 'OPTIONS') {
        if (!originVerification.success) {
          res.status(400).send(originVerification.error);
          return;
        }

        // Set headers for the OPTIONS responses
        res.set(originVerification.headers).status(204).send('');
        return;
      }
      // The CORS origin header needs to be sent on the POST request (sent after OPTIONS). If the request is NOT pre
      // flighted, none of the origin headers are applied, but the request goes through. This ensures that non browser
      // requests work as expected.
      res.set(originVerification.headers);

      const parsedBody = httpSignedDataBodySchema.safeParse(req.body);
      if (!parsedBody.success) {
        // This error and status code is returned by AWS gateway when the request does not match the openAPI
        // specification.
        res.status(400).send({ message: 'Invalid request body' });
        return;
      }
      const { encodedParameters: rawEncodedParameters } = parsedBody.data;

      const rawEndpointId = req.params.endpointId;
      const verificationResult = verifyHttpSignedDataRequest(config, rawEncodedParameters, rawEndpointId);
      if (!verificationResult.success) {
        const { statusCode, error } = verificationResult;
        res.status(statusCode).send(error);
        return;
      }
      const { encodedParameters, endpointId } = verificationResult;

      const [err, result] = await processHttpSignedDataRequest(config, endpointId, encodedParameters);
      if (err) {
        // Returning 500 because failure here means something went wrong internally with a valid request
        res.status(500).send({ message: err.toString() });
        return;
      }

      // We do not want the user to see {"success": true, "data": <actual_data>}, but the actual data itself
      res.status(200).send(result!.data);
    };

    app.post(httpSignedDataGatewayPath, httpSignedDataRequestHandler);
    app.options(httpSignedDataGatewayPath, httpSignedDataRequestHandler);

    logger.log(
      `HTTP signed data gateway listening for request on "${getGatewaysUrl(port, httpSignedDataGatewayPath)}"`
    );
  }

  if (enabledGateways.includes('httpGateway')) {
    const httpGatewayPath = `${HTTP_BASE_PATH}/${DEFAULT_PATH_KEY}/:endpointId`;
    const httpRequestHandler = async function (req: Request, res: Response) {
      logger.log(`Received request for http data`);

      const originVerification = verifyRequestOrigin(
        (config.nodeSettings.httpGateway as EnabledGateway).corsOrigins,
        req.headers.origin
      );

      if (req.method === 'OPTIONS') {
        if (!originVerification.success) {
          res.status(400).send(originVerification.error);
          return;
        }

        // Set headers for the OPTIONS response
        res.set(originVerification.headers).status(204).send('');
        return;
      }
      // The CORS origin header needs to be sent on the POST request (sent after OPTIONS). If the request is NOT pre
      // flighted, none of the origin headers are applied, but the request goes through. This ensures that non browser
      // requests work as expected.
      res.set(originVerification.headers);

      const parsedBody = httpRequestBodySchema.safeParse(req.body);
      if (!parsedBody.success) {
        // This error and status code is returned by AWS gateway when the request does not match the openAPI
        // specification.
        res.status(400).send({ message: 'Invalid request body' });
        return;
      }
      const { parameters: rawParameters } = parsedBody.data;

      const rawEndpointId = req.params.endpointId;
      const verificationResult = verifyHttpRequest(config, rawParameters, rawEndpointId);
      if (!verificationResult.success) {
        const { statusCode, error } = verificationResult;
        res.status(statusCode).send(error);
        return;
      }
      const { parameters, endpointId } = verificationResult;

      const [err, result] = await processHttpRequest(config, endpointId, parameters);
      if (err) {
        // Returning 500 because failure here means something went wrong internally with a valid request
        res.status(500).send({ message: err.toString() });
        return;
      }

      // We do not want the user to see {"success": true, "data": <actual_data>}, but the actual data itself
      res.status(200).send(result!.data);
    };

    app.post(httpGatewayPath, httpRequestHandler);
    app.options(httpGatewayPath, httpRequestHandler);

    logger.log(`HTTP (testing) gateway listening for request on "${getGatewaysUrl(port, httpGatewayPath)}"`);
  }

  app.listen(port, () => {
    logger.log(`API gateway server running on "${getGatewaysUrl(port)}"`);
  });
}
