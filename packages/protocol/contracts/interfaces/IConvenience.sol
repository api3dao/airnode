// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;
pragma experimental ABIEncoderV2;

import "./IAirnode.sol";


interface IConvenience {
    function getTemplates(bytes32[] calldata templateIds)
        external
        view
        returns (IAirnode.Template[] memory templates);

    function getDataWithClientAddress(
        bytes32 providerId,
        address clientAddress
        )
        external
        view
        returns (
            bytes32 requesterId,
            uint256 walletInd,
            address walletAddress,
            uint256 walletBalance,
            uint256 minBalance
            );

    function getDataWithClientAddresses(
        bytes32 providerId,
        address[] calldata clientAddresses
        )
        external
        view
        returns (
            bytes32[] memory requesterIds,
            uint256[] memory walletInds,
            address[] memory walletAddresses,
            uint256[] memory walletBalances,
            uint256[] memory minBalances
            );

    function checkAuthorizationStatuses(
        bytes32[] calldata endpointIds,
        address[] calldata clientAddresses
        )
        external
        view
        returns (bool[] memory statuses);
}
