---
'@api3/airnode-node': patch
---

refactors `jest.spyOn(fs, 'readFileSync').mockReturnValue` to use `Once` to fix affected tests
