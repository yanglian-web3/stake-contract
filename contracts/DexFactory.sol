// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// 合并的 DEX 工厂和 Pair 合约
contract DexFactory {
    address public feeTo;
    address public feeToSetter;

    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;

    event PairCreated(address indexed token0, address indexed token1, address pair, uint);

    constructor(address _feeToSetter) {
        feeToSetter = _feeToSetter;
    }

    function createPair(address tokenA, address tokenB) external returns (address pair) {
        require(tokenA != tokenB, "IDENTICAL_ADDRESSES");
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), "ZERO_ADDRESS");
        require(getPair[token0][token1] == address(0), "PAIR_EXISTS");

        // 部署新的 Pair 合约
        DexPair newPair = new DexPair();
        newPair.initialize(token0, token1);
        pair = address(newPair);

        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair;
        allPairs.push(pair);

        emit PairCreated(token0, token1, pair, allPairs.length);
        return pair;
    }
}

// Pair 合约
contract DexPair {
    address public token0;
    address public token1;
    uint public reserve0;
    uint public reserve1;

    function initialize(address _token0, address _token1) external {
        require(token0 == address(0), "ALREADY_INITIALIZED");
        token0 = _token0;
        token1 = _token1;
    }

    function getReserves() external view returns (uint, uint) {
        return (reserve0, reserve1);
    }
}