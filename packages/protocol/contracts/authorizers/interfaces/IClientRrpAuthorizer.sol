// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./IClientWhitelister.sol";
import "./IRrpAuthorizer.sol";

interface IClientRrpAuthorizer is IClientWhitelister, IRrpAuthorizer {}
