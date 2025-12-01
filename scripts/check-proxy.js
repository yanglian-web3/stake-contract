const { ethers } = require("ethers")
const {INFURA_API_KEY} = require("./const-data");

// 计算 EIP-1967 存储槽
function calculateEIP1967Slots() {
    console.log("🔢 计算 EIP-1967 标准存储槽...");

    // 实现地址槽
    const implementationHash = ethers.keccak256(
        ethers.toUtf8Bytes("eip1967.proxy.implementation")
    );
    const IMPLEMENTATION_SLOT = BigInt(implementationHash) - 1n;
    console.log("IMPLEMENTATION_SLOT:", "0x" + IMPLEMENTATION_SLOT.toString(16).padStart(64, '0'));

    // 管理员地址槽
    const adminHash = ethers.keccak256(
        ethers.toUtf8Bytes("eip1967.proxy.admin")
    );
    const ADMIN_SLOT = BigInt(adminHash) - 1n;
    console.log("ADMIN_SLOT:", "0x" + ADMIN_SLOT.toString(16).padStart(64, '0'));

    // 信标地址槽
    const beaconHash = ethers.keccak256(
        ethers.toUtf8Bytes("eip1967.proxy.beacon")
    );
    const BEACON_SLOT = BigInt(beaconHash) - 1n;
    console.log("BEACON_SLOT:", "0x" + BEACON_SLOT.toString(16).padStart(64, '0'));

    return {
        IMPLEMENTATION: "0x" + IMPLEMENTATION_SLOT.toString(16).padStart(64, '0'),
        ADMIN: "0x" + ADMIN_SLOT.toString(16).padStart(64, '0'),
        BEACON: "0x" + BEACON_SLOT.toString(16).padStart(64, '0')
    };
}

async function detectProxy(contractAddress) {
    console.log("🔍 检测合约类型:", contractAddress)

    // 连接到 Sepolia
    const provider = new ethers.JsonRpcProvider(`https://sepolia.infura.io/v3/${INFURA_API_KEY}`)

    // EIP-1967 标准存储槽
    const SLOTS = calculateEIP1967Slots()

    try {
        // 检查是否是 EIP-1967 代理
        const implStorage = await provider.getStorage(contractAddress, SLOTS.IMPLEMENTATION)
        const adminStorage = await provider.getStorage(contractAddress, SLOTS.ADMIN)

        console.log("实现地址存储:", implStorage)
        console.log("管理员地址存储:", adminStorage)

        if (implStorage !== "0x" + "0".repeat(64)) {
            const implAddress = "0x" + implStorage.slice(-40)
            console.log("✅ 检测到 EIP-1967 代理合约")
            console.log("   实现地址:", implAddress)
            return { type: "EIP-1967", implementation: implAddress }
        }

        // 检查是否是透明代理（OpenZeppelin 旧版本）
        const OZ_ADMIN_SLOT = "0x10d6a54a4754c8869d6886b5f5d7fbfa5b4522237ea5c60d11bc4e7a1ff9390b"
        const ozAdminStorage = await provider.getStorage(contractAddress, OZ_ADMIN_SLOT)

        if (ozAdminStorage !== "0x" + "0".repeat(64)) {
            console.log("✅ 检测到 OpenZeppelin 透明代理")
            return { type: "OZ-Transparent" }
        }

        console.log("❌ 不是标准代理合约")
        return { type: "Not-Proxy" }

    } catch (error) {
        console.log("❌ 检测失败:", error.message)
        return { type: "Error", error: error.message }
    }
}

// 使用您的合约地址
const contractAddress = "0xCC2B75Acee22512ff1Fddf440877417370D0eCA4"
detectProxy(contractAddress)
    .then(result => console.log("结果:", result))
    .catch(console.error)