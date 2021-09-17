// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "../../../adminnable/interfaces/ISelfAdminnable.sol";
import "./IRequesterRrpAuthorizer.sol";

interface IAirnodeRequesterRrpAuthorizer is
    ISelfAdminnable,
    IRequesterRrpAuthorizer
{}
