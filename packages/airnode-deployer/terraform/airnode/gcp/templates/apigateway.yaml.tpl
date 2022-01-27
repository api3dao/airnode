swagger: "2.0"
info:
  title: Airnode API Gateway
  version: "1.0"

schemes:
  - "https"

definitions:
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

parameters:
  endpointId:
    name: endpointId
    in: path
    type: string
    description: Endpoint ID
    required: true

paths:
  /test/{endpointId}:
    post:
      operationId: testEndpoint
      consumes:
        - application/json
      produces:
        - application/json
      parameters:
        - $ref: "#/parameters/endpointId"
        - name: request
          in: body
          required: true
          schema:
            $ref: "#/definitions/TestEndpointRequest"
      responses:
        "200":
          description: Test request called
          schema:
            $ref: "#/definitions/TestEndpointResponse"
      x-google-backend:
        address: https://${region}-${project}.cloudfunctions.net/${cloud_function_name}
        path_translation: CONSTANT_ADDRESS
