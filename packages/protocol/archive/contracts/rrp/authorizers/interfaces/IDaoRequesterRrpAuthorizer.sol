// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "../../../adminnable/interfaces/IAdminnable.sol";
import "./IRequesterRrpAuthorizer.sol";

interface IDaoRequesterRrpAuthorizer is IAdminnable, IRequesterRrpAuthorizer {}
