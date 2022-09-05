swagger: "2.0"
info:
  title: Airnode API Gateway
  version: "1.0"

schemes:
  - "https"

definitions:
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

parameters:
  endpointId:
    name: endpointId
    in: path
    type: string
    description: Endpoint ID
    required: true

paths:
  /${path_key}/{endpointId}:
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
            $ref: "#/definitions/EndpointRequest"
      responses:
        "200":
          description: Request called
          schema:
            $ref: "#/definitions/EndpointResponse"
      x-google-backend:
        address: https://${region}-${project}.cloudfunctions.net/${cloud_function_name}
        path_translation: CONSTANT_ADDRESS
    options:
      operationId: corsTestEndpoint
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
            $ref: "#/definitions/EndpointRequest"
      responses:
        "204":
          description: Request called
          schema:
            $ref: "#/definitions/EndpointResponse"
      x-google-backend:
        address: https://${region}-${project}.cloudfunctions.net/${cloud_function_name}
        path_translation: CONSTANT_ADDRESS
