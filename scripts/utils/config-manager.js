// # 配置管理

const fs = require('fs');
const path = require('path');

class ConfigManager {
    constructor(configDir = 'deployed-configs') {
        this.configDir = configDir;
        this.ensureConfigDir();
    }

    ensureConfigDir() {
        if (!fs.existsSync(this.configDir)) {
            fs.mkdirSync(this.configDir, { recursive: true });
        }
    }

    // 保存配置到 JSON 文件
    saveConfig(configName, data) {
        const filePath = path.join(this.configDir, `${configName}.json`);

        // 处理 BigInt 序列化
        const jsonString = JSON.stringify(data, (key, value) => {
            if (typeof value === 'bigint') {
                return value.toString();
            }
            return value;
        }, 2);

        fs.writeFileSync(filePath, jsonString);
        console.log(`✅ 配置已保存到: ${filePath}`);
        return filePath;
    }

    // 加载配置
    loadConfig(configName) {
        const filePath = path.join(this.configDir, `${configName}.json`);
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        }
        return null;
    }

    // 合并多个配置
    mergeConfigs(configs) {
        const merged = {};
        configs.forEach(config => {
            Object.assign(merged, config);
        });
        return merged;
    }

    // 生成前端配置
    generateFrontendConfig(deploymentData) {
        const { tokens, stakeContract, dexContracts } = deploymentData;

        return {
            chainId: 31337,
            networkName: "localhost",
            rpcUrl: "http://localhost:8545",
            timestamp: new Date().toISOString(),

            tokens: tokens.reduce((acc, token) => {
                acc[token.symbol] = {
                    address: token.address,
                    symbol: token.symbol,
                    name: token.name,
                    decimals: token.decimals
                };
                return acc;
            }, {}),

            stakeContract: {
                address: stakeContract.address,
                name: "MetaNodeStake"
            },

            dexContracts: dexContracts || {},

            testAccounts: deploymentData.testAccounts || []
        };
    }
}

module.exports = ConfigManager;