// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "../../../adminnable/interfaces/IRankedAdminnable.sol";
import "./IRequesterRrpAuthorizer.sol";

interface ISelfRequesterRrpAuthorizer is
    IRankedAdminnable,
    IRequesterRrpAuthorizer
{}
