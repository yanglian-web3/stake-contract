// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SimplePriceOracle {
    address public factory;

    struct PriceInfo {
        uint price; // price of tokenA in terms of tokenB (with 18 decimals)
        uint timestamp;
    }

    mapping(address => mapping(address => PriceInfo)) public prices;

    constructor(address _factory) {
        factory = _factory;
    }

    function updatePrice(address tokenA, address tokenB, uint price) external {
        prices[tokenA][tokenB] = PriceInfo(price, block.timestamp);
        prices[tokenB][tokenA] = PriceInfo(1e36 / price, block.timestamp); // 反向价格
    }

    function getPrice(address tokenA, address tokenB) external view returns (uint) {
        PriceInfo memory info = prices[tokenA][tokenB];
        require(info.timestamp > 0, "PRICE_NOT_SET");
        return info.price;
    }
}