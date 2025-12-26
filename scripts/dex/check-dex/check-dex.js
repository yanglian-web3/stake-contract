// scripts/check-dex.js - 修复版
const { ethers } = require("hardhat");

async function main() {
    const provider = new ethers.JsonRpcProvider("http://localhost:8545");

    // 使用真正部署的地址
    const routerAddress = "0x5c74c94173F05dA1720953407cbb920F3DF9f887";

    console.log("🔍 检查 DEX 路由器合约...");
    console.log("地址:", routerAddress);

    // 检查是否有合约代码
    const code = await provider.getCode(routerAddress);
    console.log("合约代码长度:", code.length, "字节");

    if (code === "0x") {
        console.error("❌ 地址上没有合约！");
        return;
    }

    console.log("✅ 地址上有合约代码");

    // 扩展的ABI用于更多测试
    const routerABI = [
        "function factory() view returns (address)",
        "function WETH() view returns (address)",
        "function getAmountsOut(uint amountIn, address[] memory path) view returns (uint[] memory amounts)",
        "function getAmountsIn(uint amountOut, address[] memory path) view returns (uint[] memory amounts)"
    ];

    try {
        const router = new ethers.Contract(routerAddress, routerABI, provider);

        // 先测试基本功能
        console.log("\n1. 测试基础DEX功能...");

        try {
            const factoryAddress = await router.factory();
            console.log(`✅ factory(): ${factoryAddress}`);

            const wethAddress = await router.WETH();
            console.log(`✅ WETH(): ${wethAddress}`);
        } catch (error) {
            console.log(`⚠️  基础功能测试失败: ${error.message}`);
        }

        // 2. 使用真正的代币地址测试（从您的部署输出）
        console.log("\n2. 测试 getAmountsOut 使用真实代币...");

        // 这些是您部署的真实代币地址
        const TOKEN_ADDRESSES = {
            MNT: "0x2E2Ed0Cfd3AD2f1d34481277b3204d807Ca2F8c2",      // MNT 代币
            USDC: "0xD8a5a9b31c3C0232E196d518E89Fd8bF83AcAd43",    // USDC 代币
            WETH: "0xf953b3A269d80e3eB0F2947630Da976B896A8C5b"     // WETH 代币
        };

        // 测试路径1: MNT -> USDC
        console.log("\n测试路径: MNT -> USDC");
        const path1 = [TOKEN_ADDRESSES.MNT, TOKEN_ADDRESSES.USDC];
        const amount1 = ethers.parseEther("1"); // 1 MNT

        try {
            const amounts1 = await router.getAmountsOut(amount1, path1);
            console.log(`✅ MNT -> USDC 兑换:`);
            console.log(`   输入: ${ethers.formatEther(amounts1[0])} MNT`);
            console.log(`   输出: ${ethers.formatUnits(amounts1[1], 6)} USDC`);
        } catch (error) {
            console.log(`❌ MNT->USDC 失败: ${error.message}`);

            // 可能是流动性不足，测试简单路径
            console.log("\n尝试使用简单路径测试...");
            try {
                // 使用恒定乘积公式测试
                const simpleAmount = ethers.parseEther("0.001"); // 小金额
                const simpleAmounts = await router.getAmountsOut(simpleAmount, path1);
                console.log(`✅ 小金额测试成功:`);
                console.log(`   输入: ${ethers.formatEther(simpleAmounts[0])} MNT`);
                console.log(`   输出: ${ethers.formatUnits(simpleAmounts[1], 6)} USDC`);
            } catch (simpleError) {
                console.log(`❌ 简单测试也失败: ${simpleError.message}`);
            }
        }

        // 测试路径2: MNT -> WETH
        console.log("\n测试路径: MNT -> WETH");
        const path2 = [TOKEN_ADDRESSES.MNT, TOKEN_ADDRESSES.WETH];
        const amount2 = ethers.parseEther("1"); // 1 MNT

        try {
            const amounts2 = await router.getAmountsOut(amount2, path2);
            console.log(`✅ MNT -> WETH 兑换:`);
            console.log(`   输入: ${ethers.formatEther(amounts2[0])} MNT`);
            console.log(`   输出: ${ethers.formatEther(amounts2[1])} WETH`);
        } catch (error) {
            console.log(`❌ MNT->WETH 失败: ${error.message}`);
        }

        // 3. 反向测试：USDC -> MNT
        console.log("\n3. 测试反向兑换: USDC -> MNT");
        const path3 = [TOKEN_ADDRESSES.USDC, TOKEN_ADDRESSES.MNT];
        const amount3 = ethers.parseUnits("1", 6); // 1 USDC

        try {
            const amounts3 = await router.getAmountsOut(amount3, path3);
            console.log(`✅ USDC -> MNT 兑换:`);
            console.log(`   输入: ${ethers.formatUnits(amounts3[0], 6)} USDC`);
            console.log(`   输出: ${ethers.formatEther(amounts3[1])} MNT`);
        } catch (error) {
            console.log(`❌ USDC->MNT 失败: ${error.message}`);
        }

        // 4. 检查交易对状态
        console.log("\n4. 检查交易对状态...");

        // 获取工厂合约
        const factoryABI = ["function getPair(address tokenA, address tokenB) view returns (address pair)"];
        const factoryAddress = await router.factory();
        const factory = new ethers.Contract(factoryAddress, factoryABI, provider);

        const pairAddress = await factory.getPair(TOKEN_ADDRESSES.MNT, TOKEN_ADDRESSES.USDC);
        console.log(`MNT/USDC 交易对地址: ${pairAddress}`);

        if (pairAddress === ethers.ZeroAddress) {
            console.log("⚠️  交易对不存在或未创建");
        } else {
            const pairCode = await provider.getCode(pairAddress);
            console.log(`交易对合约代码: ${pairCode.length > 2 ? "✅ 存在" : "❌ 不存在"}`);
        }

    } catch (error) {
        console.error("❌ DEX 测试失败:", error.message);
        console.log("\n🔍 调试信息:");
        console.log("合约代码前100字符:", code.slice(0, 200));

        // 检查是否是Mock合约
        if (code.length < 10000) {
            console.log("⚠️  这可能是MockDexRouter而不是真正的UniswapV2Router02");
        }
    }
}

main().catch(console.error);