---
'@api3/airnode-node': minor
'@api3/airnode-validator': minor
---

Remove RequestStatus enum and remove ignoreBlockedRequestsAfterBlocks from request metadata. Requests that were previously assigned a status like blocked, errored, or fulfilled are now dropped.
