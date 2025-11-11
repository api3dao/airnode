---
"@api3/airnode-admin": minor
"@api3/airnode-deployer": minor
"@api3/airnode-node": minor
"@api3/airnode-examples": minor
"@api3/airnode-utilities": minor
---

Replace Node.js 20 with Node.js 22. This upgrade includes:
- Updated Node.js version to 22.12.0 in package.json and CI/CD workflows
- Updated Docker base images from node:20.17.0-alpine3.20 to node:22.12.0-alpine3.21
- Updated AWS Lambda runtime from nodejs20.x to nodejs22.x
- Updated GCP Cloud Functions runtime from nodejs20 to nodejs22
- Added yarn resolution for cloudevents@10.0.0 to support Node.js 22
- Updated @types/node from ^20.17.0 to ^22.12.0
