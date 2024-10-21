let { create, readFromFile, writeToFile } = require("../../utils/create.js");
let { getChain, getToken } = require("../../utils/helper");

task("feeService:deploy", "Deploy the vault token")
  .setAction(async (taskArgs, hre) => {
    const { deploy } = hre.deployments;
    const accounts = await ethers.getSigners();
    const deployer = accounts[0];

    console.log("deployer address:", deployer.address);

    let FeeService = await ethers.getContractFactory("FeeService");
    let service_salt = process.env.FEE_SERVICE_SALT;
    let service_addr = await create(hre, deployer, "FeeService", [], [], service_salt);
    let service = FeeService.attach(service_addr);
    await (await service.initialize()).wait();
    console.log("owner:",await service.owner());
    let deployment = await readFromFile(hre.network.name);
    deployment[hre.network.name]["feeService"] = service_addr;
    await writeToFile(deployment);
  });

task("feeService:setBaseGas", "set Base Gas")
  .addParam("chain", "chain Id")
  .addParam("gas", "base gas Limit")
  .setAction(async (taskArgs, hre) => {
    let deployment = await readFromFile(hre.network.name);
    let service_addr = deployment[hre.network.name]["feeService"];
    if(!service_addr) throw "fee service not deploy";
    let FeeService = await ethers.getContractFactory("FeeService");
    let service = FeeService.attach(service_addr);

    await(await service.setBaseGas(taskArgs.chain, taskArgs.gas)).wait()
  });


task("feeService:setChainGasPrice", "set chainGas price")
  .addParam("chain", "chain Id")
  .addParam("token", "token address")
  .addParam("price", "chain gas price")
  .setAction(async (taskArgs, hre) => {
    let deployment = await readFromFile(hre.network.name);
    let service_addr = deployment[hre.network.name]["feeService"];
    if(!service_addr) throw "fee service not deploy";
    let FeeService = await ethers.getContractFactory("FeeService");
    let service = FeeService.attach(service_addr);

    await(await service.setChainGasPrice(taskArgs.chain, taskArgs.token, taskArgs.price)).wait()
  });

task("feeService:setTokenDecimals", "set Token Decimals")
  .addParam("token", "token address")
  .addParam("decimal", "token decimal")
  .setAction(async (taskArgs, hre) => {
    let deployment = await readFromFile(hre.network.name);
    let service_addr = deployment[hre.network.name]["feeService"];
    if(!service_addr) throw "fee service not deploy";
    let FeeService = await ethers.getContractFactory("FeeService");
    let service = FeeService.attach(service_addr);

    await(await service.setTokenDecimals(taskArgs.token, taskArgs.decimal)).wait()
  });


  task("feeService:setFeeReceiver", "set Token Decimals")
  .addParam("receiver", "receiver address")
  .setAction(async (taskArgs, hre) => {
    let deployment = await readFromFile(hre.network.name);
    let service_addr = deployment[hre.network.name]["feeService"];
    if(!service_addr) throw "fee service not deploy";
    let FeeService = await ethers.getContractFactory("FeeService");
    let service = FeeService.attach(service_addr);

    await(await service.setFeeReceiver(taskArgs.receiver)).wait()
  });


