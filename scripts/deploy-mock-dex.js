const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 部署本地测试 DEX 路由器...");

    const [deployer] = await ethers.getSigners();
    console.log("部署者地址:", deployer.address);

    // 1. 部署 MockDexRouter
    const MockDexRouter = await ethers.getContractFactory("MockDexRouter");
    const mockRouter = await MockDexRouter.deploy();
    await mockRouter.waitForDeployment();

    const routerAddress = await mockRouter.getAddress();
    console.log("✅ MockDexRouter 部署完成:", routerAddress);

    // 2. 部署一些测试代币（如果还没有）
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");

    console.log("\n🪙 部署测试代币...");

    const tokenA = await ERC20Mock.deploy(
        "Test Token A",
        "TOKENA",
        deployer.address,
        ethers.parseEther("1000000")
    );
    await tokenA.waitForDeployment();

    const tokenB = await ERC20Mock.deploy(
        "Test Token B",
        "TOKENB",
        deployer.address,
        ethers.parseEther("1000000")
    );
    await tokenB.waitForDeployment();

    const tokenC = await ERC20Mock.deploy(
        "Test Token C",
        "TOKENC",
        deployer.address,
        ethers.parseEther("1000000")
    );
    await tokenC.waitForDeployment();

    console.log("✅ 测试代币部署完成:");
    console.log("TOKENA:", await tokenA.getAddress());
    console.log("TOKENB:", await tokenB.getAddress());
    console.log("TOKENC:", await tokenC.getAddress());

    // 3. 输出配置
    console.log("\n📋 前端配置:");
    console.log(`
    // 复制到前端配置
    export const LOCAL_DEX_CONFIG = {
        routerAddress: "${routerAddress}",
        tokens: {
            "TOKENA": "${await tokenA.getAddress()}",
            "TOKENB": "${await tokenB.getAddress()}",
            "TOKENC": "${await tokenC.getAddress()}"
        }
    };
    `);

    return {
        routerAddress,
        tokens: {
            TOKENA: await tokenA.getAddress(),
            TOKENB: await tokenB.getAddress(),
            TOKENC: await tokenC.getAddress()
        }
    };
}

main().catch((error) => {
    console.error("部署失败:", error);
    process.exitCode = 1;
});