// scripts/minimal-dex-test.js
const { ethers } = require("hardhat");

async function main() {
    const routerAddress = "0x5c74c94173F05dA1720953407cbb920F3DF9f887";

    // 直接使用hardhat的ethers实例
    const router = await ethers.getContractAt("UniswapV2Router02", routerAddress);

    console.log("🧪 最小化DEX测试...");

    try {
        // 测试1: 基本函数
        const factory = await router.factory();
        console.log(`✅ factory(): ${factory}`);

        const weth = await router.WETH();
        console.log(`✅ WETH(): ${weth}`);

        // 测试2: 简单getAmountsOut（使用任何地址）
        const dummyPath = [
            "0x0000000000000000000000000000000000000001",
            "0x0000000000000000000000000000000000000002"
        ];

        try {
            const amounts = await router.getAmountsOut(ethers.parseEther("1"), dummyPath);
            console.log(`✅ getAmountsOut() 函数存在`);
            console.log(`   返回数组长度: ${amounts.length}`);
        } catch (e) {
            console.log(`⚠️  getAmountsOut() 失败（预期中）: ${e.message}`);
        }

        console.log("\n🎉 DEX路由器合约接口正确！");

    } catch (error) {
        console.log("❌ 路由器测试失败:", error.message);
        console.log("\n可能原因:");
        console.log("1. 合约名称不匹配 - 确保部署的是 UniswapV2Router02");
        console.log("2. ABI不匹配 - 尝试使用更简单的ABI");
        console.log("3. 合约代码有问题 - 重新编译部署");
    }
}

main().catch(console.error);