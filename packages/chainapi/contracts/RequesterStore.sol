// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;

import "./interfaces/RequesterStoreInterface.sol";
import "./interfaces/ClientInterface.sol";


/// @title The contract where the requesters are stored
/// @notice Requesters first get recorded here and get assigned an ID. Then,
/// they get a wallet reserved at ProviderStore with that Requester ID.
/// The contracts that the requester deploys are called clients. The requester
/// can authorize its client contracts to be served by the wallet they have
/// reserved and funded, which is referred to as endorsing the client. In other
/// words, an endorser is a requester that pays for the gas costs of a client
/// contract's oracle requests.
contract RequesterStore is RequesterStoreInterface {
    mapping(bytes32 => address) internal requesterIdToAdmin;
    mapping(address => bytes32) private clientAdressToRequesterId;
    uint256 private noRequesters = 0;


    /// @notice Creates a provider with the given parameters, addressable by
    /// the ID it returns
    /// @param admin Admin address of the requester
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
            uint256(3)
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

    /// @notice Called by the requester admin to allow a client contract to use
    /// its wallets
    /// @dev This also requires the client contract to announce the requester
    /// under the parameter requesterId
    /// @param requesterId Requester ID
    /// @param clientAddress Client contract address
    function endorseClient(
        bytes32 requesterId,
        address clientAddress
        )
        external
        override
        onlyRequesterAdmin(requesterId)
    {
        ClientInterface client = ClientInterface(clientAddress);
        require(
            client.requesterId() == requesterId,
            "Client contract requester ID is different"
            );
        clientAdressToRequesterId[clientAddress] = requesterId;
        emit ClientEndorsed(
            requesterId,
            clientAddress
            );
    }

    /// @notice Called by the requester admin to disallow a client contract
    /// from using its wallets
    /// @dev This is one-sided, meaning that it does not require permission
    /// from the client contract. It requires the caller to be the current
    /// endorser of the client contract.
    /// @param requesterId Requester ID
    /// @param clientAddress Client contract address
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

    /// @notice Retrieves the ID of the endorser of a client contract
    /// @param clientAddress Client contract address
    /// @return requesterId Requester ID
    function getClientRequesterId(address clientAddress)
        external
        view
        override
        returns (bytes32 requesterId)
    {
        requesterId = clientAdressToRequesterId[clientAddress];
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
