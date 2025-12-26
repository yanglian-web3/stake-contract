// scripts/fresh-deploy-dex.js
const { ethers } = require("hardhat");

async function main() {
    console.log("🆕 全新部署DEX系统\n");

    const [deployer] = await ethers.getSigners();
    console.log("部署者:", deployer.address);

    // 1. 部署WETH
    console.log("\n1. 部署WETH9...");
    const WETH9 = await ethers.getContractFactory("WETH9");
    const weth = await WETH9.deploy();
    await weth.waitForDeployment();
    const wethAddress = await weth.getAddress();
    console.log(`✅ WETH: ${wethAddress}`);

    // 2. 部署Factory
    console.log("\n2. 部署UniswapV2Factory...");
    const UniswapV2Factory = await ethers.getContractFactory("UniswapV2Factory");
    const factory = await UniswapV2Factory.deploy(deployer.address);
    await factory.waitForDeployment();
    const factoryAddress = await factory.getAddress();
    console.log(`✅ Factory: ${factoryAddress}`);

    // 3. 部署Router
    console.log("\n3. 部署UniswapV2Router02...");
    const UniswapV2Router02 = await ethers.getContractFactory("UniswapV2Router02");
    const router = await UniswapV2Router02.deploy(factoryAddress, wethAddress);
    await router.waitForDeployment();
    const routerAddress = await router.getAddress();
    console.log(`✅ Router: ${routerAddress}`);

    // 4. 测试路由器
    console.log("\n4. 测试路由器...");
    const routerContract = await ethers.getContractAt("UniswapV2Router02", routerAddress);

    console.log(`   factory(): ${await routerContract.factory()}`);
    console.log(`   WETH(): ${await routerContract.WETH()}`);

    // 5. 创建交易对
    console.log("\n5. 创建交易对...");

    // 使用真实的代币地址（从您之前的部署）
    const mntAddress = "0x2E2Ed0Cfd3AD2f1d34481277b3204d807Ca2F8c2";
    const usdcAddress = "0xD8a5a9b31c3C0232E196d518E89Fd8bF83AcAd43";

    const tx = await factory.createPair(mntAddress, usdcAddress);
    await tx.wait();

    const pairAddress = await factory.getPair(mntAddress, usdcAddress);
    console.log(`✅ MNT/USDC交易对: ${pairAddress}`);

    // 6. 添加流动性
    console.log("\n6. 添加流动性...");

    const mntToken = await ethers.getContractAt("ERC20Mock", mntAddress);
    const usdcToken = await ethers.getContractAt("ERC20Mock", usdcAddress);

    // 批准
    const mntAmount = ethers.parseEther("1000");
    const usdcAmount = ethers.parseUnits("500", 6);

    await mntToken.approve(routerAddress, mntAmount);
    await usdcToken.approve(routerAddress, usdcAmount);

    // 添加流动性
    const deadline = Math.floor(Date.now() / 1000) + 300;

    try {
        const liquidityTx = await routerContract.addLiquidity(
            mntAddress,
            usdcAddress,
            mntAmount,
            usdcAmount,
            mntAmount * 9n / 10n,
            usdcAmount * 9n / 10n,
            deployer.address,
            deadline
        );

        await liquidityTx.wait();
        console.log("✅ 流动性添加成功！");

    } catch (error) {
        console.log(`❌ 添加流动性失败: ${error.message}`);
        console.log("   尝试直接添加...");

        // 直接转账并调用mint
        await mntToken.transfer(pairAddress, mntAmount);
        await usdcToken.transfer(pairAddress, usdcAmount);

        const pair = await ethers.getContractAt("UniswapV2Pair", pairAddress);
        await pair.mint(deployer.address);
        console.log("✅ 直接添加流动性成功！");
    }

    // 7. 最终测试
    console.log("\n7. 最终测试...");

    try {
        const path = [mntAddress, usdcAddress];
        const amounts = await routerContract.getAmountsOut(ethers.parseEther("1"), path);
        console.log(`✅ getAmountsOut 成功！`);
        console.log(`   1 MNT ≈ ${ethers.formatUnits(amounts[1], 6)} USDC`);
    } catch (error) {
        console.log(`❌ getAmountsOut 失败: ${error.message}`);
    }

    // 8. 保存配置
    console.log("\n🎉 DEX部署完成！");
    console.log("=".repeat(50));
    console.log(`工厂: ${factoryAddress}`);
    console.log(`路由器: ${routerAddress}`);
    console.log(`WETH: ${wethAddress}`);
    console.log(`交易对: ${pairAddress}`);
}

main().catch(console.error);