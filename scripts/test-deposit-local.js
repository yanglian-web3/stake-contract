// 完整的本地部署脚本（包含ETH分发）- 修复余额获取问题
const { ethers, upgrades } = require("hardhat");

// ETH 分发函数
async function distributeETH(deployer, accounts, amountETH = "10") {
    console.log(`\n💰 分发 ETH 给测试账户...`);

    const amountWei = ethers.parseEther(amountETH);

    for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i];

        // 跳过部署者自己
        if (account.toLowerCase() === deployer.address.toLowerCase()) {
            continue;
        }

        // 获取当前余额
        const balanceBefore = await ethers.provider.getBalance(account);

        console.log(`\n处理账户 ${i + 1}/${accounts.length}: ${account}`);
        console.log(`   当前余额: ${ethers.formatEther(balanceBefore)} ETH`);

        // 如果已经有足够的 ETH，跳过
        if (balanceBefore >= amountWei) {
            console.log(`   ✅ 已有足够 ETH，跳过`);
            continue;
        }

        try {
            // 发送 ETH
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
    console.log("🚀 开始本地测试（多代币版本）...");

    // 获取所有可用账户
    const accounts = await ethers.getSigners();
    const deployer = accounts[0];

    console.log("部署账户:", deployer.address);
    console.log("部署账户余额:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

    // 获取 Hardhat 默认的测试账户
    const testAccounts = [
        '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
        '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
        '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
        '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc'
    ];

    console.log("总账户数:", testAccounts.length + 1); // +1 包括部署者

    // 1. 首先为测试账户分发 ETH（重要！）
    console.log("\n1. 为测试账户分发 ETH...");
    await distributeETH(deployer, testAccounts, "10");

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

    // 2. 部署多个测试代币
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

    // 3. 部署质押合约
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

    // 4. 初始化质押池
    console.log("\n4. 初始化质押池...");

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

    // 5. 转入奖励代币
    console.log("\n5. 准备奖励代币...");
    const mntToken = await ethers.getContractAt("ERC20Mock", deployedTokens["MNT"].address);

    // 获取余额
    let mntDeployerBalance = await mntToken.balanceOf(deployer.address);
    console.log(`MNT 部署者余额: ${ethers.formatEther(mntDeployerBalance)}`);

    // 计划转入的奖励金额
    const plannedReward = ethers.parseEther("10000");
    console.log(`计划转入奖励: ${ethers.formatEther(plannedReward)}`);

    // 确定实际要转入的金额
    let actualReward;

    // 转换余额为 BigInt 进行比较
    const balanceBigInt = BigInt(mntDeployerBalance.toString());
    const plannedBigInt = BigInt(plannedReward.toString());

    if (balanceBigInt < plannedBigInt) {
        console.warn(`⚠️  余额不足，使用可用余额的 90%`);
        actualReward = balanceBigInt * 9n / 10n;
    } else {
        actualReward = plannedBigInt;
    }

    console.log(`实际转入奖励: ${ethers.formatEther(actualReward.toString())}`);

    // 执行转账
    await mntToken.transfer(stakeAddress, actualReward);
    console.log(`✅ 成功转入MNT奖励`);

    // 6. 为测试账户分配代币
    console.log("\n6. 分配测试代币...");

    // 使用更安全的分配逻辑
    for (const [symbol, token] of Object.entries(deployedTokens)) {
        const tokenContract = await ethers.getContractAt("ERC20Mock", token.address);
        const decimals = token.decimals;

        // 获取当前余额
        let currentBalance = await tokenContract.balanceOf(deployer.address);
        currentBalance = BigInt(currentBalance.toString());

        console.log(`\n${symbol} 当前余额: ${ethers.formatUnits(currentBalance.toString(), decimals)}`);

        // 为每个测试账户转账
        for (const account of testAccounts) {
            // 计算每个账户应该获得的金额
            const perAccountAmount = ethers.parseUnits("50", decimals); // 每个账户 50 个
            const perAccountAmountBigInt = BigInt(perAccountAmount.toString());

            // 检查余额是否足够
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

    // 7. 输出最终配置
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

    console.log("\n📋 前端配置示例:");
    console.log(`
// 代币地址配置
export const LOCAL_TOKENS = ${JSON.stringify(
        Object.keys(deployedTokens).reduce((acc, symbol) => {
            acc[symbol] = deployedTokens[symbol].address;
            return acc;
        }, {}),
        null,
        2
    )};

// 接收地址配置（测试账户）
export const TEST_RECEIVERS = ${JSON.stringify(
        testAccounts.reduce((acc, account, index) => {
            acc[`TestAccount${index + 1}`] = account;
            return acc;
        }, {}),
        null,
        2
    )};
    `);

    console.log("\n💡 测试准备完成:");
    console.log("✅ 所有测试账户已获得 10 ETH");
    console.log("✅ 所有测试账户已获得 50 个每种代币");
    console.log("✅ 质押合约已部署并配置");
    console.log("✅ 可以开始进行转账和质押测试");

    return { deployedTokens, stakeAddress, testAccounts };
}

main().catch((error) => {
    console.error("部署失败:", error);
    process.exitCode = 1;
});