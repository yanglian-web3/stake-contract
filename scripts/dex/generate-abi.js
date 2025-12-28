// scripts/dex/generate-abi.js
const fs = require('fs');

// MiniDEX ABI
const miniDexABI = [
    // 状态变量
    "function tokenA() view returns (address)",
    "function tokenB() view returns (address)",
    "function reserveA() view returns (uint256)",
    "function reserveB() view returns (uint256)",

    // 流动性操作
    "function addLiquidity(uint256 amountA, uint256 amountB) external",
    "function removeLiquidity(uint256 amountA, uint256 amountB) external",

    // 交换操作
    "function swap(uint256 amountIn, address fromToken, uint256 minAmountOut) external returns (uint256)",

    // 查询函数
    "function getAmountOut(uint256 amountIn, address fromToken) view returns (uint256)",
    "function getPrice() view returns (uint256)",
    "function getReserves() view returns (uint256, uint256)",

    // 事件
    "event Swap(address indexed sender, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut)",
    "event LiquidityAdded(address indexed provider, uint256 amountA, uint256 amountB)",
    "event LiquidityRemoved(address indexed provider, uint256 amountA, uint256 amountB)"
];

// MockERC20 ABI (主要函数)
const erc20ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address account) view returns (uint256)",
    "function transfer(address recipient, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function transferFrom(address sender, address recipient, uint256 amount) returns (bool)",

    // 事件
    "event Transfer(address indexed from, address indexed to, uint256 value)",
    "event Approval(address indexed owner, address indexed spender, uint256 value)"
];

// 保存 ABI 文件
fs.writeFileSync('mini-dex-abi.json', JSON.stringify(miniDexABI, null, 2));
fs.writeFileSync('erc20-abi.json', JSON.stringify(erc20ABI, null, 2));

console.log("✅ ABI 文件已生成:");
console.log("   - mini-dex-abi.json");
console.log("   - erc20-abi.json");