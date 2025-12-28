const { ethers } = require("hardhat");

async function main() {
    console.log("🔧 修复 USDC 供应量...");

    const [deployer] = await ethers.getSigners();
    console.log("部署账户:", deployer.address);

    // USDC 合约地址（从之前的部署获取）
    const usdcAddress = "0xFD471836031dc5108809D173A067e8486B9047A3";

    try {
        // 获取 USDC 合约
        const usdc = await ethers.getContractAt("ERC20Mock", usdcAddress);

        // 检查当前余额
        const currentBalance = await usdc.balanceOf(deployer.address);
        const decimals = await usdc.decimals();

        console.log(`当前 USDC 余额: ${ethers.formatUnits(currentBalance, decimals)}`);

        // 如果需要，可以铸造更多 USDC
        // 注意：只有合约拥有者可以调用 mint 函数（如果 ERC20Mock 有的话）
        // 如果没有 mint 函数，需要重新部署

        // 重新部署 USDC
        console.log("\n重新部署 USDC...");
        const Token = await ethers.getContractFactory("ERC20Mock");

        const newUsdc = await Token.deploy(
            "Test USDC",
            "USDC",
            deployer.address,
            ethers.parseUnits("1000000", 6) // 1,000,000 USDC
        );
        await newUsdc.waitForDeployment();
        const newUsdcAddress = await newUsdc.getAddress();

        const newBalance = await newUsdc.balanceOf(deployer.address);

        console.log(`✅ 新 USDC 地址: ${newUsdcAddress}`);
        console.log(`新 USDC 余额: ${ethers.formatUnits(newBalance, 6)}`);

        // 更新配置文件
        console.log("\n请手动更新配置文件中的 USDC 地址:", newUsdcAddress);

    } catch (error) {
        console.error("修复失败:", error);
    }
}

main().catch(console.error);