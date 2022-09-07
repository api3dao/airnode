data "aws_iam_policy_document" "role_policy" {
  statement {
    sid    = ""
    effect = "Allow"

    principals {
      identifiers = ["apigateway.amazonaws.com"]
      type        = "Service"
    }

    actions = ["sts:AssumeRole"]
  }
}

data "aws_iam_policy_document" "lambda_invoke_policy" {
  statement {
    effect    = "Allow"
    actions   = ["lambda:InvokeFunction"]
    resources = var.lambdas
  }
}
