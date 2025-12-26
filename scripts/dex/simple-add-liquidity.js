// scripts/simple-add-liquidity.js
const { ethers } = require("hardhat");

async function main() {
    console.log("💧 简单添加流动性...\n");

    const [deployer] = await ethers.getSigners();
    console.log("部署者:", deployer.address);

    // 地址
    const ADDRESSES = {
        router: "0x5c74c94173F05dA1720953407cbb920F3DF9f887",
        mnt: "0x2E2Ed0Cfd3AD2f1d34481277b3204d807Ca2F8c2",
        usdc: "0xD8a5a9b31c3C0232E196d518E89Fd8bF83AcAd43",
        pair: "0x8C9Aa4B3c81f8ea247758918cCDE56AdE6E7f067"
    };

    // 1. 检查并铸造USDC（如果需要）
    console.log("1. 准备代币...");
    const usdcToken = await ethers.getContractAt("ERC20Mock", ADDRESSES.usdc);
    const usdcBalance = await usdcToken.balanceOf(deployer.address);

    if (usdcBalance < ethers.parseUnits("1000", 6)) {
        console.log("   铸造USDC...");
        await usdcToken.mint(deployer.address, ethers.parseUnits("10000", 6));
        console.log(`   USDC余额: ${ethers.formatUnits(await usdcToken.balanceOf(deployer.address), 6)}`);
    }

    // 2. 直接向交易对转账（绕过路由器）
    console.log("\n2. 直接向交易对添加流动性...");

    const mntToken = await ethers.getContractAt("ERC20Mock", ADDRESSES.mnt);

    // 转账到交易对
    const mntAmount = ethers.parseEther("1000");
    const usdcAmount = ethers.parseUnits("500", 6);

    console.log(`   转账 ${ethers.formatEther(mntAmount)} MNT 到交易对...`);
    const tx1 = await mntToken.transfer(ADDRESSES.pair, mntAmount);
    await tx1.wait();

    console.log(`   转账 ${ethers.formatUnits(usdcAmount, 6)} USDC 到交易对...`);
    const tx2 = await usdcToken.transfer(ADDRESSES.pair, usdcAmount);
    await tx2.wait();

    // 3. 调用pair的mint函数
    console.log("\n3. 铸造流动性代币...");

    const pairABI = [
        "function mint(address to) returns (uint liquidity)",
        "function getReserves() view returns (uint112, uint112, uint32)"
    ];

    const pair = new ethers.Contract(ADDRESSES.pair, pairABI, deployer);

    try {
        const mintTx = await pair.mint(deployer.address);
        await mintTx.wait();
        console.log("✅ 流动性添加成功！");
    } catch (error) {
        console.log(`❌ mint失败: ${error.message}`);

        // 尝试检查pair状态
        console.log("\n4. 检查交易对状态...");
        try {
            const [reserve0, reserve1] = await pair.getReserves();
            console.log(`   储备量: ${ethers.formatEther(reserve0)} / ${ethers.formatUnits(reserve1, 6)}`);

            if (reserve0 > 0 && reserve1 > 0) {
                console.log("✅ 流动性已存在，无需再次添加");
            }
        } catch (e) {
            console.log(`   无法获取储备量: ${e.message}`);
        }
    }

    // 4. 验证并测试
    console.log("\n5. 验证流动性...");

    const finalMntInPair = await mntToken.balanceOf(ADDRESSES.pair);
    const finalUsdcInPair = await usdcToken.balanceOf(ADDRESSES.pair);

    console.log(`   交易对MNT余额: ${ethers.formatEther(finalMntInPair)}`);
    console.log(`   交易对USDC余额: ${ethers.formatUnits(finalUsdcInPair, 6)}`);

    if (finalMntInPair > 0 && finalUsdcInPair > 0) {
        console.log("\n🎉 流动性添加成功！现在测试getAmountsOut...");

        // 测试getAmountsOut
        const router = await ethers.getContractAt("UniswapV2Router02", ADDRESSES.router);
        const path = [ADDRESSES.mnt, ADDRESSES.usdc];

        try {
            const amounts = await router.getAmountsOut(ethers.parseEther("1"), path);
            console.log(`✅ getAmountsOut 成功！`);
            console.log(`   1 MNT ≈ ${ethers.formatUnits(amounts[1], 6)} USDC`);
        } catch (error) {
            console.log(`❌ getAmountsOut 失败: ${error.message}`);
            console.log("   可能是UniswapV2Library还有问题");
        }
    }
}

main().catch(console.error);