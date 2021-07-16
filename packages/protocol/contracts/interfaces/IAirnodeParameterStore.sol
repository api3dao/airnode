// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

import "./IRequesterStore.sol";

interface IAirnodeParameterStore is IRequesterStore {
    event SetDefaultAuthorizers(address[] defaultAuthorizers);

    event AirnodeParametersSet(
        bytes32 indexed airnodeId,
        address admin,
        string xpub,
        address[] authorizers
    );

    event WithdrawalRequested(
        bytes32 indexed airnodeId,
        address indexed requester,
        bytes32 indexed withdrawalRequestId,
        address designatedWallet,
        address destination
    );

    event WithdrawalFulfilled(
        bytes32 indexed airnodeId,
        address indexed requester,
        bytes32 indexed withdrawalRequestId,
        address designatedWallet,
        address destination,
        uint256 amount
    );

    function setAirnodeParameters(
        string calldata xpub,
        address[] calldata authorizers
    ) external payable returns (bytes32 airnodeId);

    function requestWithdrawal(
        bytes32 airnodeId,
        address designatedWallet,
        address destination
    ) external;

    function fulfillWithdrawal(
        bytes32 withdrawalRequestId,
        bytes32 airnodeId,
        address requester,
        address destination
    ) external payable;

    function checkAuthorizationStatus(
        bytes32 airnodeId,
        bytes32 requestId,
        bytes32 endpointId,
        address requester,
        address designatedWallet,
        address clientAddress
    ) external view returns (bool status);

    function getAirnodeParameters(bytes32 airnodeId)
        external
        view
        returns (
            address admin,
            string memory xpub,
            address[] memory authorizers
        );
}
