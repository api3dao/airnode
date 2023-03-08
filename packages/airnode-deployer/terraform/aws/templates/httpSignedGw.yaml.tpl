openapi: "3.0.2"
info:
  title: Airnode API Gateway
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
        - encodedParameters
      properties:
        encodedParameters:
          type: string
    EndpointResponse:
      type: object
      required:
        - response
      properties:
        response: {}

  examples:
    EndpointIdParameterExample:
      summary: Endpoint ID
      value: 0xeddc421714e1b46ef350e8ecf380bd0b38a40ce1a534e7ecdf4db7dbc9319353

    EndpointRequestExample:
      summary: Endpoint request example
      value: { "encodedParameters": "0x3173...0000" }
    EndpointResponseExample:
      summary: Endpoint response example
      value: { "timestamp": "1648226003", "encodedValue": "0x0000...14c0", "signature": "0xa74e4...f61b" }

  parameters:
    endpointId:
      name: endpointId
      in: path
      description: Endpoint ID
      required: true
      schema:
        type: string
      examples:
        example:
          $ref: "#/components/examples/EndpointIdParameterExample"

paths:
  /${path_key}/{endpointId}:
    post:
      parameters:
        - $ref: "#/components/parameters/endpointId"
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
      parameters:
        - $ref: "#/components/parameters/endpointId"
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