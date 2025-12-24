// 修复后的部署脚本 - 彻底修复余额比较问题
const { ethers, upgrades } = require("hardhat");

async function main() {
    console.log("🚀 开始本地测试（多代币版本）...");

    const [deployer] = await ethers.getSigners();
    console.log("部署账户:", deployer.address);

    // 代币配置
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

    // 1. 部署多个测试代币
    console.log("\n1. 部署多个测试代币...");
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

        // 获取代币信息
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

    // 2. 部署质押合约
    console.log("\n\n2. 部署质押合约...");
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

    // 3. 初始化质押池
    console.log("\n3. 初始化质押池...");

    // ETH 池
    await stakeContract.addPool(
        ethers.ZeroAddress,
        ethers.parseEther("10"),
        ethers.parseEther("0.001"),
        100,
        false
    );

    // 为每个代币添加质押池
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

    // 4. 转入奖励代币 - 完全重写这部分
    console.log("\n4. 准备奖励代币...");
    const mntToken = await ethers.getContractAt("ERC20Mock", deployedTokens["MNT"].address);

    // 获取余额并确保是 BigNumber
    let mntDeployerBalance = await mntToken.balanceOf(deployer.address);
    console.log(`MNT 部署者余额: ${ethers.formatEther(mntDeployerBalance)}`);

    // 计划转入的奖励金额
    const plannedReward = ethers.parseEther("10000");
    console.log(`计划转入奖励: ${ethers.formatEther(plannedReward)}`);

    // 确定实际要转入的金额
    let actualReward;
    if (typeof mntDeployerBalance.lt === 'function') {
        // 如果是 BigNumber
        if (mntDeployerBalance.lt(plannedReward)) {
            console.warn(`⚠️  余额不足，使用可用余额的 90%`);
            // 转换为 BigInt 进行计算
            const balanceBigInt = BigInt(mntDeployerBalance.toString());
            actualReward = balanceBigInt * 9n / 10n;
            actualReward = ethers.toBigInt(actualReward); // 转换回 BigNumber
        } else {
            actualReward = plannedReward;
        }
    } else {
        // 如果不是 BigNumber，直接处理
        console.log(`检测到非 BigNumber 类型，直接处理...`);
        const balanceBigInt = BigInt(mntDeployerBalance);
        const plannedBigInt = BigInt(plannedReward.toString());

        if (balanceBigInt < plannedBigInt) {
            console.warn(`⚠️  余额不足，使用可用余额的 90%`);
            actualReward = balanceBigInt * 9n / 10n;
        } else {
            actualReward = plannedBigInt;
        }
        actualReward = ethers.toBigInt(actualReward);
    }

    console.log(`实际转入奖励: ${ethers.formatEther(actualReward)}`);

    // 执行转账
    await mntToken.transfer(stakeAddress, actualReward);
    console.log(`✅ 成功转入MNT奖励`);

    // 5. 为测试账户分配代币 - 简化逻辑
    console.log("\n5. 分配测试代币...");
    const testAccounts = [
        '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'
    ];

    for (const [symbol, token] of Object.entries(deployedTokens)) {
        const tokenContract = await ethers.getContractAt("ERC20Mock", token.address);
        const decimals = token.decimals;

        // 获取当前余额
        let currentBalance = await tokenContract.balanceOf(deployer.address);

        // 确保 currentBalance 是 BigNumber 或 BigInt
        if (typeof currentBalance === 'object' && currentBalance.toString) {
            currentBalance = BigInt(currentBalance.toString());
        } else {
            currentBalance = BigInt(currentBalance);
        }

        console.log(`\n${symbol} 当前余额: ${ethers.formatUnits(currentBalance.toString(), decimals)}`);

        // 为每个账户转账固定金额
        const fixedAmount = ethers.parseUnits("100", decimals); // 每个账户 100 个，避免余额不足

        // 检查余额是否足够
        const totalNeeded = fixedAmount * BigInt(testAccounts.length);

        if (currentBalance >= totalNeeded) {
            for (const account of testAccounts) {
                await tokenContract.transfer(account, fixedAmount);
                console.log(`  转账 ${symbol} ${ethers.formatUnits(fixedAmount, decimals)} 到 ${account.slice(0, 8)}...`);
            }
        } else {
            console.log(`  ⚠️  ${symbol} 余额不足，跳过转账`);
        }
    }

    // 6. 输出最终配置
    console.log("\n🎉 部署完成！");
    console.log("=".repeat(50));

    console.log("\n📊 代币列表:");
    for (const [symbol, token] of Object.entries(deployedTokens)) {
        console.log(`${symbol}: ${token.address}`);
    }

    console.log("\n📋 简化前端配置:");
    console.log(`
// 复制到前端
export const HARDHAT_TOKENS = ${JSON.stringify(
        Object.keys(deployedTokens).reduce((acc, symbol) => {
            acc[symbol] = {
                address: deployedTokens[symbol].address,
                name: deployedTokens[symbol].name,
                symbol: symbol,
                decimals: deployedTokens[symbol].decimals
            };
            return acc;
        }, {}),
        null,
        2
    )}
    `);

    return { deployedTokens, stakeAddress };
}

main().catch((error) => {
    console.error("部署失败:", error);
    process.exitCode = 1;
});