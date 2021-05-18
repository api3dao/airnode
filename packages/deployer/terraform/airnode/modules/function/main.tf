resource "random_uuid" "uuid" {
}

resource "null_resource" "fetch_lambda_files" {
  provisioner "local-exec" {
    command = <<EOC
rm -rf ${local.tmp_dir}
mkdir -p "${local.tmp_source_dir}" "${local.tmp_configuration_dir}"
cp "${var.source_file}" "${local.tmp_source_dir}"
cp "${var.configuration_file}" "${local.tmp_configuration_dir}"
EOC
  }

  triggers = {
    source_file_hash        = fileexists("${local.tmp_source_dir}/${var.source_file}") ? filesha256(var.source_file) : ""
    configuration_file_hash = fileexists("${local.tmp_configuration_dir}/${var.configuration_file}") ? filesha256(var.configuration_file) : ""
  }
}

resource "aws_iam_role" "lambda_role" {
  name               = "${local.name}-role"
  assume_role_policy = data.aws_iam_policy_document.role_policy.json
}

resource "aws_cloudwatch_log_group" "cloudwatch_log_group" {
  name              = "/aws/lambda/${local.name}"
  retention_in_days = 90
}

resource "aws_iam_role_policy" "lambda_log_role_policy" {
  name   = "${local.name}-log-policy"
  role   = aws_iam_role.lambda_role.id
  policy = data.aws_iam_policy_document.cloudwatch_log_policy.json
}

resource "aws_iam_role_policy" "invoke_lambda_role_policy" {
  count = length(var.invoke_targets) != 0 ? 1 : 0

  name   = "${local.name}-invoke-policy"
  role   = aws_iam_role.lambda_role.id
  policy = data.aws_iam_policy_document.lambda_invoke_policy.json
}

resource "aws_lambda_function" "lambda" {
  filename                       = "${local.tmp_output_dir}/${local.name}.zip"
  source_code_hash               = data.archive_file.lambda_zip.output_base64sha256
  function_name                  = local.name
  handler                        = var.handler
  runtime                        = "nodejs14.x"
  role                           = aws_iam_role.lambda_role.arn
  timeout                        = var.timeout
  reserved_concurrent_executions = var.reserved_concurrent_executions
  depends_on = [
    aws_iam_role.lambda_role,
  ]

  environment {
    variables = jsondecode(file(var.secrets_file))
  }
}

resource "aws_cloudwatch_event_rule" "lambda_schedule_rule" {
  count = var.schedule_interval == 0 ? 0 : 1

  name                = "${local.name}-schedule-rule"
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
