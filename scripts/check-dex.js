// scripts/check-dex.js
const { ethers } = require("hardhat");

async function main() {
    const provider = new ethers.JsonRpcProvider("http://localhost:8545");

    // 检查地址是否存在合约
    const routerAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

    console.log("🔍 检查 DEX 路由器合约...");
    console.log("地址:", routerAddress);

    // 检查是否有合约代码
    const code = await provider.getCode(routerAddress);
    console.log("合约代码长度:", code.length, "字节");

    if (code === "0x") {
        console.error("❌ 地址上没有合约！");
        return;
    }

    console.log("✅ 地址上有合约代码");

    // 尝试调用 getAmountsOut
    const routerABI = ["function getAmountsOut(uint amountIn, address[] memory path) view returns (uint[] memory amounts)"];

    try {
        const router = new ethers.Contract(routerAddress, routerABI, provider);

        // 使用任意两个地址测试
        const testPath = [
            "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
            "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
        ];
        const testAmount = ethers.parseEther("1");

        console.log("\n测试调用 getAmountsOut...");
        const amounts = await router.getAmountsOut(testAmount, testPath);
        console.log("✅ getAmountsOut 调用成功:", amounts);

    } catch (error) {
        console.error("❌ getAmountsOut 调用失败:", error.message);
        console.log("该地址上的合约不支持 DEX 功能");
    }
}

main().catch(console.error);