// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;


interface IRequesterStore {
    event RequesterCreated(
        bytes32 indexed requesterId,
        address admin
        );

    event RequesterUpdated(
        bytes32 indexed requesterId,
        address admin
        );

    event ClientEndorsed(
        bytes32 indexed requesterId,
        address indexed clientAddress
        );

    event ClientDisendorsed(
        bytes32 indexed requesterId,
        address indexed clientAddress
        );

    function createRequester(address admin)
        external
        returns (bytes32 requesterId);

    function updateRequesterAdmin(
        bytes32 requesterId,
        address admin
        )
        external;

    function updateEndorsementPermission(bytes32 requesterId)
        external;

    function endorseClient(
        bytes32 requesterId,
        address clientAddress
        )
        external;

    function disendorseClient(
        bytes32 requesterId,
        address clientAddress
        )
        external;

    function getRequesterAdmin(bytes32 requesterId)
        external
        view
        returns (address admin);

    function getClientRequesterId(address clientAddress)
        external
        view
        returns (bytes32 requesterId);

    function getClientPermittedEndorser(address clientAddress)
        external
        view
        returns (bytes32 requesterId);
}