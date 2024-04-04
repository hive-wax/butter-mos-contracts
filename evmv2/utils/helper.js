let fs = require("fs");
let path = require("path");

DEPLOY_FACTORY = "0x6258e4d2950757A749a4d4683A7342261ce12471";
let IDeployFactory_abi = [
    "function deploy(bytes32 salt, bytes memory creationCode, uint256 value) external",
    "function getAddress(bytes32 salt) external view returns (address)",
];
async function create(salt, bytecode, param) {
    let [wallet] = await ethers.getSigners();
    let factory = await ethers.getContractAt(IDeployFactory_abi, DEPLOY_FACTORY, wallet);
    let salt_hash = await ethers.utils.keccak256(await ethers.utils.toUtf8Bytes(salt));
    console.log("deploy factory address:", factory.address);
    console.log("deploy salt:", salt);
    let addr = await factory.getAddress(salt_hash);
    console.log("deployed to :", addr);

    let code = await ethers.provider.getCode(addr);
    let redeploy = false;
    if (code === "0x") {
        let create_code = ethers.utils.solidityPack(["bytes", "bytes"], [bytecode, param]);
        let create = await (await factory.deploy(salt_hash, create_code, 0)).wait();
        if (create.status == 1) {
            console.log("deployed to :", addr);
            redeploy = true;
        } else {
            console.log("deploy fail");
            throw "deploy fail";
        }
    } else {
        console.log("already deploy, please change the salt if if want to deploy another contract ...");
    }

    return [addr, redeploy];
}
async function getMos(chainId, network) {
    let deploy = await readFromFile(network);
    if (deploy[network]["mosProxy"]) {
        let Mos;
        if (chainId === 212 || chainId === 22776) {
            Mos = await ethers.getContractFactory("MAPOmnichainServiceRelayV2");
        } else {
            Mos = await ethers.getContractFactory("MAPOmnichainServiceV2");
        }
        let mos = Mos.attach(deploy[network]["mosProxy"]);
        return mos;
    }
    return undefined;
}

async function readFromFile(network) {
    let p = path.join(__dirname, "../deployments/mos.json");
    let deploy;
    if (!fs.existsSync(p)) {
        deploy = {};
        deploy[network] = {};
    } else {
        let rawdata = fs.readFileSync(p);
        deploy = JSON.parse(rawdata);
        if (!deploy[network]) {
            deploy[network] = {};
        }
    }

    return deploy;
}

async function getToken(chainId, token) {
    if (chainId === 1360100178526209 || chainId === 1360100178526210) {
        // near
        if (token.length > 4) {
            return token;
        }
    } else if (chainId === 728126428 || chainId === 728126429) {
        // tron
        if (token.length === 34) {
            return token;
        }
    } else {
        if (token.substr(0, 2) === "0x") {
            return token;
        }
    }
    let tokens = await getTokensFromFile(chainId);
    if (tokens[chainId][token]) {
        return tokens[chainId][token];
    }

    throw "token not support ..";
}

async function getTokensFromFile(network) {
    let p = path.join(__dirname, "./token.json");
    let tokens;
    if (!fs.existsSync(p)) {
        tokens = {};
        tokens[network] = {};
    } else {
        let rawdata = fs.readFileSync(p);
        tokens = JSON.parse(rawdata);
        if (!tokens[network]) {
            tokens[network] = {};
        }
    }

    return tokens;
}

async function writeToFile(deploy) {
    let p = path.join(__dirname, "../deployments/mos.json");
    await folder("../deployments/");
    // fs.writeFileSync(p,JSON.stringify(deploy));
    fs.writeFileSync(p, JSON.stringify(deploy, null, "\t"));
}

const folder = async (reaPath) => {
    const absPath = path.resolve(__dirname, reaPath);
    try {
        await fs.promises.stat(absPath);
    } catch (e) {
        // {recursive: true}
        await fs.promises.mkdir(absPath, { recursive: true });
    }
};
module.exports = {
    writeToFile,
    readFromFile,
    getMos,
    create,
    getToken,
};
