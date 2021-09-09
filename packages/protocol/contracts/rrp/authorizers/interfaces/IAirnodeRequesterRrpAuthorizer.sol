// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "../../../adminnable/interfaces/IAirnodeAdminnable.sol";
import "./IRequesterRrpAuthorizer.sol";

interface IAirnodeRequesterRrpAuthorizer is
    IAirnodeAdminnable,
    IRequesterRrpAuthorizer
{}
