import { logger, LogOptions } from '@api3/airnode-utilities';
import express, { Request } from 'express';
import { z } from 'zod';
import bodyParser from 'body-parser';
import { VerificationResult, verifyHttpRequest, verifyHttpSignedDataRequest } from './validation';
import { Config, LocalProvider } from '../../config';
import { processHttpRequest, processHttpSignedDataRequest } from '../../handlers';

type GatewayName = 'httpGateway' | 'httpSignedDataGateway';

function verifyApiKey(config: Config, req: Request, gatewayName: GatewayName): VerificationResult<{}> {
  const apiKey = req.header('x-api-key');
  const gateway = config.nodeSettings[gatewayName];

  if (!apiKey || !gateway.enabled || apiKey !== gateway.apiKey) {
    // Mimics the behavior of AWS HTTP Gateway
    return { success: false, statusCode: 403, error: { message: 'Forbidden' } };
  }

  return { success: true };
}

// We do not want to enable ".strict()" - we want to allow extra fields in the request body
const httpRequestBodySchema = z.object({
  parameters: z.any(), // Parameter validation is performed later
});
// We do not want to enable ".strict()" - we want to allow extra fields in the request body
const httpSignedDataBodySchema = z.object({
  encodedParameters: z.string(),
});
const DEFAULT_PORT = 3000;

export function getGatewaysBaseUrl(port: number | undefined) {
  return `http://localhost:${port || DEFAULT_PORT}`;
}

export const HTTP_SIGNED_DATA_BASE_PATH = '/http-signed-data';
export const HTTP_BASE_PATH = '/http-data';

export function startGatewayServer(config: Config, logOptions: LogOptions, enabledGateways: GatewayName[]) {
  if (enabledGateways.length === 0) {
    logger.log('Not starting API gateway server because there is no gateway enabled.');
    return;
  }

  const app = express();
  app.use(bodyParser.json());
  const cloudProviderSettings = config.nodeSettings.cloudProvider as LocalProvider;
  const port = cloudProviderSettings.gatewayServerPort ?? DEFAULT_PORT;

  if (enabledGateways.includes('httpSignedDataGateway')) {
    const httpSignedDataGatewayPath = `${HTTP_SIGNED_DATA_BASE_PATH}/:endpointId`;
    app.post(httpSignedDataGatewayPath, async function (req, res) {
      logger.log(`Received request for http signed data`, logOptions);

      const apiKeyVerification = verifyApiKey(config, req, 'httpSignedDataGateway');
      if (!apiKeyVerification.success) {
        const { statusCode, error } = apiKeyVerification;
        res.status(statusCode).send(error);
        return;
      }

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
    });

    logger.log(
      `HTTP signed data gateway listening for request on "${getGatewaysBaseUrl(port)}${httpSignedDataGatewayPath}"`,
      logOptions
    );
  }

  if (enabledGateways.includes('httpGateway')) {
    const httpGatewayPath = `/${HTTP_BASE_PATH}/:endpointId`;
    app.post(httpGatewayPath, async function (req, res) {
      logger.log(`Received request for http data`, logOptions);

      const apiKeyVerification = verifyApiKey(config, req, 'httpGateway');
      if (!apiKeyVerification.success) {
        const { statusCode, error } = apiKeyVerification;
        res.status(statusCode).send(error);
        return;
      }

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
    });

    logger.log(
      `HTTP (testing) gateway listening for request on "${getGatewaysBaseUrl(port)}${httpGatewayPath}"`,
      logOptions
    );
  }

  app.listen(port, () => {
    logger.log(`API gateway server running on "${getGatewaysBaseUrl(port)}"`, logOptions);
  });
}
