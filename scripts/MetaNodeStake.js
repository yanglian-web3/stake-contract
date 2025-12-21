// scripts/deploy-with-distribution.js
const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🚀 部署代币并自动分配...");

    const [deployer] = await ethers.getSigners();
    console.log("部署者:", deployer.address);

    // 预分配的账户和金额
    const distributions = [
        {
            address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
            amount: "1000"  // 1000 个代币
        },
        {
            address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
            amount: "1000"
        },
        {
            address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
            amount: "1000"
        }
    ];

    // 步骤1：部署代币
    console.log("\n1️⃣ 部署 MetaNodeToken...");
    const MetaNodeTokenFactory = await ethers.getContractFactory("MetaNodeToken");
    const token = await MetaNodeTokenFactory.deploy();
    await token.waitForDeployment();

    const tokenAddress = await token.getAddress();
    console.log("✅ 代币地址:", tokenAddress);

    // 步骤2：给预分配账户转账
    console.log("\n2️⃣ 自动分配代币...");
    const decimals = await token.decimals();
    const symbol = await token.symbol();

    for (const dist of distributions) {
        try {
            const amountInWei = ethers.parseUnits(dist.amount, decimals);

            console.log(`转账 ${dist.amount} ${symbol} 到 ${dist.address}...`);

            const tx = await token.transfer(dist.address, amountInWei);
            await tx.wait();

            console.log(`✅ 分配成功`);
        } catch (error) {
            console.log(`❌ 分配失败: ${error.message}`);
        }
    }

    // 步骤3：检查余额
    console.log("\n3️⃣ 检查分配结果:");
    for (const dist of distributions) {
        const balance = await token.balanceOf(dist.address);
        console.log(`${dist.address}: ${ethers.formatUnits(balance, decimals)} ${symbol}`);
    }

    // 检查部署者余额
    const deployerBalance = await token.balanceOf(deployer.address);
    console.log(`部署者余额: ${ethers.formatUnits(deployerBalance, decimals)} ${symbol}`);

    // 步骤4：部署质押合约（可选）
    console.log("\n4️⃣ 部署质押合约...");
    const currentBlock = await ethers.provider.getBlockNumber();

    const Stake = await ethers.getContractFactory("MetaNodeStake");
    const stake = await upgrades.deployProxy(
        Stake,
        [
            tokenAddress,
            currentBlock + 10,
            currentBlock + 10 + (30 * 7200),
            "20000000000000000"
        ],
        { initializer: "initialize" }
    );

    await stake.waitForDeployment();
    const stakeAddress = await stake.getAddress();

    console.log("✅ 质押合约地址:", stakeAddress);

    // 保存信息
    console.log("\n🎉 部署完成！");
    console.log("代币:", tokenAddress);
    console.log("质押:", stakeAddress);
}

main().catch(console.error);