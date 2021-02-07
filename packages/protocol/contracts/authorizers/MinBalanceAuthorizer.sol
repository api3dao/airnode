// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import "./interfaces/IMinBalanceAuthorizer.sol";
import "../interfaces/IAirnode.sol";


/// @title The authorizer contract that checks if the designated wallet to be
/// used to fulfill a request has more than minBalance
/// @dev Airnode will first make an API call, then attempt to fulfill the
/// respective request. This means that if the designatedWallet that will
/// fulfill the request does not have enough funds, the API call will have been
/// made for nothing, and this will be repeated until the request leaves the
/// scope of the node. By using this authorizer and setting a minBalance (e.g.,
/// 0.1 ETH), the provider can choose to ignore requests that will be fulfilled
/// by designatedWallets with balances less than minBalance.
contract MinBalanceAuthorizer is IMinBalanceAuthorizer {
    IAirnode public airnode;
    uint256 public immutable authorizerType = 1;
    mapping(bytes32 => uint256) private providerIdToMinBalance;


    /// @param _airnode Address of the Airnode contract
    constructor (address _airnode)
        public
    {
        airnode = IAirnode(_airnode);
    }

    /// @notice Updates the provider-specific minBalance
    /// @param providerId Provider ID from ProviderStore
    /// @param minBalance The minimum balance a designatedWallet has to have
    /// for the provider to process requests that will be fulfilled by that
    /// designatedWallet
    function updateMinBalance(
        bytes32 providerId,
        uint256 minBalance
        )
        external
        override
    {
        (address admin, , ) = airnode.getProvider(providerId);  // solhint-disable-line
        require(msg.sender == admin, "Caller is not provider admin");
        providerIdToMinBalance[providerId] = minBalance;
        emit MinBalanceUpdated(providerId, minBalance);
    }

    /// @notice Verifies the authorization status of a request according to
    /// the balance of designatedWallet
    /// @param requestId Request ID
    /// @param providerId Provider ID from ProviderStore
    /// @param endpointId Endpoint ID from EndpointStore
    /// @param requesterIndex Requester index from RequesterStore
    /// @param designatedWallet Designated wallet
    /// @param clientAddress Client address
    /// @return status Authorization status of the request
    function checkIfAuthorized(
        bytes32 requestId,    // solhint-disable-line
        bytes32 providerId,
        bytes32 endpointId,   // solhint-disable-line
        uint256 requesterIndex, // solhint-disable-line
        address designatedWallet,
        address clientAddress // solhint-disable-line
        )
        virtual
        external
        view
        override
        returns (bool status)
    {
        return designatedWallet.balance >= providerIdToMinBalance[providerId];
    }
}
