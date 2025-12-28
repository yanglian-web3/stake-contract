// scripts/transfer-tokens-to-metamask.js
const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();

    // 你的 MetaMask 地址
    const metamaskAddress = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";

    console.log("从账户转账:", deployer.address);
    console.log("转账到账户:", metamaskAddress);
    console.log("=".repeat(50));

    // 获取代币合约
    const tokenAAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    const tokenBAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

    const tokenA = await hre.ethers.getContractAt("ERC20", tokenAAddress);
    const tokenB = await hre.ethers.getContractAt("ERC20", tokenBAddress);

    // 转账金额
    const amountA = hre.ethers.parseEther("1000"); // 1000 TKNA
    const amountB = hre.ethers.parseUnits("1000", 6); // 1000 TKNB

    // 转账 TKNA
    console.log("\n1. 转账 TKNA...");
    const txA = await tokenA.transfer(metamaskAddress, amountA);
    await txA.wait();
    console.log("✅ 转账", hre.ethers.formatEther(amountA), "TKNA");

    // 转账 TKNB
    console.log("\n2. 转账 TKNB...");
    const txB = await tokenB.transfer(metamaskAddress, amountB);
    await txB.wait();
    console.log("✅ 转账", hre.ethers.formatUnits(amountB, 6), "TKNB");

    // 检查余额
    console.log("\n3. 检查余额...");
    const balanceA = await tokenA.balanceOf(metamaskAddress);
    const balanceB = await tokenB.balanceOf(metamaskAddress);

    console.log("📊 余额明细:");
    console.log("   ETH:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(metamaskAddress)));
    console.log("   TKNA:", hre.ethers.formatEther(balanceA));
    console.log("   TKNB:", hre.ethers.formatUnits(balanceB, 6));

    console.log("\n🎉 转账完成！现在可以在前端测试 DEX 了。");
}

main().catch(console.error);