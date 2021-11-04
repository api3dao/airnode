// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface IAirnodeTokenPayment {
    event SetPaymentTokenPrice(
        uint256 paymentTokenPrice,
        address indexed paymentTokenPriceSetter
    );

    event SetAirnodeToWhitelistDuration(
        uint256 whitelistDuration,
        address indexed airnodeToWhitelistDurationSetter
    );

    event SetAirnodeToPaymentDestination(
        address indexed paymentAddress,
        address indexed airnodeToPaymentDestinationSetter
    );

    event MadePayment(
        uint256 chainId,
        address indexed airnode,
        bytes32 indexed endpointId,
        address indexed requesterAddress,
        address sponsor,
        address paymentAddress,
        uint256 paymentAmount,
        string paymentTokenSymbol,
        uint256 expirationTimestamp
    );

    function DEFAULT_WHITELIST_DURATION() external view returns (uint64);

    function paymentTokenAddress() external view returns (address);

    function paymentTokenPrice() external view returns (uint256);

    function airnodeToWhitelistDuration(address airnode)
        external
        view
        returns (uint64);

    function airnodeToPaymentDestination(address airnode)
        external
        view
        returns (address paymentDestination);

    function setPaymentTokenPrice(uint256 tokenPrice) external;

    function setAirnodeToWhitelistDuration(uint64 WhitelistDuration) external;

    function setAirnodeToPaymentDestination(address paymentAddress) external;

    function makePayment(
        uint256 chainId,
        address airnode,
        bytes32 endpointId,
        address requesterAddress,
        uint64 whitelistDuration
    ) external;

    function getPaymentAmount(
        uint256 chainId,
        address airnode,
        bytes32 endpointId,
        uint64 whitelistDuration
    ) external view returns (uint256 amount);
}
