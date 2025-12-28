// scripts/diagnose-usdc.js
const { ethers } = require("hardhat");
const tokenConfigs = require("./config/token-configs");

async function main() {
    console.log("🔍 诊断 USDC 部署问题...");

    // 1. 检查配置文件
    console.log("\n1. 检查配置文件:");
    const usdcConfig = tokenConfigs.stakeTokens.find(t => t.symbol === "USDC");
    console.log("   USDC 配置:", usdcConfig);

    if (usdcConfig) {
        console.log(`   initialAmount: "${usdcConfig.initialAmount}"`);
        console.log(`   decimals: ${usdcConfig.decimals}`);

        // 计算应该的值
        const expectedSupply = ethers.parseUnits(usdcConfig.initialAmount, usdcConfig.decimals);
        console.log(`   期望供应量: ${expectedSupply.toString()} 最小单位`);
        console.log(`   格式化显示: ${ethers.formatUnits(expectedSupply, usdcConfig.decimals)} USDC`);
    }

    // 2. 检查已部署的合约
    console.log("\n2. 检查已部署的 USDC:");
    const fs = require('fs');
    if (fs.existsSync('deployed-configs/tokens.json')) {
        const tokens = JSON.parse(fs.readFileSync('deployed-configs/tokens.json', 'utf8'));
        if (tokens.USDC) {
            console.log(`   地址: ${tokens.USDC.address}`);
            console.log(`   记录的总供应量: ${tokens.USDC.initialSupply}`);
            console.log(`   格式化: ${ethers.formatUnits(tokens.USDC.initialSupply || "0", tokens.USDC.decimals || 6)} USDC`);

            // 实际检查链上数据
            const usdcContract = await ethers.getContractAt("ERC20Mock", tokens.USDC.address);
            const actualSupply = await usdcContract.totalSupply();
            const actualDecimals = await usdcContract.decimals();
            console.log(`   链上总供应量: ${actualSupply.toString()}`);
            console.log(`   链上格式化: ${ethers.formatUnits(actualSupply, actualDecimals)} USDC`);

            if (actualSupply.toString() !== tokens.USDC.initialSupply) {
                console.log("❌ 链上数据与记录不一致！");
            }
        }
    }
}

main().catch(console.error);