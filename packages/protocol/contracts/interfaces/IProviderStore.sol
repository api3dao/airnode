// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "./IRequesterStore.sol";

interface IProviderStore is IRequesterStore {
    event ProviderParametersSet(
        bytes32 indexed providerId,
        address admin,
        string xpub,
        address[] authorizers
        );

    event WithdrawalRequested(
        bytes32 indexed providerId,
        uint256 indexed requesterIndex,
        bytes32 indexed withdrawalRequestId,
        address designatedWallet,
        address destination
        );

    event WithdrawalFulfilled(
        bytes32 indexed providerId,
        uint256 indexed requesterIndex,
        bytes32 indexed withdrawalRequestId,
        address designatedWallet,
        address destination,
        uint256 amount
        );

    function setProviderParameters(
        address admin,
        string calldata xpub,
        address[] calldata authorizers
        )
        external
        payable
        returns (bytes32 providerId);

    function requestWithdrawal(
        bytes32 providerId,
        uint256 requesterIndex,
        address designatedWallet,
        address destination
    )
        external;

    function fulfillWithdrawal(
        bytes32 withdrawalRequestId,
        bytes32 providerId,
        uint256 requesterIndex,
        address destination
        )
        external
        payable;

    function checkAuthorizationStatus(
        bytes32 providerId,
        bytes32 requestId,
        bytes32 endpointId,
        uint256 requesterIndex,
        address designatedWallet,
        address clientAddress
        )
        external
        view
        returns(bool status);

    function getProvider(bytes32 providerId)
        external
        view
        returns (
            address admin,
            string memory xpub,
            address[] memory authorizers
        );
}
