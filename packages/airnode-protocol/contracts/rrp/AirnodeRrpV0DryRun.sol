// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title Contract that complements Airnode request–response protocol (RRP) to
/// allow Airnode to estimate the gas required to execute a fulfillment
/// @dev Typically, contracts are built to revert when an external call they
/// make reverts. In contrast, AirnodeRrpV0 does not revert when the external
/// call during the fulfillment reverts, and instead fails gracefully by
/// emitting a `FailedRequest` event. This event signals to the future
/// invocations of the stateless Airnode to not retry the failed fulfillment.
/// Although this approach meets the intended purpose, it disables Airnode from
/// calling `eth_estimateGas` on `fulfill()` to estimate the gas amount that
/// will be used to execute a fulfillment successfully. Specifically, since
/// `eth_estimateGas` looks for the lowest gas limit that results in the
/// transaction not reverting, and AirnodeRrpV0's `fulfill()` does not revert
/// when its external call reverts (because it runs out of gas),
/// `eth_estimateGas` will not necessarily return a gas amount that will result
/// in the fulfillment to be successful even if such an amount exists.
/// As a solution, Airnode calls `eth_estimateGas` on AirnodeRrpV0DryRun's
/// `fulfill()` and the external call of the fulfillment, and add these up to
/// find the gas limit required to execute a successful fulfillment. This
/// sum is an overestimation of the actual requirement, as it includes an
/// additional base fee (21,000 gas on Ethereum).
contract AirnodeRrpV0DryRun
{
    using ECDSA for bytes32;

    event FulfilledRequest(
        address indexed airnode,
        bytes32 indexed requestId,
        bytes data
    );

    /// @dev This mapping is kept as it is in AirnodeRrpV0 to closely simulate
    /// the fulfillment. All of its keys will map to zero values.
    mapping(bytes32 => bytes32) private requestIdToFulfillmentParameters;

    /// @notice Used by Airnode to estimate the gas amount needed to fulfill
    /// the request (excluding the external call). Do not call this function,
    /// as it will have no practical effect.
    /// @dev Refer to AirnodeRrpV0's `fulfill()` for more information
    /// @param requestId Request ID
    /// @param airnode Airnode address
    /// @param data Fulfillment data
    /// @param fulfillAddress Address that will be called to fulfill
    /// @param fulfillFunctionId Signature of the function that will be called
    /// to fulfill
    /// @return callSuccess If the fulfillment call succeeded
    /// @return callData Data returned by the fulfillment call (if there is
    /// any)
    function fulfill(
        bytes32 requestId,
        address airnode,
        address fulfillAddress,
        bytes4 fulfillFunctionId,
        bytes calldata data,
        bytes calldata signature
    ) external returns (bool callSuccess, bytes memory callData) {
        // The line below is kept the same, except that the condition is
        // reversed to ensure that it never reverts. All
        // `requestIdToFulfillmentParameters` values are zero and virtually no
        // `keccak256()` output will be equal to that.
        require(
            keccak256(
                abi.encodePacked(
                    airnode,
                    msg.sender,
                    fulfillAddress,
                    fulfillFunctionId
                )
            ) != requestIdToFulfillmentParameters[requestId],
            "Dummy revert string"
        );
        // The line below does not need to be modified
        require(
            (
                keccak256(abi.encodePacked(requestId, data))
                    .toEthSignedMessageHash()
            ).recover(signature) == airnode,
            "Invalid signature"
        );
        // We cannot call `fulfillAddress` below because (1) we do not want
        // this function to actually fulfill the request (2) the fulfill
        // function will be behind an `onlyAirnodeRrp` modifier and will reject
        // the calls from AirnodeRrpV0DryRun.
        // Instead, we call an address that we know to not contain any
        // bytecode, which will result in the call to not revert or spend extra
        // gas. Since we have already confirmed that `airnode` has signed a
        // hash, it is guaranteed to be an EOA and we can use it as a dummy
        // call target.
        (callSuccess, callData) = airnode.call( // solhint-disable-line avoid-low-level-calls
            abi.encodeWithSelector(fulfillFunctionId, requestId, data)
        );
        // If the external call above does not succeed, the `eth_estimateGas`
        // called on the external call will not be able to return a gas amount.
        // AirnodeRrpV0DryRun's `fulfill()` optimistically estimates the
        // AirnodeRrpV0 overhead of a fulfillment, and expects Airnode to
        // detect if the external call will succeed (by calling
        // `eth_estimateGas` on it) independently. Therefore, we do not need to
        // consider the unhappy path here.
        if (callSuccess) {
            emit FulfilledRequest(airnode, requestId, data);
        }
    }
}
