openapi: "3.0.2"
info:
  title: Airnode OEV Gateway
  version: "1.0"

x-amazon-apigateway-request-validators:
  all:
    validateRequestBody: true
    validateRequestParameters: true
x-amazon-apigateway-request-validator: all

# 2 MB
x-amazon-apigateway-minimum-compression-size: 2097152

components:
  schemas:
    EndpointRequest:
      type: object
      required:
        - chainId
        - dapiServerAddress
        - oevProxyAddress
        - updateId
        - bidderAddress
        - bidAmount
        - beacons
      properties:
        chainId:
          type: integer
          format: int32
          minimum: 1
        dapiServerAddress:
          type: string
        oevProxyAddress:
          type: string
        updateId:
          type: string
        bidderAddress:
          type: string
        bidAmount:
          type: string
        beacons:
          type: array
          minItems: 1
          uniqueItems: true
          items:
            type: object
            required:
              - airnodeAddress
              - endpointId
              - encodedParameters
            properties:
              airnodeAddress:
                type: string
              endpointId:
                type: string
              encodedParameters:
                type: string
              signedData:
                type: object
                required:
                  - timestamp
                  - encodedValue
                  - signature
                properties:
                  timestamp:
                    type: string
                  encodedValue:
                    type: string
                  signature:
                    type: string

    EndpointResponse:
      type: array
      minItems: 1
      items:
        type: string

  examples:
    EndpointRequestExample:
      summary: Endpoint request example
      value: |
        {
          "chainId": 1,
          "dapiServerAddress": "0x...",
          "oevProxyAddress": "0x...",
          "updateId": "0x...",
          "bidderAddress": "0x...",
          "bidAmount": "123...",
          "beacons": [
            {
              "airnodeAddress": "0x...",
              "endpointId": "0x...",
              "encodedParameters": "0x...",
              "signedData": {
                "timestamp": "16...",
                "encodedValue": "0x...",
                "signature": "0x..."
              }
            },
            {
              "airnodeAddress": "0x...",
              "endpointId": "0x...",
              "encodedParameters": "0x..."
            }
          ]
        }
    EndpointResponseExample:
      summary: Endpoint response example
      value: |
        [
          "0x...",
          "0x...",
        ]

paths:
  /${path_key}:
    post:
      requestBody:
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/EndpointRequest"
            examples:
              example:
                $ref: "#/components/examples/EndpointRequestExample"
      responses:
        "200":
          description: Request called
          headers:
            Access-Control-Allow-Headers:
              schema:
                type: string
            Access-Control-Allow-Methods:
              schema:
                type: string
            Access-Control-Allow-Origin:
              schema:
                type: string
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/EndpointResponse"
      x-amazon-apigateway-integration:
        type: aws_proxy
        uri: arn:aws:apigateway:${region}:lambda:path/2015-03-31/functions/${proxy_lambda}/invocations
        credentials: ${role}
        httpMethod: POST
        payloadFormatVersion: "1.0"
        responses:
          default:
            statusCode: 200
    options:
      responses:
        "204":
          description: CORS preflight response
          headers:
            Access-Control-Allow-Headers:
              schema:
                type: string
            Access-Control-Allow-Methods:
              schema:
                type: string
            Access-Control-Allow-Origin:
              schema:
                type: string
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/EndpointResponse"
      x-amazon-apigateway-integration:
        passthroughBehavior: "when_no_match"
        type: aws_proxy
        uri: arn:aws:apigateway:${region}:lambda:path/2015-03-31/functions/${proxy_lambda}/invocations
        credentials: ${role}
        httpMethod: POST
        payloadFormatVersion: "1.0"
        responses:
          default:
            statusCode: 200
