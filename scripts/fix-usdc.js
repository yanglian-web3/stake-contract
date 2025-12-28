// scripts/fix-usdc.js
const { ethers } = require("hardhat");
const fs = require('fs');

async function main() {
    console.log("🔧 修复 USDC 供应量问题...");

    const [deployer] = await ethers.getSigners();
    console.log("部署账户:", deployer.address);

    // 直接部署正确的 USDC
    console.log("\n部署正确的 USDC 代币...");

    const Token = await ethers.getContractFactory("ERC20Mock");

    // 部署正确的 USDC (1,000,000 个，6位小数)
    const usdc = await Token.deploy(
        "Test USDC",
        "USDC",
        deployer.address,
        ethers.parseUnits("1000000", 6) // 1,000,000 USDC
    );

    await usdc.waitForDeployment();
    const usdcAddress = await usdc.getAddress();

    const decimals = await usdc.decimals();
    const totalSupply = await usdc.totalSupply();
    const deployerBalance = await usdc.balanceOf(deployer.address);

    console.log(`✅ 新 USDC 地址: ${usdcAddress}`);
    console.log(`总供应量: ${ethers.formatUnits(totalSupply, decimals)} USDC`);
    console.log(`部署者余额: ${ethers.formatUnits(deployerBalance, decimals)} USDC`);

    // 更新配置文件
    console.log("\n更新配置文件...");

    const configPath = 'deployed-configs/tokens.json';
    if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

        config.USDC = {
            address: usdcAddress,
            name: "Test USDC",
            symbol: "USDC",
            decimals: Number(decimals),
            initialSupply: totalSupply.toString(),
            deployerBalance: deployerBalance.toString(),
            color: "blue"
        };

        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        console.log("✅ USDC 配置已更新");
    } else {
        console.log("⚠️  配置文件不存在，创建新配置...");

        const config = {
            USDC: {
                address: usdcAddress,
                name: "Test USDC",
                symbol: "USDC",
                decimals: Number(decimals),
                initialSupply: totalSupply.toString(),
                deployerBalance: deployerBalance.toString(),
                color: "blue"
            }
        };

        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        console.log("✅ 创建新配置文件");
    }

    console.log("\n🎉 USDC 修复完成！");
    console.log("建议重新运行质押系统部署以更新质押池:");
    console.log("npm run deploy:stake");
}

main().catch(console.error);