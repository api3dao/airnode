// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "../../../adminnable/interfaces/IWhitelister.sol";
import "./IRrpAuthorizer.sol";

interface IRequesterRrpAuthorizer is IWhitelister, IRrpAuthorizer {}
