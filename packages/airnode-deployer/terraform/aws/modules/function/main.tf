resource "local_file" "index_js" {
  source   = "${var.source_dir}/index.js"
  filename = "${local.tmp_dir}/index.js"
}

resource "local_file" "aws_index_js" {
  source   = "${var.source_dir}/handlers/aws/index.js"
  filename = "${local.tmp_dir}/handlers/aws/index.js"
}

resource "local_file" "config_json" {
  source   = var.configuration_file
  filename = "${local.tmp_dir}/config-data/config.json"
}

resource "aws_iam_role" "lambda_role" {
  name               = var.name
  assume_role_policy = data.aws_iam_policy_document.role_policy.json
}

resource "aws_cloudwatch_log_group" "cloudwatch_log_group" {
  name              = "/aws/lambda/${var.name}"
  retention_in_days = 90
}

resource "aws_iam_role_policy" "lambda_log_role_policy" {
  name   = "${var.name}-log"
  role   = aws_iam_role.lambda_role.id
  policy = data.aws_iam_policy_document.cloudwatch_log_policy.json
}

resource "aws_iam_role_policy" "invoke_lambda_role_policy" {
  count = length(var.invoke_targets) != 0 ? 1 : 0

  name   = "${var.name}-invoke"
  role   = aws_iam_role.lambda_role.id
  policy = data.aws_iam_policy_document.lambda_invoke_policy.json
}

resource "aws_lambda_function" "lambda" {
  filename                       = data.archive_file.lambda_zip.output_path
  source_code_hash               = data.archive_file.lambda_zip.output_base64sha256
  function_name                  = var.name
  handler                        = var.handler
  memory_size                    = var.memory_size
  runtime                        = "nodejs18.x"
  role                           = aws_iam_role.lambda_role.arn
  timeout                        = var.timeout
  reserved_concurrent_executions = var.reserved_concurrent_executions
  depends_on = [
    aws_iam_role.lambda_role,
  ]

  environment {
    variables = merge(
      var.environment_variables,
      local.secrets,
      { AIRNODE_CLOUD_PROVIDER = "aws" }
    )
  }
}

resource "aws_cloudwatch_event_rule" "lambda_schedule_rule" {
  count = var.schedule_interval == 0 ? 0 : 1

  name                = "${var.name}-schedule"
  schedule_expression = "cron(0/${var.schedule_interval} * * * ? *)"
}

resource "aws_cloudwatch_event_target" "lambda_schedule_target" {
  count = var.schedule_interval == 0 ? 0 : 1

  rule = aws_cloudwatch_event_rule.lambda_schedule_rule[0].name
  arn  = aws_lambda_function.lambda.arn
}

resource "aws_lambda_permission" "schedule_lambda_call" {
  count = var.schedule_interval == 0 ? 0 : 1

  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.lambda.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.lambda_schedule_rule[0].arn
}
