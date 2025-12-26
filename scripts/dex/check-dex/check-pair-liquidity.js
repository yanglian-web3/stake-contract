// scripts/check-pair-liquidity.js
const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 检查交易对流动性...\n");

    const provider = ethers.provider;

    // 地址
    const factoryAddress = "0xAA292E8611aDF267e563f334Ee42320aC96D0463";
    const mntAddress = "0x2E2Ed0Cfd3AD2f1d34481277b3204d807Ca2F8c2";
    const usdcAddress = "0xD8a5a9b31c3C0232E196d518E89Fd8bF83AcAd43";
    const wethAddress = "0xf953b3A269d80e3eB0F2947630Da976B896A8C5b";
    const pairAddress = "0x8C9Aa4B3c81f8ea247758918cCDE56AdE6E7f067";

    // 1. 检查交易对合约
    console.log("1. 检查交易对合约...");
    const pairCode = await provider.getCode(pairAddress);
    console.log(`   交易对代码长度: ${pairCode.length} 字节`);

    // 2. 获取交易对储备量
    const pairABI = [
        "function token0() view returns (address)",
        "function token1() view returns (address)",
        "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
        "function totalSupply() view returns (uint)"
    ];

    try {
        const pair = new ethers.Contract(pairAddress, pairABI, provider);

        const token0 = await pair.token0();
        const token1 = await pair.token1();
        console.log(`   Token0: ${token0}`);
        console.log(`   Token1: ${token1}`);

        const reserves = await pair.getReserves();
        console.log(`   储备量: ${reserves.reserve0.toString()}, ${reserves.reserve1.toString()}`);

        const totalSupply = await pair.totalSupply();
        console.log(`   总流动性: ${totalSupply.toString()}`);

        // 检查是否是空池
        if (reserves.reserve0 === 0n || reserves.reserve1 === 0n) {
            console.log("\n⚠️  **警告: 交易对没有流动性！**");
            console.log("   需要添加流动性才能进行兑换计算");
        } else {
            console.log("\n✅ 交易对有流动性");
        }

    } catch (error) {
        console.log(`❌ 无法获取交易对信息: ${error.message}`);
    }

    // 3. 检查代币余额
    console.log("\n2. 检查代币余额...");

    const tokenABI = ["function balanceOf(address) view returns (uint256)"];

    const mntContract = new ethers.Contract(mntAddress, tokenABI, provider);
    const usdcContract = new ethers.Contract(usdcAddress, tokenABI, provider);

    // 检查交易对中的代币余额
    const mntInPair = await mntContract.balanceOf(pairAddress);
    const usdcInPair = await usdcContract.balanceOf(pairAddress);

    console.log(`   MNT 在交易对中: ${ethers.formatEther(mntInPair)}`);
    console.log(`   USDC 在交易对中: ${ethers.formatUnits(usdcInPair, 6)}`);

    // 4. 添加流动性的建议
    console.log("\n3. 建议:");
    if (mntInPair === 0n || usdcInPair === 0n) {
        console.log("   ❌ 交易对没有流动性，需要先添加流动性");
        console.log(`
   添加流动性步骤:
   1. 批准路由器使用您的代币
   2. 调用 addLiquidity() 或 addLiquidityETH()
   3. 或者运行部署脚本中的流动性添加部分
        `);
    } else {
        console.log("   ✅ 交易对有流动性，问题可能在路由器逻辑");
    }
}

main().catch(console.error);