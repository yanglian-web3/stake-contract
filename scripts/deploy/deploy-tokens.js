// scripts/deploy/deploy-tokens.js
const { ethers } = require("hardhat");
const tokenConfigs = require("../config/token-configs");

async function deployTokens(deployer, configType = 'stakeTokens') {
    console.log("\n🚀 部署代币...");

    const configs = tokenConfigs[configType] || tokenConfigs.stakeTokens;
    const deployedTokens = {};

    for (const config of configs) {
        console.log(`\n部署 ${config.symbol}...`);

        try {
            const Token = await ethers.getContractFactory("ERC20Mock");
            const initialSupply = ethers.parseUnits(config.initialAmount, config.decimals);

            const token = await Token.deploy(
                config.name,
                config.symbol,
                deployer.address,
                initialSupply
            );
            await token.waitForDeployment();
            const tokenAddress = await token.getAddress();

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
                color: config.color,
                isRewardToken: config.isRewardToken || false,
                forDex: config.forDex || false
            };
        } catch (error) {
            console.error(`❌ ${config.symbol} 部署失败:`, error.message);
        }
    }

    console.log(`\n✅ 共部署 ${Object.keys(deployedTokens).length} 个代币`);
    return deployedTokens;
}

// 添加独立的 main 函数用于单独运行
async function main() {
    console.log("🚀 开始单独部署代币...");

    const [deployer] = await ethers.getSigners();
    console.log(`部署账户: ${deployer.address}`);
    console.log(`部署账户余额: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);

    const tokens = await deployTokens(deployer, 'stakeTokens');

    // 保存配置文件
    const ConfigManager = require("../utils/config-manager");
    const configManager = new ConfigManager();
    configManager.saveConfig('tokens', tokens);
    console.log("✅ 配置已保存到: deployed-configs/tokens.json");

    // 显示部署结果
    console.log("\n🎉 代币部署完成！");
    console.log("=".repeat(50));

    for (const [symbol, token] of Object.entries(tokens)) {
        console.log(`${symbol.padEnd(6)}: ${token.address}`);
    }

    return tokens;
}

// 如果直接运行此脚本
if (require.main === module) {
    main().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}

module.exports = deployTokens;