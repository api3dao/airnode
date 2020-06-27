// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;

import "./Client.sol";


contract RequesterStore {
    // Don't use struct if Requester ends up having a single field
    struct Requester {
        address admin;
    }

    mapping(bytes32 => Requester) internal requesters;
    mapping(address => bytes32) internal contractRequesterIds;
    uint256 private noRequester = 0;

    event RequesterCreated(bytes32 indexed id);
    event RequesterUpdated(bytes32 indexed id);

    function createRequester(
        address admin
        )
        external
        returns (bytes32 requesterId)
    {
        requesterId = keccak256(abi.encodePacked(noRequester++, this));
        requesters[requesterId] = Requester({
            admin: admin
        });
        emit RequesterCreated(requesterId);
    }

    function updateRequesterAdmin(
        bytes32 requesterId,
        address admin
        )
        external
        onlyRequesterAdmin(requesterId)
    {
        requesters[requesterId].admin = admin;
        emit RequesterUpdated(requesterId);
    }

    function updateContractRequesterId(
        bytes32 requesterId,
        address contractAddress
        )
        external
        onlyRequesterAdmin(requesterId)
        onlyIfContractRequesterMatches(requesterId, contractAddress)
    {
        contractRequesterIds[contractAddress] = requesterId;
    }

    function getRequester(bytes32 requesterId)
        external
        view
        returns (
            address admin
        )
    {
        admin = requesters[requesterId].admin;
    }

    function getContractRequesterId(address contractAddress)
        external
        view
        returns (bytes32 requesterId)
    {
        requesterId = contractRequesterIds[contractAddress];
    }

    modifier onlyRequesterAdmin(bytes32 requesterId)
    {
        require(
            msg.sender == requesters[requesterId].admin,
            "Caller is not the requester admin"
        );
        _;
    }

    modifier onlyIfContractRequesterMatches(
        bytes32 requesterId,
        address contractAddress
        )
    {
        Client client = Client(contractAddress);
        require(
            client.requesterId() == requesterId,
            "Client contract Requester ID does not match"
            );
        _;
    }
}
