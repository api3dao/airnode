// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./IClientWhitelistRrpAuthorizer.sol";

interface IApi3CwRrpAuthorizer is IClientWhitelistRrpAuthorizer {
    event SetApi3Admin(address api3Admin);

    function setApi3Admin(address _api3Admin) external;

    function setRank(address targetAdmin, uint256 newRank) external;

    function decreaseSelfRank(uint256 newRank) external;
}
