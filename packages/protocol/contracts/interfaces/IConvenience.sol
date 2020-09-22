// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;
pragma experimental ABIEncoderV2;

import "./IAirnode.sol";


interface IConvenience {
    function getTemplates(bytes32[] calldata templateIds)
        external
        view
        returns (
            bytes32[] memory providerIds,
            bytes32[] memory endpointIds,
            uint256[] memory requesterInd,
            address[] memory designatedWallets,
            address[] memory fulfillAddresses,
            bytes4[] memory fulfillFunctionIds,
            bytes[] memory parameters
        );

    function checkAuthorizationStatuses(
        bytes32[] calldata providerIds,
        bytes32[] calldata endpointIds,
        uint256[] calldata requesterInds,
        address[] calldata clientAddresses
        )
        external
        view
        returns (bool[] memory statuses);
}
