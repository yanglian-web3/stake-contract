// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

contract MiniDEX {
    address public tokenA;
    address public tokenB;

    // 储备量
    uint256 public reserveA;
    uint256 public reserveB;

    event Swap(
        address indexed sender,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );

    event LiquidityAdded(
        address indexed provider,
        uint256 amountA,
        uint256 amountB
    );

    event LiquidityRemoved(
        address indexed provider,
        uint256 amountA,
        uint256 amountB
    );

    constructor(address _tokenA, address _tokenB) {
        tokenA = _tokenA;
        tokenB = _tokenB;
    }

    // 添加流动性
    function addLiquidity(uint256 amountA, uint256 amountB) external {
        require(amountA > 0 && amountB > 0, "Amount must be > 0");

        // 转账代币
        IERC20(tokenA).transferFrom(msg.sender, address(this), amountA);
        IERC20(tokenB).transferFrom(msg.sender, address(this), amountB);

        // 更新储备量
        reserveA += amountA;
        reserveB += amountB;

        emit LiquidityAdded(msg.sender, amountA, amountB);
    }

    // 移除流动性
    function removeLiquidity(uint256 amountA, uint256 amountB) external {
        require(amountA <= reserveA && amountB <= reserveB, "Insufficient liquidity");

        // 转账代币回用户
        IERC20(tokenA).transfer(msg.sender, amountA);
        IERC20(tokenB).transfer(msg.sender, amountB);

        // 更新储备量
        reserveA -= amountA;
        reserveB -= amountB;

        emit LiquidityRemoved(msg.sender, amountA, amountB);
    }

    // 计算输出金额（恒定乘积公式）
    function getAmountOut(uint256 amountIn, address fromToken) public view returns (uint256) {
        require(amountIn > 0, "Amount must be > 0");
        require(reserveA > 0 && reserveB > 0, "Insufficient liquidity");

        if (fromToken == tokenA) {
            // A -> B
            uint256 amountInWithFee = amountIn * 997 / 1000; // 0.3% 手续费
            return (amountInWithFee * reserveB) / (reserveA + amountInWithFee);
        } else {
            // B -> A
            uint256 amountInWithFee = amountIn * 997 / 1000; // 0.3% 手续费
            return (amountInWithFee * reserveA) / (reserveB + amountInWithFee);
        }
    }

    // 交换代币
    function swap(uint256 amountIn, address fromToken, uint256 minAmountOut) external returns (uint256) {
        require(amountIn > 0, "Amount must be > 0");

        address toToken = fromToken == tokenA ? tokenB : tokenA;
        uint256 amountOut = getAmountOut(amountIn, fromToken);

        require(amountOut >= minAmountOut, "Slippage too high");

        // 转账输入代币
        IERC20(fromToken).transferFrom(msg.sender, address(this), amountIn);

        // 转账输出代币
        IERC20(toToken).transfer(msg.sender, amountOut);

        // 更新储备量
        if (fromToken == tokenA) {
            // A -> B
            reserveA += amountIn;
            reserveB -= amountOut;
        } else {
            // B -> A
            reserveB += amountIn;
            reserveA -= amountOut;
        }

        emit Swap(msg.sender, fromToken, toToken, amountIn, amountOut);
        return amountOut;
    }

    // 获取当前价格（1个 tokenA 值多少 tokenB）
    function getPrice() public view returns (uint256) {
        if (reserveA == 0 || reserveB == 0) return 0;
        return (reserveB * 1e18) / reserveA;
    }

    // 获取储备量信息
    function getReserves() public view returns (uint256, uint256) {
        return (reserveA, reserveB);
    }
}