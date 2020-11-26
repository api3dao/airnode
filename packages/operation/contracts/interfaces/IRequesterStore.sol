// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;


interface IRequesterStore {
    event RequesterCreated(
        uint256 indexed requesterInd,
        address admin
        );

    event RequesterUpdated(
        uint256 indexed requesterInd,
        address admin
        );

    event ClientEndorsementStatusUpdated(
        uint256 indexed requesterInd,
        address indexed clientAddress,
        bool endorsementStatus
        );

    function createRequester(address admin)
        external
        returns (uint256 requesterInd);

    function updateRequesterAdmin(
        uint256 requesterInd,
        address admin
        )
        external;

    function updateClientEndorsementStatus(
        uint256 requesterInd,
        address clientAddress,
        bool endorsementStatus
        )
        external;

    function getRequesterAdmin(uint256 requesterInd)
        external
        view
        returns (address admin);

    function getRequesterEndorsementStatusOfClientAddress(
        uint256 requesterInd,
        address clientAddress
        )
        external
        view
        returns (bool endorsementStatus);
}
