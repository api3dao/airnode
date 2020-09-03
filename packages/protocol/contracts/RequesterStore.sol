// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;

import "./interfaces/IRequesterStore.sol";


/// @title The contract where the requesters are stored
/// @notice This contract is used by requesters to manage their endorsemenets.
/// The requester first gets a wallet designated from a provider through
/// ProviderStore. This wallet is used to fulfill requests made by clients
/// endorsed by the requester. This is the contract where clients allow
/// requesters to endorse them and requesters endorse or disendorse clients.
contract RequesterStore is IRequesterStore {
    mapping(bytes32 => address) internal requesterIdToAdmin;
    mapping(address => bytes32) private endorsementPermissions;
    mapping(address => bytes32) private clientAdressToRequesterId;
    uint256 private noRequesters = 0;


    /// @notice Creates a requester with the given parameters, addressable by
    /// the ID it returns
    /// @param admin Requester admin
    /// @return requesterId Requester ID
    function createRequester(address admin)
        external
        override
        returns (bytes32 requesterId)
    {
        requesterId = keccak256(abi.encodePacked(
            noRequesters++,
            this,
            msg.sender,
            uint256(4)
            ));
        requesterIdToAdmin[requesterId] = admin;
        emit RequesterCreated(
            requesterId,
            admin
            );
    }

    /// @notice Updates the requester admin
    /// @param requesterId Requester ID
    /// @param admin Requester admin
    function updateRequesterAdmin(
        bytes32 requesterId,
        address admin
        )
        external
        override
        onlyRequesterAdmin(requesterId)
    {
        requesterIdToAdmin[requesterId] = admin;
        emit RequesterUpdated(
            requesterId,
            admin
            );
    }

    /// @notice Called by the client to permit a requester to endorse it
    /// @dev Client can be a wallet or a contract.
    /// @param requesterId Requester ID
    function updateEndorsementPermission(bytes32 requesterId)
        external
        override
    {
        endorsementPermissions[msg.sender] = requesterId;
    }

    /// @notice Called by the requester admin to allow a client to use its
    /// designated wallets
    /// @dev This is not provider specific, i.e., the requester allows the
    /// client's requests to be fulfilled through its designated wallets across
    /// all providers
    /// @param requesterId Requester ID
    /// @param clientAddress Client address
    function endorseClient(
        bytes32 requesterId,
        address clientAddress
        )
        external
        override
        onlyRequesterAdmin(requesterId)
    {
        require(
            endorsementPermissions[clientAddress] == requesterId,
            "Client has not permitted this requester to endorse it"
            );
        clientAdressToRequesterId[clientAddress] = requesterId;
        emit ClientEndorsed(
            requesterId,
            clientAddress
            );
    }

    /// @notice Called by the requester admin to disallow a client from using
    /// its designated wallets
    /// @dev This is one-sided, meaning that it does not require permission
    /// from the client. It requires the caller to be the current
    /// endorser of the client.
    /// @param requesterId Requester ID
    /// @param clientAddress Client address
    function disendorseClient(
        bytes32 requesterId,
        address clientAddress
        )
        external
        override
        onlyRequesterAdmin(requesterId)
    {
        require(
            clientAdressToRequesterId[clientAddress] == requesterId,
            "Caller is not the endorser of the client"
            );
        clientAdressToRequesterId[clientAddress] = 0;
        emit ClientDisendorsed(
            requesterId,
            clientAddress
            );
    }

    /// @notice Retrieves the requester admin
    /// @param requesterId Requester ID
    /// @return admin Requester admin
    function getRequesterAdmin(bytes32 requesterId)
        external
        view
        override
        returns (address admin)
    {
        admin = requesterIdToAdmin[requesterId];
    }

    /// @notice Retrieves the ID of the endorser of a client
    /// @param clientAddress Client address
    /// @return requesterId Requester ID
    function getClientRequesterId(address clientAddress)
        external
        view
        override
        returns (bytes32 requesterId)
    {
        requesterId = clientAdressToRequesterId[clientAddress];
    }

    /// @notice Retrieves the ID of the requester the client has permitted to
    /// be its endorser
    /// @param clientAddress Client address
    /// @return requesterId Requester ID
    function getClientPermittedEndorser(address clientAddress)
        external
        view
        override
        returns (bytes32 requesterId)
    {
        requesterId = endorsementPermissions[clientAddress];
    }

    /// @dev Reverts if the caller is not the requester admin
    /// @param requesterId Requester ID
    modifier onlyRequesterAdmin(bytes32 requesterId)
    {
        require(
            msg.sender == requesterIdToAdmin[requesterId],
            "Caller is not the requester admin"
            );
        _;
    }
}
