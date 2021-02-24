// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "./IAirnode.sol";


interface IConvenience {
    function getProviderAndBlockNumber(bytes32 providerId)
        external
        view
        returns (
            address admin,
            string memory xpub,
            address[] memory authorizers,
            uint256 blockNumber
        );

    function getTemplates(bytes32[] calldata templateIds)
        external
        view
        returns (
            bytes32[] memory providerIds,
            bytes32[] memory endpointIds,
            bytes[] memory parameters
        );

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

    function checkAuthorizationStatuses(
        bytes32 providerId,
        bytes32[] calldata requestIds, 
        bytes32[] calldata endpointIds,
        uint256[] calldata requesterIndices,
        address[] calldata designatedWallets,
        address[] calldata clientAddresses
        )
        external
        view
        returns (bool[] memory statuses);
}
