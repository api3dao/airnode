data "aws_iam_policy_document" "role_policy" {
  statement {
    sid    = ""
    effect = "Allow"

    principals {
      identifiers = ["lambda.amazonaws.com"]
      type        = "Service"
    }

    actions = ["sts:AssumeRole"]
  }
}

data "aws_iam_policy_document" "cloudwatch_log_policy" {
  statement {
    effect = "Allow"
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]
    resources = ["${aws_cloudwatch_log_group.cloudwatch_log_group.arn}:*"]
  }
}

data "aws_iam_policy_document" "lambda_invoke_policy" {
  statement {
    effect    = "Allow"
    actions   = ["lambda:InvokeFunction"]
    resources = var.invoke_targets
  }
}

data "archive_file" "lambda_zip" {
  type        = "zip"
  output_path = local.tmp_archive
  source_dir  = local.tmp_dir

  depends_on = [local_file.index_js, local_file.aws_index_js, local_file.config_json]
}
