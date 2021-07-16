// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./IClientWhitelistRrpAuthorizer.sol";

interface IApi3CwRrpAuthorizer is IClientWhitelistRrpAuthorizer {
    function getMetaAdmin() external returns (address);

    function setRank(address targetAdmin, uint256 newRank) external;

    function decreaseSelfRank(uint256 newRank) external;
}
