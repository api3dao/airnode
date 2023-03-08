swagger: "2.0"
info:
  title: Airnode OEV Gateway
  version: "1.0"

schemes:
  - "https"

paths:
  /${path_key}:
    post:
      operationId: testEndpoint
      consumes:
        - application/json
      produces:
        - application/json
      responses:
        "200":
          description: Request called
      x-google-backend:
        address: https://${region}-${project}.cloudfunctions.net/${cloud_function_name}
        path_translation: CONSTANT_ADDRESS
    options:
      operationId: corsTestEndpoint
      consumes:
        - application/json
      produces:
        - application/json
      responses:
        "204":
          description: Request called
      x-google-backend:
        address: https://${region}-${project}.cloudfunctions.net/${cloud_function_name}
        path_translation: CONSTANT_ADDRESS
