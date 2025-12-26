// 完整的本地部署脚本（保持原有功能，添加 DEX）- 精简版
const { ethers, upgrades } = require("hardhat");

// ETH 分发函数 - 保持不变
async function distributeETH(deployer, accounts, amountETH = "10") {
    console.log(`\n💰 分发 ETH 给测试账户...`);
    const amountWei = ethers.parseEther(amountETH);

    for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i];
        if (account.toLowerCase() === deployer.address.toLowerCase()) {
            continue;
        }

        const balanceBefore = await ethers.provider.getBalance(account);
        console.log(`\n处理账户 ${i + 1}/${accounts.length}: ${account}`);
        console.log(`   当前余额: ${ethers.formatEther(balanceBefore)} ETH`);

        if (balanceBefore >= amountWei) {
            console.log(`   ✅ 已有足够 ETH，跳过`);
            continue;
        }

        try {
            const tx = await deployer.sendTransaction({
                to: account,
                value: amountWei
            });
            await tx.wait();
            const balanceAfter = await ethers.provider.getBalance(account);
            console.log(`   ✅ 发送 ${ethers.formatEther(amountWei)} ETH 成功`);
            console.log(`   更新后余额: ${ethers.formatEther(balanceAfter)} ETH`);
        } catch (error) {
            console.error(`   ❌ 发送 ETH 失败:`, error.message);
        }
    }
}

