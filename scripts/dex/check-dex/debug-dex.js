// scripts/debug-dex.js
const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 深度调试DEX合约\n");

    const provider = ethers.provider;
    const routerAddress = "0x5c74c94173F05dA1720953407cbb920F3DF9f887";

    // 1. 获取合约字节码并分析
    const code = await provider.getCode(routerAddress);
    console.log(`1. 合约分析:`);
    console.log(`   字节码长度: ${code.length} 字节`);
    console.log(`   是否是代理合约: ${code.includes('363d3d373d3d3d363d73') ? '可能是' : '不是'}`);

    // 2. 尝试获取函数选择器
    console.log(`\n2. 尝试读取合约接口...`);

    const testSelectors = {
        // 常见Uniswap函数的选择器
        "factory()": "0xc45a0155",
        "WETH()": "0xad5c4648",
        "getAmountsOut(uint256,address[])": "0xd06ca61f",
        "swapExactTokensForTokens": "0x38ed1739"
    };

    for (const [func, selector] of Object.entries(testSelectors)) {
        try {
            const result = await provider.call({
                to: routerAddress,
                data: selector
            });
            console.log(`   ${func}: ${result !== '0x' ? '✅ 响应' : '❌ 无响应'}`);
        } catch (e) {
            console.log(`   ${func}: ❌ 失败`);
        }
    }

    // 3. 检查是否是Mock合约
    console.log(`\n3. 检查合约类型:`);

    // MockDexRouter通常较小，UniswapV2Router02较大
    if (code.length < 15000) {
        console.log(`   ⚠️  合约较小(${code.length}字节)，可能是MockDexRouter`);
        console.log(`   建议: 确保部署的是完整的UniswapV2Router02`);
    } else if (code.length > 20000) {
        console.log(`   ✅ 合约较大(${code.length}字节)，可能是真正的UniswapV2Router02`);
    }

    // 4. 建议的修复步骤
    console.log(`\n4. 建议:`);
    console.log(`   a. 检查 UniswapV2Router02.sol 文件是否正确`);
    console.log(`   b. 重新编译: npx hardhat compile`);
    console.log(`   c. 重新部署DEX部分`);
    console.log(`   d. 或使用这个简化测试:`);

    console.log(`
// 简化测试脚本
const simpleTest = async () => {
    const router = await ethers.getContractAt("UniswapV2Router02", "${routerAddress}");
    
    try {
        console.log("Testing factory()...");
        const factory = await router.factory();
        console.log("Factory address:", factory);
        
        console.log("\\nTesting WETH()...");
        const weth = await router.WETH();
        console.log("WETH address:", weth);
        
        console.log("\\n✅ DEX路由器工作正常");
    } catch (error) {
        console.log("❌ 路由器有问题:", error.message);
    }
};
    `);
}

main().catch(console.error);