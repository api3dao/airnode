// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "../../../admin/interfaces/IMetaAdminnable.sol";
import "./IRequesterRrpAuthorizer.sol";

interface IApi3RequesterRrpAuthorizer is
    IMetaAdminnable,
    IRequesterRrpAuthorizer
{}
