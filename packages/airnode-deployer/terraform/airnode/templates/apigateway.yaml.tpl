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
    TestEndpointRequest:
      type: object
      required:
        - parameters
      properties:
        parameters:
          type: object
    TestEndpointResponse:
      type: object
      required:
        - response
      properties:
        response: {}

  examples:
    EndpointIdParameterExample:
      summary: Endpoint name
      value: 0xeddc421714e1b46ef350e8ecf380bd0b38a40ce1a534e7ecdf4db7dbc9319353

    TestEndpointRequestExample:
      summary: Test endpoint request example
      value: { "parameters": { "from": "EUR", "amount": 5 } }
    TestEndpointResponseExample:
      summary: Test endpoint response example
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

security:
  - apiKey: []

paths:
  /test/{endpointId}:
    post:
      parameters:
        - $ref: "#/components/parameters/endpointId"
      requestBody:
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/TestEndpointRequest"
            examples:
              example:
                $ref: "#/components/examples/TestEndpointRequestExample"
      responses:
        "200":
          description: Test request called
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/TestEndpointResponse"
              examples:
                example:
                  $ref: "#/components/examples/TestEndpointResponseExample"
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
