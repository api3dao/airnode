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
        - parameters
      properties:
        parameters:
          type: object
    EndpointResponse:
      type: object
      required:
        - response
      properties:
        response: {}

  examples:
    EndpointIdParameterExample:
      summary: Endpoint name
      value: 0xeddc421714e1b46ef350e8ecf380bd0b38a40ce1a534e7ecdf4db7dbc9319353

    EndpointRequestExample:
      summary: Endpoint request example
      value: { "parameters": { "from": "EUR", "amount": 5 } }
    EndpointResponseExample:
      summary: Endpoint response example
      value: { "response": 20 }

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

  securitySchemes:
    apiKey:
      description: Airnode API Gateway API key
      type: apiKey
      name: x-api-key
      in: header

paths:
  /{endpointId}:
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
              examples:
                example:
                  $ref: "#/components/examples/EndpointResponseExample"
      security:
        - apiKey: []
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