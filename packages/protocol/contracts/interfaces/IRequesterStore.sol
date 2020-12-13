// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;


interface IRequesterStore {
    event RequesterCreated(
        uint256 indexed requesterIndex,
        address admin
        );

    event RequesterUpdated(
        uint256 indexed requesterIndex,
        address admin
        );

    event ClientEndorsementStatusUpdated(
        uint256 indexed requesterIndex,
        address indexed clientAddress,
        bool endorsementStatus
        );

    function createRequester(address admin)
        external
        returns (uint256 requesterIndex);

    function updateRequesterAdmin(
        uint256 requesterIndex,
        address admin
        )
        external;

    function updateClientEndorsementStatus(
        uint256 requesterIndex,
        address clientAddress,
        bool endorsementStatus
        )
        external;
}
