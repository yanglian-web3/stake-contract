// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockDexRouter {
    // 简化版的价格计算（恒定乘积公式 x * y = k）
    function getAmountOut(
        uint amountIn,
        uint reserveIn,
        uint reserveOut
    ) public pure returns (uint amountOut) {
        require(amountIn > 0, "INSUFFICIENT_INPUT_AMOUNT");
        require(reserveIn > 0 && reserveOut > 0, "INSUFFICIENT_LIQUIDITY");

        uint amountInWithFee = amountIn * 997; // 0.3% 手续费
        uint numerator = amountInWithFee * reserveOut;
        uint denominator = reserveIn * 1000 + amountInWithFee;
        amountOut = numerator / denominator;
    }

    // 模拟多路径兑换价格计算
    function getAmountsOut(uint amountIn, address[] memory path)
        public pure returns (uint[] memory amounts)
    {
        require(path.length >= 2, "INVALID_PATH");
        amounts = new uint[](path.length);
        amounts[0] = amountIn;

        // 简化的恒定乘积计算，假设每个池子有 1000:1000 的流动性
        for (uint i = 0; i < path.length - 1; i++) {
            // 假设每个代币对都有 1000 个代币的流动性
            amounts[i + 1] = getAmountOut(amounts[i], 1000 * 10**18, 1000 * 10**18);
        }
    }

    function getAmountsIn(uint amountOut, address[] memory path)
        public pure returns (uint[] memory amounts)
    {
        require(path.length >= 2, "INVALID_PATH");
        amounts = new uint[](path.length);
        amounts[path.length - 1] = amountOut;

        // 反向计算
        for (uint i = path.length - 1; i > 0; i--) {
            amounts[i - 1] = getAmountIn(amounts[i], 1000 * 10**18, 1000 * 10**18);
        }
    }

    function getAmountIn(
        uint amountOut,
        uint reserveIn,
        uint reserveOut
    ) public pure returns (uint amountIn) {
        require(amountOut > 0, "INSUFFICIENT_OUTPUT_AMOUNT");
        require(reserveIn > 0 && reserveOut > 0, "INSUFFICIENT_LIQUIDITY");

        uint numerator = reserveIn * amountOut * 1000;
        uint denominator = (reserveOut - amountOut) * 997;
        amountIn = numerator / denominator + 1; // 加1防止四舍五入
    }

    // 实际兑换函数（本地测试用简化版）
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts) {
        require(deadline >= block.timestamp, "EXPIRED");

        amounts = getAmountsOut(amountIn, path);
        require(amounts[amounts.length - 1] >= amountOutMin, "INSUFFICIENT_OUTPUT_AMOUNT");

        // 模拟转账（本地测试，实际不转账）
        emit Swap(msg.sender, amountIn, amounts[amounts.length - 1], path[0], path[path.length - 1], to);

        return amounts;
    }

    // ETH 兑换代币（本地测试用）
    function swapExactETHForTokens(
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external payable returns (uint[] memory amounts) {
        require(path[0] == address(0), "INVALID_PATH");
        require(deadline >= block.timestamp, "EXPIRED");

        uint amountIn = msg.value;
        amounts = getAmountsOut(amountIn, path);
        require(amounts[amounts.length - 1] >= amountOutMin, "INSUFFICIENT_OUTPUT_AMOUNT");

        emit Swap(msg.sender, amountIn, amounts[amounts.length - 1], address(0), path[path.length - 1], to);

        return amounts;
    }

    // 代币兑换 ETH（本地测试用）
    function swapExactTokensForETH(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts) {
        require(path[path.length - 1] == address(0), "INVALID_PATH");
        require(deadline >= block.timestamp, "EXPIRED");

        amounts = getAmountsOut(amountIn, path);
        require(amounts[amounts.length - 1] >= amountOutMin, "INSUFFICIENT_OUTPUT_AMOUNT");

        emit Swap(msg.sender, amountIn, amounts[amounts.length - 1], path[0], address(0), to);

        return amounts;
    }

    // 工厂函数占位符
    function factory() external pure returns (address) {
        return address(0);
    }

    event Swap(
        address indexed sender,
        uint amountIn,
        uint amountOut,
        address tokenIn,
        address tokenOut,
        address to
    );
}