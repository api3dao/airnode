import { readFileSync } from 'fs';
import path from 'path';
import { logger, buildBaseOptions } from '@api3/airnode-utilities';
import express, { Request } from 'express';
import dotenv from 'dotenv';
import { z } from 'zod';
import { VerificationResult, verifyHttpRequest, verifyHttpSignedDataRequest } from './validation';
import { loadTrustedConfig } from '../../config';
import { processHttpRequest, processHttpSignedDataRequest } from '../../handlers';

type GatewayName = 'httpGateway' | 'httpSignedDataGateway';

function verifyApiKey(req: Request, gatewayName: GatewayName): VerificationResult<{}> {
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

function startGatewayServer(enabledGateways: GatewayName[]) {
  if (enabledGateways.length === 0) {
    logger.log('Not starting API gateway server because there is no gateway enabled.');
    return;
  }

  const app = express();
  // TODO: get this from config (important when the docker is run in network host mode)
  const port = 3000;

  if (enabledGateways.includes('httpSignedDataGateway')) {
    app.get('/http-signed-data', async function (req, res) {
      const apiKeyVerification = verifyApiKey(req, 'httpSignedDataGateway');
      if (!apiKeyVerification.success) {
        const { statusCode, error } = apiKeyVerification;
        res.status(statusCode).send(error);
        return;
      }

      const parsedBody = httpSignedDataBodySchema.safeParse(req.body);
      if (!parsedBody.success) {
        // This error and status code is returned by AWS gateway when the request does not match the openAPI
        // specification. We want the same error to be returned by the GCP gateway.
        res.status(400).send({ message: 'Invalid request body' });
        return;
      }
      const { encodedParameters: rawEncodedParameters } = parsedBody.data;

      // Guaranteed to exist by the openAPI schema
      const { endpointId: rawEndpointId } = req.query;

      const verificationResult = verifyHttpSignedDataRequest(config, rawEncodedParameters, rawEndpointId as string);
      if (!verificationResult.success) {
        const { statusCode, error } = verificationResult;
        res.status(statusCode).send(error);
        return;
      }
      const { encodedParameters, endpointId } = verificationResult;

      const [err, result] = await processHttpSignedDataRequest(config, endpointId as string, encodedParameters);
      if (err) {
        // Returning 500 because failure here means something went wrong internally with a valid request
        res.status(500).send({ message: err.toString() });
        return;
      }

      // We do not want the user to see {"success": true, "data": <actual_data>}, but the actual data itself
      res.status(200).send(result!.data);
    });
  }

  if (enabledGateways.includes('httpGateway')) {
    app.get('/http-data', async function (req, res) {
      const apiKeyVerification = verifyApiKey(req, 'httpGateway');
      if (!apiKeyVerification.success) {
        const { statusCode, error } = apiKeyVerification;
        res.status(statusCode).send(error);
        return;
      }

      const parsedBody = httpRequestBodySchema.safeParse(req.body);
      if (!parsedBody.success) {
        // This error and status code is returned by AWS gateway when the request does not match the openAPI
        // specification. We want the same error to be returned by the GCP gateway.
        res.status(400).send({ message: 'Invalid request body' });
        return;
      }
      const { parameters: rawParameters } = parsedBody.data;

      // Guaranteed to exist by the openAPI schema
      const { endpointId: rawEndpointId } = req.query;

      const verificationResult = verifyHttpRequest(config, rawParameters, rawEndpointId as string);
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
  }

  app.listen(port, () => {
    logger.log(`API gateway server running on http://localhost:${port}`, logOptions);
  });
}

const rawSecrets = readFileSync(path.resolve(`${__dirname}/../../../config/secrets.env`));
const secrets = dotenv.parse(rawSecrets);
// Configuration is checked when at the start of the container
const config = loadTrustedConfig(path.resolve(`${__dirname}/../../../config/config.json`), secrets);
const logOptions = buildBaseOptions(config, {});

// Determine which gateways are enabled
const gatewayNames = ['httpGateway', 'httpSignedDataGateway'] as const;
const enabledGateways = gatewayNames.filter((gatewayName) => config.nodeSettings[gatewayName].enabled);
enabledGateways.forEach((gatewayName) => {
  logger.log(`Preparing to start ${gatewayName} API gateway.`);
});

startGatewayServer(enabledGateways);
