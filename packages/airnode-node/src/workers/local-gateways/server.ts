import { randomUUID } from 'crypto';
import { addMetadata, logger, setLogOptions } from '@api3/airnode-utilities';
import express, { Request, Response } from 'express';
import { z } from 'zod';
import {
  signOevDataBodySchema,
  verifyHttpRequest,
  verifyHttpSignedDataRequest,
  verifyRequestOrigin,
  verifySignOevDataRequest,
} from './validation';
import { Config, EnabledGateway, LocalProvider } from '../../config';
import { processHttpRequest, processHttpSignedDataRequest, signOevData } from '../../handlers';

type GatewayName = 'httpGateway' | 'httpSignedDataGateway' | 'oevGateway';

// We do not want to enable ".strict()" - we want to allow extra fields in the request body
const httpRequestBodySchema = z.object({
  parameters: z.any(), // Parameter validation is performed later
});
// We do not want to enable ".strict()" - we want to allow extra fields in the request body
const httpSignedDataBodySchema = z.object({
  encodedParameters: z.string(),
});
const DEFAULT_PORT = 3000;
export const DEFAULT_PATH_KEY = '01234567-abcd-abcd-abcd-012345678abc';

export function getGatewaysUrl(port: number = DEFAULT_PORT, path?: string) {
  const base = `http://localhost:${port || DEFAULT_PORT}`;
  if (!path) return base;
  return base + (path.startsWith('/') ? path : `/${path}`);
}

export const HTTP_SIGNED_DATA_BASE_PATH = '/http-signed-data';
export const HTTP_BASE_PATH = '/http-data';
export const OEV_BASE_PATH = '/sign-oev';