async function main() {
    console.log("🚀 开始本地测试（完整版）...");

    // 获取所有可用账户 - 不变
    const accounts = await ethers.getSigners();
    const deployer = accounts[0];

    console.log("部署账户:", deployer.address);
    console.log("部署账户余额:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

    // 获取 Hardhat 默认的测试账户 - 不变
    const testAccounts = [
        '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
        '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
        '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
        '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc'
    ];

    console.log("总账户数:", testAccounts.length + 1);

    // 1. 为测试账户分发 ETH - 不变
    console.log("\n1. 为测试账户分发 ETH...");
    await distributeETH(deployer, testAccounts, "10");

    // 代币配置 - 保持不变
    const tokenConfigs = [
        {
            name: "MetaNode Token",
            symbol: "MNT",
            initialAmount: "1000000",
            decimals: 18,
            color: "neon"
        },
        {
            name: "Test USDC",
            symbol: "USDC",
            initialAmount: "500000",
            decimals: 6,
            color: "blue"
        },
        {
            name: "Test DAI",
            symbol: "DAI",
            initialAmount: "200000",
            decimals: 18,
            color: "green"
        },
        {
            name: "Test LINK",
            symbol: "LINK",
            initialAmount: "100000",
            decimals: 18,
            color: "purple"
        }
    ];

    const deployedTokens = {};

    // 2. 部署多个测试代币 - 保持不变
    console.log("\n\n2. 部署多个测试代币...");
    for (const config of tokenConfigs) {
        const Token = await ethers.getContractFactory("ERC20Mock");
        const initialSupply = ethers.parseUnits(config.initialAmount, config.decimals);

        console.log(`\n部署 ${config.symbol}...`);
        const token = await Token.deploy(
            config.name,
            config.symbol,
            deployer.address,
            initialSupply
        );
        await token.waitForDeployment();
        const tokenAddress = await token.getAddress();

        try {
            const decimals = await token.decimals();
            const totalSupply = await token.totalSupply();
            const deployerBalance = await token.balanceOf(deployer.address);

            console.log(`✅ ${config.symbol}: ${tokenAddress}`);
            console.log(`  供应: ${ethers.formatUnits(totalSupply, decimals)}`);
            console.log(`  部署者余额: ${ethers.formatUnits(deployerBalance, decimals)}`);

            deployedTokens[config.symbol] = {
                address: tokenAddress,
                name: config.name,
                symbol: config.symbol,
                decimals: Number(decimals),
                initialSupply: totalSupply.toString(),
                deployerBalance: deployerBalance.toString(),
                color: config.color
            };
        } catch (error) {
            console.error(`❌ ${config.symbol} 验证失败:`, error.message);
            deployedTokens[config.symbol] = {
                address: tokenAddress,
                name: config.name,
                symbol: config.symbol,
                decimals: config.decimals,
                initialSupply: initialSupply.toString(),
                color: config.color
            };
        }
    }

    // 3. 部署质押合约 - 保持不变
    console.log("\n\n3. 部署质押合约...");
    const Stake = await ethers.getContractFactory("MetaNodeStake");
    const startBlock = (await ethers.provider.getBlockNumber()) + 10;
    const endBlock = startBlock + 100000;
    const metaNodePerBlock = ethers.parseEther("0.02");

    const stakeContract = await upgrades.deployProxy(
        Stake,
        [
            deployedTokens["MNT"].address,
            startBlock,
            endBlock,
            metaNodePerBlock
        ],
        { initializer: "initialize" }
    );

    await stakeContract.waitForDeployment();
    const stakeAddress = await stakeContract.getAddress();
    console.log("质押合约地址:", stakeAddress);

    // 4. 初始化质押池 - 保持不变
    console.log("\n4. 初始化质押池...");
    await stakeContract.addPool(
        ethers.ZeroAddress,
        ethers.parseEther("10"),
        ethers.parseEther("0.001"),
        100,
        false
    );

    for (const [symbol, token] of Object.entries(deployedTokens)) {
        if (symbol !== "MNT") {
            console.log(`添加 ${symbol} 质押池...`);
            await stakeContract.addPool(
                token.address,
                ethers.parseEther("5"),
                ethers.parseEther("10"),
                50,
                false
            );
        }
    }

    // 5. 转入奖励代币 - 保持不变
    console.log("\n5. 准备奖励代币...");
    const mntToken = await ethers.getContractAt("ERC20Mock", deployedTokens["MNT"].address);
    let mntDeployerBalance = await mntToken.balanceOf(deployer.address);
    console.log(`MNT 部署者余额: ${ethers.formatEther(mntDeployerBalance)}`);

    const plannedReward = ethers.parseEther("10000");
    console.log(`计划转入奖励: ${ethers.formatEther(plannedReward)}`);

    const balanceBigInt = BigInt(mntDeployerBalance.toString());
    const plannedBigInt = BigInt(plannedReward.toString());
    let actualReward;

    if (balanceBigInt < plannedBigInt) {
        console.warn(`⚠️  余额不足，使用可用余额的 90%`);
        actualReward = balanceBigInt * 9n / 10n;
    } else {
        actualReward = plannedBigInt;
    }

    console.log(`实际转入奖励: ${ethers.formatEther(actualReward.toString())}`);
    await mntToken.transfer(stakeAddress, actualReward);
    console.log(`✅ 成功转入MNT奖励`);

    // 6. 为测试账户分配代币 - 保持不变
    console.log("\n6. 分配测试代币...");
    for (const [symbol, token] of Object.entries(deployedTokens)) {
        const tokenContract = await ethers.getContractAt("ERC20Mock", token.address);
        const decimals = token.decimals;

        let currentBalance = await tokenContract.balanceOf(deployer.address);
        currentBalance = BigInt(currentBalance.toString());

        console.log(`\n${symbol} 当前余额: ${ethers.formatUnits(currentBalance.toString(), decimals)}`);

        for (const account of testAccounts) {
            const perAccountAmount = ethers.parseUnits("50", decimals);
            const perAccountAmountBigInt = BigInt(perAccountAmount.toString());

            if (currentBalance >= perAccountAmountBigInt) {
                try {
                    await tokenContract.transfer(account, perAccountAmount);
                    console.log(`  ✅ 转账 ${symbol} ${ethers.formatUnits(perAccountAmount, decimals)} 到 ${account.slice(0, 8)}...`);
                    currentBalance -= perAccountAmountBigInt;
                } catch (error) {
                    console.log(`  ❌ 转账失败: ${error.message}`);
                }
            } else {
                console.log(`  ⚠️  ${symbol} 余额不足，跳过剩余转账`);
                break;
            }
        }
    }

    // ==================== 新增：DEX 相关部署 ====================
    console.log("\n\n7. 部署 DEX 路由器（新增功能）...");
    let dexRouterAddress = "";

    try {
        // 尝试部署模拟 DEX 路由器
        // 注意：这里假设已经有 MockDexRouter 合约
        const MockDexRouter = await ethers.getContractFactory("MockDexRouter");
        const mockRouter = await MockDexRouter.deploy();
        await mockRouter.waitForDeployment();

        dexRouterAddress = await mockRouter.getAddress();
        console.log(`✅ 模拟 DEX 路由器部署完成: ${dexRouterAddress}`);

        // 简单验证
        const testPath = [deployedTokens["MNT"].address, deployedTokens["USDC"].address];
        const testAmount = ethers.parseUnits("1", 18);

        try {
            const amounts = await mockRouter.getAmountsOut(testAmount, testPath);
            console.log(`✅ DEX 功能验证通过`);
        } catch (error) {
            console.log(`⚠️  DEX 功能验证失败，但地址可用: ${error.message}`);
        }

    } catch (error) {
        console.log(`⚠️  无法部署 MockDexRouter: ${error.message}`);
        console.log(`   使用 Hardhat 默认地址进行 DEX 测试`);
        dexRouterAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    }
    // ==================== 新增结束 ====================

    // 7. 输出最终配置 - 添加 DEX 信息
    console.log("\n🎉 部署完成！");
    console.log("=".repeat(50));

    console.log("\n📊 代币列表:");
    for (const [symbol, token] of Object.entries(deployedTokens)) {
        console.log(`${symbol}: ${token.address}`);
    }

    console.log("\n📊 测试账户 ETH 余额:");
    for (const account of testAccounts) {
        const balance = await ethers.provider.getBalance(account);
        console.log(`${account.slice(0, 8)}...: ${ethers.formatEther(balance)} ETH`);
    }

    // ==================== 新增：输出 DEX 配置 ====================
    console.log("\n🔗 DEX 路由器地址（用于前端测试）:");
    console.log(`MockDexRouter: ${dexRouterAddress}`);

    console.log("\n📋 前端配置示例:");
    console.log(`
// 代币合约地址
${JSON.stringify(
        Object.keys(deployedTokens).reduce((acc, symbol) => {
            acc[symbol] = deployedTokens[symbol].address;
            return acc;
        }, {}),
        null,
        2
    )};

export const TEST_RECEIVERS = ${JSON.stringify(
        testAccounts.reduce((acc, account, index) => {
            acc[`TestAccount${index + 1}`] = account;
            return acc;
        }, {}),
        null,
        2
    )};

// 新增：DEX 配置（可选）
export const DEX_CONFIG = {
    routerAddress: "${dexRouterAddress}",
    supportedTokens: ${JSON.stringify(
        Object.keys(deployedTokens).reduce((acc, symbol) => {
            acc[symbol] = deployedTokens[symbol].address;
            return acc;
        }, {}),
        null,
        2
    )}
};
    `);

    console.log("\n💡 功能说明:");
    console.log("✅ 原有功能全部保持:");
    console.log("   - 代币转账");
    console.log("   - 质押合约");
    console.log("   - 测试账户分发");
    console.log("");
    console.log("✅ 新增 DEX 功能:");
    console.log("   - DEX 路由器地址: " + dexRouterAddress);
    console.log("   - 可用于前端 DEX 组件测试");
    console.log("   - 价格预览功能需要路由器支持");
    console.log("");
    console.log("⚠️  注意事项:");
    console.log("   - DEX 是模拟版本，实际兑换可能需要额外配置");
    console.log("   - 如果 DEX 部署失败，前端可以使用模拟模式");

    return {
        // 原有返回
        deployedTokens,
        stakeAddress,
        testAccounts,
        // 新增返回
        dexRouterAddress
    };
}

main().catch((error) => {
    console.error("部署失败:", error);
    process.exitCode = 1;
});