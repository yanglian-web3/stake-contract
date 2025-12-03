const { ethers, upgrades } = require("hardhat");

async function main() {
    console.log("🚀 开始本地测试（可升级合约）...");

    const [deployer] = await ethers.getSigners();
    console.log("测试账户:", deployer.address);

    // 1. 部署测试代币
    console.log("\n1. 部署测试代币...");
    const MetaNodeToken = await ethers.getContractFactory("ERC20Mock");
    const metaNodeToken = await MetaNodeToken.deploy(
        "MetaNode Test",
        "MNT",
        deployer.address,
        ethers.parseEther("1000000")
    );
    await metaNodeToken.waitForDeployment();
    const tokenAddress = await metaNodeToken.getAddress();
    console.log("MetaNode 代币地址:", tokenAddress);

    // 2. 部署可升级的质押合约
    console.log("\n2. 部署可升级质押合约...");
    const Stake = await ethers.getContractFactory("MetaNodeStake");

    const startBlock = (await ethers.provider.getBlockNumber()) + 10;
    const endBlock = startBlock + 100000;
    const metaNodePerBlock = ethers.parseEther("0.02");

    // 使用 upgrades.deployProxy 部署代理合约
    const stakeContract = await upgrades.deployProxy(
        Stake,
        [
            tokenAddress,
            startBlock,
            endBlock,
            metaNodePerBlock
        ],
        { initializer: "initialize" }
    );

    await stakeContract.waitForDeployment();
    const stakeAddress = await stakeContract.getAddress();
    console.log("质押合约地址（代理）:", stakeAddress);

    // 3. 初始化合约（添加 ETH 池）
    console.log("\n3. 初始化 ETH 池...");
    const tx = await stakeContract.addPool(
        ethers.ZeroAddress, // ETH 池地址为 0
        ethers.parseEther("10"), // 权重
        ethers.parseEther("0.001"), // 最小存款 0.001 ETH
        100, // 解锁区块数
        false // 不更新其他池
    );
    await tx.wait();
    console.log("ETH 池添加成功");

    // 4. 转入奖励代币到质押合约
    console.log("\n4. 准备奖励代币...");
    const rewardAmount = ethers.parseEther("10000");
    await metaNodeToken.transfer(stakeAddress, rewardAmount);
    console.log("转入奖励:", ethers.formatEther(rewardAmount), "MNT");

    // 5. 测试 depositETH 函数
    console.log("\n5. 测试 depositETH...");
    const depositAmount = ethers.parseEther("0.01"); // 0.01 ETH

    try {
        // 估算 Gas
        const gasEstimate = await stakeContract.depositETH.estimateGas({
            value: depositAmount
        });
        console.log("Gas 估算:", gasEstimate.toString());

        // 执行存款
        const depositTx = await stakeContract.depositETH({
            value: depositAmount,
            gasLimit: gasEstimate
        });

        const receipt = await depositTx.wait();
        console.log("✅ 存款成功!");
        console.log("交易哈希:", receipt.hash);
        console.log("Gas 实际使用:", receipt.gasUsed.toString());

        // 6. 检查结果
        console.log("\n6. 检查存款结果...");
        const stakedBalance = await stakeContract.stakingBalance(0, deployer.address);
        console.log("质押余额:", ethers.formatEther(stakedBalance), "ETH");

        const pendingRewards = await stakeContract.pendingMetaNode(0, deployer.address);
        console.log("待领取奖励:", ethers.formatEther(pendingRewards), "MNT");

    } catch (error) {
        console.log("❌ 存款失败:", error.message);
        console.log("完整错误:", error);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});