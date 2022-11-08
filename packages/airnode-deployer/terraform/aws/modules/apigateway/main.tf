resource "aws_iam_role" "api_gateway_role" {
  name               = "${var.name}-Role"
  assume_role_policy = data.aws_iam_policy_document.role_policy.json

  tags = {
    Name = var.name
  }
}

resource "aws_iam_role_policy" "lambda_invoke_role_policy" {
  count = length(var.lambdas) != 0 ? 1 : 0

  name   = "${var.name}-lambda-invoke"
  role   = aws_iam_role.api_gateway_role.id
  policy = data.aws_iam_policy_document.lambda_invoke_policy.json
}

resource "aws_api_gateway_rest_api" "api_gateway" {
  body = templatefile(var.template_file, merge(var.template_variables, { role = aws_iam_role.api_gateway_role.arn }))

  name = var.name

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

resource "aws_api_gateway_deployment" "deployment" {
  rest_api_id = aws_api_gateway_rest_api.api_gateway.id

  triggers = {
    api_config = sha256(jsonencode(aws_api_gateway_rest_api.api_gateway.body))
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_api_gateway_stage" "stage" {
  deployment_id = aws_api_gateway_deployment.deployment.id
  rest_api_id   = aws_api_gateway_rest_api.api_gateway.id
  stage_name    = var.stage
}

resource "aws_api_gateway_usage_plan" "usage_plan" {
  name = var.name

  api_stages {
    api_id = aws_api_gateway_rest_api.api_gateway.id
    stage  = aws_api_gateway_stage.stage.stage_name
  }
}
