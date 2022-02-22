---
'@api3/airnode-node': patch
---

Refactors `jest.spyOn(fs, 'readFileSync').mockReturnValue` to use `mockImplementation` to fix affected tests
