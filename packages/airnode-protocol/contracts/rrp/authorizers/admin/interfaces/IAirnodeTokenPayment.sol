// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

interface IAirnodeTokenPayment {
    event SetPaymentTokenPrice(
        uint256 paymentTokenPrice,
        address indexed paymentTokenPriceSetter
    );

    event SetAirnodeFeeRegistry(
        address indexed airnodeFeeRegistry,
        address indexed airnodeFeeRegistrySetter
    );

    event SetAirnodeAuthorizerRegistry(
        address indexed airnodeAuthorizerRegistry,
        address indexed airnodeAuthorizerRegistrySetter
    );

    event SetMaximumWhitelistDuration(
        uint256 maximumWhitelistDuration,
        address indexed maximumWhitelistDurationSetter
    );

    event SetAirnodeToPaymentDestination(
        address indexed airnode,
        address indexed paymentAddress
    );

    event MadePayment(
        uint256 chainId,
        address indexed airnode,
        bytes32 indexed endpointId,
        address indexed requesterAddress,
        address sponsor,
        address paymentAddress,
        uint256 paymentAmount,
        uint256 expirationTimestamp
    );

    function paymentTokenAddress() external view returns (address);

    function paymentTokenPrice() external view returns (uint256);

    function airnodeAuthorizerRegistry() external view returns (address);

    function airnodeFeeRegistry() external view returns (address);

    function maximumWhitelistDuration() external view returns (uint256);

    function airnodeToPaymentDestination(address airnode)
        external
        view
        returns (address paymentDestination);

    function setPaymentTokenPrice(uint256 tokenPrice) external;

    function setAirnodeAuthorizerRegistry(address airnodeAuthorizerRegistry)
        external;

    function setAirnodeFeeRegistry(address airnodeFeeRegistry) external;

    function setMaximumWhitelistDuration(uint256 maximumWhitelistDuration)
        external;

    function setAirnodeToPaymentDestination(address paymentAddress) external;

    function makePayment(
        address token,
        uint256 chainId,
        address airnode,
        bytes32 endpointId,
        address requesterAddress,
        uint256 whitelistDuration
    ) external;

    function getTokenPaymentAmount(
        address token,
        uint256 chainId,
        address airnode,
        bytes32 endpointId,
        uint256 whitelistDuration
    ) external view returns (uint256 amount);
}
