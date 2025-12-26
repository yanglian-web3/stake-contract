// scripts/add-liquidity.js
const { ethers } = require("hardhat");

async function main() {
    console.log("💧 为交易对添加流动性...\n");

    const [deployer] = await ethers.getSigners();
    console.log("部署者地址:", deployer.address);

    // 合约地址（从您之前的部署输出）
    const ADDRESSES = {
        router: "0x5c74c94173F05dA1720953407cbb920F3DF9f887",
        factory: "0xAA292E8611aDF267e563f334Ee42320aC96D0463",
        weth: "0xf953b3A269d80e3eB0F2947630Da976B896A8C5b",
        mnt: "0x2E2Ed0Cfd3AD2f1d34481277b3204d807Ca2F8c2",
        usdc: "0xD8a5a9b31c3C0232E196d518E89Fd8bF83AcAd43",
        pairMntUsdc: "0x8C9Aa4B3c81f8ea247758918cCDE56AdE6E7f067"
    };

    // 获取合约实例
    const router = await ethers.getContractAt("UniswapV2Router02", ADDRESSES.router);
    const mntToken = await ethers.getContractAt("ERC20Mock", ADDRESSES.mnt);
    const usdcToken = await ethers.getContractAt("ERC20Mock", ADDRESSES.usdc);

    // 1. 检查当前余额
    console.log("1. 检查代币余额...");
    const mntBalance = await mntToken.balanceOf(deployer.address);
    const usdcBalance = await usdcToken.balanceOf(deployer.address);

    console.log(`   MNT 余额: ${ethers.formatEther(mntBalance)}`);
    console.log(`   USDC 余额: ${ethers.formatUnits(usdcBalance, 6)}`);

    // 2. 批准路由器使用代币
    console.log("\n2. 批准路由器使用代币...");

    const mntAmount = ethers.parseEther("1000"); // 1000 MNT
    const usdcAmount = ethers.parseUnits("500", 6); // 500 USDC (注意USDC是6位小数)

    // 检查USDC余额是否足够（您之前的日志显示USDC余额很少）
    if (usdcBalance < usdcAmount) {
        console.log("⚠️  USDC余额不足，调整金额...");
        // USDC铸造更多代币（因为这是测试环境）
        console.log("   为部署者铸造USDC...");
        await usdcToken.mint(deployer.address, ethers.parseUnits("10000", 6));
        const newUsdcBalance = await usdcToken.balanceOf(deployer.address);
        console.log(`   USDC新余额: ${ethers.formatUnits(newUsdcBalance, 6)}`);
    }

    console.log(`   批准路由器使用 ${ethers.formatEther(mntAmount)} MNT...`);
    const approveMntTx = await mntToken.approve(ADDRESSES.router, mntAmount);
    await approveMntTx.wait();
    console.log("   ✅ MNT批准完成");

    console.log(`   批准路由器使用 ${ethers.formatUnits(usdcAmount, 6)} USDC...`);
    const approveUsdcTx = await usdcToken.approve(ADDRESSES.router, usdcAmount);
    await approveUsdcTx.wait();
    console.log("   ✅ USDC批准完成");

    // 3. 添加流动性
    console.log("\n3. 添加流动性到 MNT/USDC 交易对...");

    const deadline = Math.floor(Date.now() / 1000) + 300; // 5分钟后过期

    try {
        const tx = await router.addLiquidity(
            ADDRESSES.mnt,
            ADDRESSES.usdc,
            mntAmount,
            usdcAmount,
            mntAmount * 9n / 10n,  // 最小接受量 (90%)
            usdcAmount * 9n / 10n,
            deployer.address,
            deadline
        );

        console.log("   ⏳ 等待交易确认...");
        const receipt = await tx.wait();
        console.log(`   ✅ 流动性添加成功！`);
        console.log(`     交易哈希: ${receipt.hash}`);

    } catch (error) {
        console.log(`❌ 添加流动性失败: ${error.message}`);

        // 尝试直接调用pair的mint函数
        console.log("\n尝试直接调用pair的mint函数...");
        try {
            const pair = await ethers.getContractAt("UniswapV2Pair", ADDRESSES.pairMntUsdc);

            // 直接转账到pair
            console.log("   直接转账到交易对...");
            await mntToken.transfer(ADDRESSES.pairMntUsdc, mntAmount);
            await usdcToken.transfer(ADDRESSES.pairMntUsdc, usdcAmount);

            // 调用mint
            console.log("   调用mint函数...");
            const mintTx = await pair.mint(deployer.address);
            await mintTx.wait();
            console.log("   ✅ 直接添加流动性成功！");

        } catch (directError) {
            console.log(`❌ 直接添加也失败: ${directError.message}`);
        }
    }

    // 4. 检查添加后的流动性
    console.log("\n4. 验证流动性...");

    // 检查交易对余额
    const mntInPair = await mntToken.balanceOf(ADDRESSES.pairMntUsdc);
    const usdcInPair = await usdcToken.balanceOf(ADDRESSES.pairMntUsdc);

    console.log(`   交易对MNT余额: ${ethers.formatEther(mntInPair)}`);
    console.log(`   交易对USDC余额: ${ethers.formatUnits(usdcInPair, 6)}`);

    if (mntInPair > 0 && usdcInPair > 0) {
        console.log("✅ 流动性添加成功！");
    } else {
        console.log("⚠️  流动性可能未添加成功");
    }

    // 5. 现在测试getAmountsOut
    console.log("\n5. 测试 getAmountsOut...");

    try {
        const testPath = [ADDRESSES.mnt, ADDRESSES.usdc];
        const testAmount = ethers.parseEther("1"); // 1 MNT

        const amounts = await router.getAmountsOut(testAmount, testPath);
        console.log(`✅ getAmountsOut 成功！`);
        console.log(`   1 MNT 可兑换: ${ethers.formatUnits(amounts[1], 6)} USDC`);

    } catch (error) {
        console.log(`❌ getAmountsOut 仍然失败: ${error.message}`);
        console.log("   可能需要检查UniswapV2Library中的逻辑");
    }
}

main().catch(console.error);