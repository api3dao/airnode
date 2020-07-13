// SPDX-License-Identifier: MIT
pragma solidity 0.6.8;

import "./RequesterStore.sol";


/// @title The contract where templates used to make batch requests are stored
/// @notice The most common use case where batch requests are going to be used
/// are aggregator rounds. However, they can be used to conserve gas in any
/// use case where multiple requests are needed to be made simultaneously.
/// The oracles only listen for batch requests that they are configured to,
/// so the requester cannot use batch requests to spam.
contract BatchStore is RequesterStore {
    // In BatchRequest, providerIds or templateIds contents do not have to be
    // unique
    struct Batch {
        bytes32 requesterId;
        bytes32[] providerIds;
        bytes32[] templateIds;
        }

    mapping(bytes32 => Batch) internal batches;
    uint256 private noBatches = 0;

    event BatchCreated(
        bytes32 indexed id,
        bytes32 requesterId,
        bytes32[] providerIds,
        bytes32[] templateIds
        );

    event BatchUpdated(
        bytes32 indexed id,
        bytes32 requesterId,
        bytes32[] providerIds,
        bytes32[] templateIds
        );

    /// @notice Creates a batch of provider-template pairs, addressable by the
    /// ID it returns
    /// @param requesterId Requester ID from RequesterStore
    /// @param providerIds Provider IDs from ProviderStore
    /// @param templateIds Template IDs from TemplateStore
    /// @return batchId Batch ID
    function createBatch(
        bytes32 requesterId,
        bytes32[] calldata providerIds,
        bytes32[] calldata templateIds
        )
        external
        returns (bytes32 batchId)
    {
        batchId = keccak256(abi.encodePacked(
            noBatches++,
            this,
            msg.sender,
            uint256(4)
            ));
        batches[batchId] = Batch({
            requesterId: requesterId,
            providerIds: providerIds,
            templateIds: templateIds
        });
        emit BatchCreated(
            batchId,
            requesterId,
            providerIds,
            templateIds
            );
    }

    /// @notice Updates the provider-template pairs of a batch request
    /// @dev Does not update requesterId, similar how EndpointStore does not
    /// allow providerId to be updated
    /// @param batchId Batch ID
    /// @param requesterId Requester ID from RequesterStore
    /// @param providerIds Provider IDs from ProviderStore
    /// @param templateIds Template IDs from TemplateStore
    function updateBatch(
        bytes32 batchId,
        bytes32 requesterId,
        bytes32[] calldata providerIds,
        bytes32[] calldata templateIds
        )
        external
        onlyRequesterAdmin(requesterId)
    {
        batches[batchId].providerIds = providerIds;
        batches[batchId].templateIds = templateIds;
        emit BatchUpdated(
            batchId,
            requesterId,
            providerIds,
            templateIds
            );
    }
}
