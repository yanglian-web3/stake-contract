// scripts/deploy-local-fixed-v2.js
const { ethers, upgrades } = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("🚀 开始本地部署...");

    const [deployer] = await ethers.getSigners();
    console.log("部署账户:", deployer.address);
    console.log("账户余额:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

    // 1. 检查是否已经有代币
    console.log("\n1. 检查代币...");
    let tokenAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

    try {
        const code = await ethers.provider.getCode(tokenAddress);
        if (code === '0x') {
            console.log("部署新代币...");
            const Token = await ethers.getContractFactory("ERC20Mock");
            const token = await Token.deploy(
                "MetaNode Test",
                "MNT",
                deployer.address,
                ethers.parseEther("1000000")
            );
            await token.waitForDeployment();
            tokenAddress = await token.getAddress();
            console.log("✅ 代币地址:", tokenAddress);
        } else {
            console.log("✅ 使用现有代币:", tokenAddress);
        }
    } catch (error) {
        console.log("使用默认代币地址");
    }

    // 2. 部署代理合约
    console.log("\n2. 部署质押合约代理...");

    const currentBlock = await ethers.provider.getBlockNumber();
    const startBlock = currentBlock + 10;
    const endBlock = startBlock + 100000;
    const metaNodePerBlock = ethers.parseEther("0.02");

    console.log("部署参数:");
    console.log("- 开始区块:", startBlock);
    console.log("- 结束区块:", endBlock);
    console.log("- 每区块奖励:", ethers.formatEther(metaNodePerBlock));

    const Stake = await ethers.getContractFactory("MetaNodeStake");

    console.log("部署代理合约...");
    const stakeContract = await upgrades.deployProxy(
        Stake,
        [tokenAddress, startBlock, endBlock, metaNodePerBlock],
        { initializer: "initialize" }
    );

    await stakeContract.waitForDeployment();
    const proxyAddress = await stakeContract.getAddress();
    console.log("✅ 代理合约地址:", proxyAddress);

    // 3. 添加ETH池
    console.log("\n3. 添加ETH池...");

    const addPoolTx = await stakeContract.addPool(
        ethers.ZeroAddress,
        ethers.parseEther("10"),
        ethers.parseEther("0.001"),
        100,
        false
    );
    await addPoolTx.wait();
    console.log("✅ ETH池添加成功");

    // 4. 测试合约 - 使用安全的函数调用
    console.log("\n4. 测试合约...");

    try {
        // 先测试 poolLength
        const poolLength = await stakeContract.poolLength();
        console.log("✅ poolLength:", poolLength.toString());

        // 尝试测试 stakingBalance
        try {
            const balance = await stakeContract.stakingBalance(0, deployer.address);
            console.log("✅ stakingBalance:", ethers.formatEther(balance));
        } catch (error) {
            console.log("stakingBalance 失败，尝试其他函数...");
        }

        // 尝试测试 userInfo（如果存在）
        try {
            const userInfo = await stakeContract.userInfo(0, deployer.address);
            console.log("✅ userInfo:", userInfo);
        } catch (error) {
            console.log("userInfo 不存在或失败:", error.message);
        }

        // 测试存款
        console.log("\n5. 测试存款...");
        const depositTx = await stakeContract.depositETH({
            value: ethers.parseEther("0.01")
        });
        await depositTx.wait();
        console.log("✅ 存款成功");

        // 再次检查余额
        const finalBalance = await stakeContract.stakingBalance(0, deployer.address);
        console.log("✅ 存款后余额:", ethers.formatEther(finalBalance));

    } catch (error) {
        console.log("测试失败:", error.message);
    }

    // 5. 保存信息
    console.log("\n6. 保存部署信息...");

    const info = {
        proxy: proxyAddress,
        token: tokenAddress,
        network: "hardhat",
        deployer: deployer.address,
        timestamp: new Date().toISOString()
    };

    fs.writeFileSync('deployment.json', JSON.stringify(info, null, 2));
    console.log("✅ 信息已保存到 deployment.json");

    console.log("\n=== 部署总结 ===");
    console.log("代理合约:", proxyAddress);
    console.log("代币地址:", tokenAddress);
    console.log("部署完成！");
}

main().catch((error) => {
    console.error("部署失败:", error);
    process.exit(1);
});