export function startGatewayServer(config: Config, enabledGateways: GatewayName[]) {
  if (enabledGateways.length === 0) {
    logger.log('Not starting API gateway server because there is no gateway enabled.');
    return;
  }

  const app = express();
  app.use(express.json());
  const cloudProviderSettings = config.nodeSettings.cloudProvider as LocalProvider;
  const port = cloudProviderSettings.gatewayServerPort ?? DEFAULT_PORT;

  if (enabledGateways.includes('httpSignedDataGateway')) {
    const httpSignedDataGatewayPath = `${HTTP_SIGNED_DATA_BASE_PATH}/${DEFAULT_PATH_KEY}/:endpointId`;
    const httpSignedDataRequestHandler = async function (req: Request, res: Response) {
      setLogOptions({
        format: config.nodeSettings.logFormat,
        level: config.nodeSettings.logLevel,
        meta: { requestId: randomUUID() },
      });

      logger.debug(`HTTP signed data gateway request received`);

      const originVerification = verifyRequestOrigin(
        (config.nodeSettings.httpSignedDataGateway as EnabledGateway).corsOrigins,
        req.headers.origin
      );
      if (req.method === 'OPTIONS') {
        if (!originVerification.success) {
          logger.error(`HTTP signed data gateway request origin verification error`);
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
      logger.debug(`HTTP signed data gateway request passed origin verification`);

      const parsedBody = httpSignedDataBodySchema.safeParse(req.body);
      if (!parsedBody.success) {
        // This error and status code is returned by AWS gateway when the request does not match the openAPI
        // specification.
        logger.error(`HTTP signed data gateway request invalid request body`);
        res.status(400).send({ message: 'Invalid request body' });
        return;
      }
      const { encodedParameters: rawEncodedParameters } = parsedBody.data;

      const rawEndpointId = req.params.endpointId;
      logger.debug(`HTTP signed data gateway request passed request body parsing`);
      const verificationResult = verifyHttpSignedDataRequest(config, rawEncodedParameters, rawEndpointId);
      if (!verificationResult.success) {
        const { statusCode, error } = verificationResult;
        logger.error(`HTTP signed data gateway request verification error`);
        res.status(statusCode).send(error);
        return;
      }
      const { encodedParameters, endpointId } = verificationResult;
      addMetadata({ 'Endpoint-ID': endpointId });
      logger.debug(`HTTP signed data gateway request passed request verification`);

      const [err, result] = await processHttpSignedDataRequest(config, endpointId, encodedParameters);
      if (err) {
        // Returning 500 because failure here means something went wrong internally with a valid request
        logger.error(`HTTP signed data gateway request processing error`);
        res.status(500).send({ message: err.toString() });
        return;
      }
      logger.debug(`HTTP signed data gateway request processed successfully`);

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
      setLogOptions({
        format: config.nodeSettings.logFormat,
        level: config.nodeSettings.logLevel,
        meta: { requestId: randomUUID() },
      });

      logger.debug(`HTTP gateway request received`);

      const originVerification = verifyRequestOrigin(
        (config.nodeSettings.httpGateway as EnabledGateway).corsOrigins,
        req.headers.origin
      );

      if (req.method === 'OPTIONS') {
        if (!originVerification.success) {
          logger.error(`HTTP gateway request origin verification error`);
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
      logger.debug(`HTTP gateway request passed origin verification`);

      const parsedBody = httpRequestBodySchema.safeParse(req.body);
      if (!parsedBody.success) {
        // This error and status code is returned by AWS gateway when the request does not match the openAPI
        // specification.
        logger.error(`HTTP gateway request invalid request body`);
        res.status(400).send({ message: 'Invalid request body' });
        return;
      }
      const { parameters: rawParameters } = parsedBody.data;

      const rawEndpointId = req.params.endpointId;
      logger.debug(`HTTP gateway request passed request body parsing`);
      const verificationResult = verifyHttpRequest(config, rawParameters, rawEndpointId);
      if (!verificationResult.success) {
        const { statusCode, error } = verificationResult;
        logger.error(`HTTP gateway request verification error`);
        res.status(statusCode).send(error);
        return;
      }
      const { parameters, endpointId } = verificationResult;
      addMetadata({ 'Endpoint-ID': endpointId });
      logger.debug(`HTTP gateway request passed request verification`);

      const [err, result] = await processHttpRequest(config, endpointId, parameters);
      if (err) {
        // Returning 500 because failure here means something went wrong internally with a valid request
        logger.error(`HTTP gateway request processing error`);
        res.status(500).send({ message: err.toString() });
        return;
      }
      logger.debug(`HTTP gateway request processed successfully`);

      // We do not want the user to see {"success": true, "data": <actual_data>}, but the actual data itself
      res.status(200).send(result!.data);
    };

    app.post(httpGatewayPath, httpRequestHandler);
    app.options(httpGatewayPath, httpRequestHandler);

    logger.log(`HTTP (testing) gateway listening for request on "${getGatewaysUrl(port, httpGatewayPath)}"`);
  }

  if (enabledGateways.includes('oevGateway')) {
    const oevGatewayPath = `${OEV_BASE_PATH}/${DEFAULT_PATH_KEY}`;
    const signOevDataRequestHandler = async function (req: Request, res: Response) {
      setLogOptions({
        format: config.nodeSettings.logFormat,
        level: config.nodeSettings.logLevel,
        meta: { requestId: randomUUID() },
      });

      logger.debug(`OEV gateway request received`);

      const originVerification = verifyRequestOrigin(
        (config.nodeSettings.oevGateway as EnabledGateway).corsOrigins,
        req.headers.origin
      );
      if (req.method === 'OPTIONS') {
        if (!originVerification.success) {
          logger.error(`OEV gateway request origin verification error`);
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
      logger.debug(`OEV gateway request passed origin verification`);

      const parsedBody = signOevDataBodySchema.safeParse(req.body);
      if (!parsedBody.success) {
        // This error and status code is returned by AWS gateway when the request does not match the openAPI
        // specification.
        // TODO: It is not very nice to debug this (the message doesn't tell much).
        logger.error(`OEV gateway request invalid request body`);
        res.status(400).send({ message: 'Invalid request body' });
        return;
      }
      const rawSignOevDataRequestBody = parsedBody.data;
      logger.debug(`OEV gateway request passed request body parsing`);

      const verificationResult = verifySignOevDataRequest(rawSignOevDataRequestBody);
      if (!verificationResult.success) {
        const { statusCode, error } = verificationResult;
        logger.error(`OEV gateway request verification error`);
        res.status(statusCode).send(error);
        return;
      }
      logger.debug(`OEV gateway request passed request verification`);
      const { oevUpdateHash, beacons } = verificationResult;

      const [err, result] = await signOevData(beacons, oevUpdateHash);
      if (err) {
        // Returning 500 because failure here means something went wrong internally with a valid request
        logger.error(`OEV gateway request processing error`);
        res.status(500).send({ message: err.toString() });
        return;
      }
      logger.debug(`OEV gateway request processed successfully`);

      // We do not want the user to see {"success": true, "data": <actual_data>}, but the actual data itself
      res.status(200).send(result!.data);
    };

    app.post(oevGatewayPath, signOevDataRequestHandler);
    app.options(oevGatewayPath, signOevDataRequestHandler);

    logger.log(`OEV gateway listening for request on "${getGatewaysUrl(port, oevGatewayPath)}"`);
  }

  app.listen(port, () => {
    logger.log(`API gateway server running on "${getGatewaysUrl(port)}"`);
  });
}
