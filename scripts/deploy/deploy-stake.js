// scripts/deploy/deploy-stake.js
const { ethers, upgrades } = require("hardhat");
const AccountManager = require("../utils/account-manager");

async function deployStakeSystem(deployer, tokens) {
    console.log("\n🚀 部署质押系统...");

    const accountManager = new AccountManager();
    const testAccounts = accountManager.getTestAccounts();
    const deploymentResult = {
        stakeContract: null,
        tokenDistributions: {},
        timestamp: new Date().toISOString()
    };

    try {
        // 1. 部署质押合约
        console.log("\n1. 部署质押合约...");
        const Stake = await ethers.getContractFactory("MetaNodeStake");
        const startBlock = (await ethers.provider.getBlockNumber()) + 10;
        const endBlock = startBlock + 100000;
        const metaNodePerBlock = ethers.parseEther("0.02");

        const stakeContract = await upgrades.deployProxy(
            Stake,
            [
                tokens.MNT.address,
                startBlock,
                endBlock,
                metaNodePerBlock
            ],
            { initializer: "initialize" }
        );

        await stakeContract.waitForDeployment();
        const stakeAddress = await stakeContract.getAddress();
        console.log("✅ 质押合约地址:", stakeAddress);

        deploymentResult.stakeContract = {
            address: stakeAddress,
            name: "MetaNodeStake",
            startBlock: startBlock.toString(),
            endBlock: endBlock.toString(),
            metaNodePerBlock: ethers.formatEther(metaNodePerBlock)
        };

        // 2. 初始化质押池
        console.log("\n2. 初始化质押池...");

        // ETH 质押池
        await stakeContract.addPool(
            ethers.ZeroAddress,
            ethers.parseEther("10"),
            ethers.parseEther("0.001"),
            100,
            false
        );
        console.log("✅ ETH 质押池已添加");

        // 其他代币质押池
        for (const [symbol, token] of Object.entries(tokens)) {
            if (symbol !== "MNT" && token.address) {
                console.log(`添加 ${symbol} 质押池...`);
                await stakeContract.addPool(
                    token.address,
                    ethers.parseEther("5"),
                    ethers.parseEther("10"),
                    50,
                    false
                );
                console.log(`✅ ${symbol} 质押池已添加`);
            }
        }

        // 3. 转入奖励代币
        console.log("\n3. 准备奖励代币...");
        const mntToken = await ethers.getContractAt("ERC20Mock", tokens.MNT.address);
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

        // 4. 分配测试代币
        console.log("\n4. 分配测试代币...");

        // 调用修复后的分发函数
        const tokenDistributions = await distributeTokensForStake(deployer, tokens);
        deploymentResult.tokenDistributions = tokenDistributions;

        console.log("\n✅ 质押系统部署完成！");
        return deploymentResult;

    } catch (error) {
        console.error("❌ 质押系统部署失败:", error);
        throw error;
    }
}

// 修复后的代币分发函数
async function distributeTokensForStake(deployer, tokens) {
    console.log("\n分配测试代币...");
    const accountManager = new AccountManager();
    const testAccounts = accountManager.getTestAccounts();
    const distributions = {};

    for (const [symbol, token] of Object.entries(tokens)) {
        if (!token.address) continue;

        try {
            const tokenContract = await ethers.getContractAt("ERC20Mock", token.address);
            const decimals = token.decimals || 18;

            // 检查余额 - 使用 let 而不是 const
            let deployerBalance = await tokenContract.balanceOf(deployer.address);
            const formattedBalance = ethers.formatUnits(deployerBalance, decimals);

            console.log(`\n${symbol} 部署者余额: ${formattedBalance}`);

            // 计算可分配的金额
            const amountPerAccount = ethers.parseUnits("50", decimals);
            const totalNeeded = amountPerAccount * BigInt(testAccounts.length);

            if (deployerBalance >= totalNeeded) {
                console.log(`分配 ${symbol} 给测试账户...`);
                const results = await accountManager.distributeTokens(
                    deployer,
                    tokenContract,
                    testAccounts,
                    "50",
                    decimals
                );
                distributions[symbol] = results;
            } else {
                // 分配部分金额
                const perAccountAmount = deployerBalance / BigInt(testAccounts.length);
                const perAccountFormatted = ethers.formatUnits(perAccountAmount, decimals);

                console.log(`余额不足，每个账户分配 ${perAccountFormatted} ${symbol}`);

                const results = [];
                for (const account of testAccounts) {
                    // 每次转账前重新检查余额
                    deployerBalance = await tokenContract.balanceOf(deployer.address);

                    if (deployerBalance >= perAccountAmount && perAccountAmount > 0n) {
                        try {
                            const tx = await tokenContract.transfer(account, perAccountAmount);
                            await tx.wait();
                            console.log(`   ✅ 转账 ${perAccountFormatted} 到 ${account.slice(0, 8)}...`);
                            results.push({ account, success: true, txHash: tx.hash });
                        } catch (error) {
                            console.log(`   ❌ 转账失败: ${error.message}`);
                            results.push({ account, success: false, error: error.message });
                        }
                    } else {
                        console.log(`   ⚠️  ${symbol} 余额不足，跳过剩余转账`);
                        break;
                    }
                }
                distributions[symbol] = results;
            }
        } catch (error) {
            console.error(`${symbol} 分发失败:`, error.message);
            distributions[symbol] = { error: error.message };
        }
    }

    return distributions;
}

// 添加独立的 main 函数用于单独运行
async function main() {
    console.log("🚀 开始单独部署质押系统...");

    const [deployer] = await ethers.getSigners();
    console.log(`部署账户: ${deployer.address}`);

    // 需要先加载已部署的代币配置
    const ConfigManager = require("../utils/config-manager");
    const configManager = new ConfigManager();
    const tokens = configManager.loadConfig('tokens');

    if (!tokens || Object.keys(tokens).length === 0) {
        console.log("❌ 没有找到代币配置，请先运行 deploy:tokens");
        console.log("建议运行: npm run deploy:tokens");
        return;
    }

    console.log("加载的代币配置:");
    for (const [symbol, token] of Object.entries(tokens)) {
        console.log(`${symbol}: ${token.address}`);
    }

    const stakeResult = await deployStakeSystem(deployer, tokens);

    // 保存配置
    configManager.saveConfig('stake', stakeResult);

    console.log("\n🎉 质押系统部署完成！");
    console.log(`质押合约地址: ${stakeResult.stakeContract.address}`);

    return stakeResult;
}

// 如果直接运行此脚本
if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}

module.exports = deployStakeSystem;