// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

interface IRequesterStore {
    event RequesterCreated(
        uint256 indexed requesterIndex,
        address admin
        );

    event RequesterUpdated(
        uint256 indexed requesterIndex,
        address admin
        );

    event ClientEndorsementStatusSet(
        uint256 indexed requesterIndex,
        address indexed clientAddress,
        bool endorsementStatus
        );

    function createRequester(address admin)
        external
        returns (uint256 requesterIndex);

    function setRequesterAdmin(
        uint256 requesterIndex,
        address admin
        )
        external;

    function setClientEndorsementStatus(
        uint256 requesterIndex,
        address clientAddress,
        bool endorsementStatus
        )
        external;
}
