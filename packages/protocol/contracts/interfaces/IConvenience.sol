// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;
pragma experimental ABIEncoderV2;

import "./IAirnode.sol";


interface IConvenience {
    function getTemplates(bytes32[] calldata templateIds)
        external
        view
        returns (IAirnode.Template[] memory templates);

    function checkAuthorizationStatuses(
        bytes32[] calldata endpointIds,
        address[] calldata clientAddresses
        )
        external
        view
        returns (bool[] memory statuses);
}
