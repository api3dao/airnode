// SPDX-License-Identifier: MIT
pragma solidity 0.8.6;

interface IRequesterStore {
    event ClientEndorsementStatusSet(
        address indexed requester,
        address indexed clientAddress,
        bool endorsementStatus
    );

    function setClientEndorsementStatus(
        address clientAddress,
        bool endorsementStatus
    ) external;

    function requesterToClientAddressToEndorsementStatus(
        address requester,
        address clientAddress
    ) external view returns (bool endorsementStatus);
}
