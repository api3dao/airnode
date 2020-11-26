// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "./IAuthorizer.sol";


interface IMinBalanceAuthorizer is IAuthorizer {
    event MinBalanceUpdated(
        bytes32 indexed providerId,
        uint256 minBalance
        );

    function updateMinBalance(
        bytes32 providerId,
        uint256 minBalance
        )
        external;
}
