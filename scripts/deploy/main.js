// 主部署脚本
// 主部署脚本

const { ethers } = require("hardhat");
const ConfigManager = require("../utils/config-manager");
const AccountManager = require("../utils/account-manager");
const deployTokens = require("./deploy-tokens");
const deployStakeSystem = require("./deploy-stake");
const deployDexSystem = require("./deploy-dex");

async function main() {
    console.log("🚀 开始完整部署（质押 + DEX）...");

    const configManager = new ConfigManager();
    const accountManager = new AccountManager();

    // 获取部署账户
    const [deployer] = await ethers.getSigners();
    const testAccounts = accountManager.getTestAccounts();

    console.log("部署账户:", deployer.address);
    console.log("部署账户余额:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
    console.log("总测试账户数:", testAccounts.length);

    const deploymentData = {
        network: {
            chainId: 31337,
            name: "localhost",
            rpcUrl: "http://localhost:8545"
        },
        deployer: deployer.address,
        testAccounts: testAccounts,
        timestamp: new Date().toISOString(),
        deployments: {}
    };

    // 声明所有结果变量在 try-catch 块外部
    let tokens = {};
    let stakeResult = {};
    let dexResult = { simpleDex: null, tokens: {} };

    try {
        // 1. 分发 ETH 给测试账户
        console.log("\n1. 分发 ETH 给测试账户...");
        const ethDistribution = await accountManager.distributeETH(deployer, testAccounts, "10");
        deploymentData.ethDistribution = ethDistribution;

        // 2. 部署代币
        console.log("\n2. 部署代币...");
        tokens = await deployTokens(deployer, 'stakeTokens');
        deploymentData.deployments.tokens = tokens;

        // 保存代币配置
        configManager.saveConfig('tokens', tokens);

        // 3. 部署质押系统
        console.log("\n3. 部署质押系统...");
        stakeResult = await deployStakeSystem(deployer, tokens);
        deploymentData.deployments.stake = stakeResult;

        // 保存质押配置
        configManager.saveConfig('stake', stakeResult);

        // 4. 部署 DEX 系统（使用现有代币或部署新代币）
        console.log("\n4. 部署 DEX 系统...");

        // 可以选择使用现有代币或部署独立的 DEX 代币
        const useExistingTokens = false; // 改为 false，部署独立的 DEX 代币

        let dexTokens = {};
        if (useExistingTokens) {
            // 使用已有的 USDC 和 DAI 作为 DEX 交易对
            console.log("使用现有代币 USDC 和 DAI 作为 DEX 交易对...");
            dexTokens = {
                TKNA: tokens.USDC,
                TKNB: tokens.DAI
            };
        } else {
            console.log("部署独立的 DEX 测试代币...");
        }

        try {
            dexResult = await deployDexSystem(deployer, dexTokens);
            deploymentData.deployments.dex = dexResult;

            if (dexResult && dexResult.simpleDex) {
                // 保存 DEX 配置
                configManager.saveConfig('dex', dexResult);
                console.log("✅ DEX 配置已保存");
            } else {
                console.log("⚠️  DEX 部署未完成，跳过保存配置");
            }
        } catch (dexError) {
            console.error("❌ DEX 部署失败，但继续其他步骤:", dexError.message);
            dexResult = {
                error: dexError.message,
                simpleDex: null,
                tokens: {},
                timestamp: new Date().toISOString()
            };
            deploymentData.deployments.dex = dexResult;
        }

        // 5. 生成前端配置
        console.log("\n5. 生成前端配置...");
        const frontendConfig = configManager.generateFrontendConfig({
            tokens: Object.values(tokens),
            stakeContract: stakeResult.stakeContract || { address: "" },
            dexContracts: dexResult.simpleDex || null,
            testAccounts: testAccounts.map((addr, index) => ({
                address: addr,
                name: `测试账户${index + 1}`,
                index: index
            }))
        });

        configManager.saveConfig('frontend', frontendConfig);

        // 6. 显示部署摘要
        console.log("\n🎉 部署完成！");
        console.log("=".repeat(60));

        console.log("\n📊 代币列表:");
        for (const [symbol, token] of Object.entries(tokens)) {
            console.log(`${symbol.padEnd(6)}: ${token.address}`);
        }

        console.log("\n📊 核心合约地址:");
        console.log(`质押合约:  ${stakeResult.stakeContract?.address || "部署失败"}`);

        if (dexResult && dexResult.simpleDex) {
            console.log(`SimpleDEX: ${dexResult.simpleDex.address}`);
            if (dexResult.tokens && dexResult.tokens.TKNA && dexResult.tokens.TKNB) {
                console.log(`  交易对: ${dexResult.tokens.TKNA.symbol}/${dexResult.tokens.TKNB.symbol}`);
                console.log(`  价格: 1 ${dexResult.tokens.TKNA.symbol} = ${dexResult.simpleDex.price || "未知"} ${dexResult.tokens.TKNB.symbol}`);
            }
        } else {
            console.log("SimpleDEX: 部署失败或未部署");
        }

        console.log("\n📊 测试账户 ETH 余额:");
        for (let i = 0; i < Math.min(testAccounts.length, 3); i++) {
            const account = testAccounts[i];
            const balance = await ethers.provider.getBalance(account);
            console.log(`${account.slice(0, 8)}...: ${ethers.formatEther(balance)} ETH`);
        }

        console.log("\n📁 生成的配置文件:");
        console.log("   • deployed-configs/tokens.json");
        console.log("   • deployed-configs/stake.json");
        if (dexResult && dexResult.simpleDex) {
            console.log("   • deployed-configs/dex.json");
        }
        console.log("   • deployed-configs/frontend.json");

        console.log("\n🚀 现在可以测试:");
        console.log("   质押功能: 访问质押页面");
        if (dexResult && dexResult.simpleDex) {
            console.log("   DEX 功能: 访问 DEX 兑换页面");
            console.log(`   测试 DEX: npx hardhat run scripts/dex/test-simple-dex.js --network localhost`);
        } else {
            console.log("   DEX 功能: 部署失败，请检查错误");
        }

        // 保存完整的部署数据
        configManager.saveConfig('complete-deployment', deploymentData);

        return deploymentData;

    } catch (error) {
        console.error("❌ 部署失败:", error);

        // 尝试保存部分部署数据
        try {
            if (tokens && Object.keys(tokens).length > 0) {
                configManager.saveConfig('partial-tokens', tokens);
            }
            if (stakeResult && stakeResult.stakeContract) {
                configManager.saveConfig('partial-stake', stakeResult);
            }
            if (dexResult && dexResult.simpleDex) {
                configManager.saveConfig('partial-dex', dexResult);
            }
        } catch (saveError) {
            console.error("保存部分数据失败:", saveError);
        }

        throw error;
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}

module.exports = main;