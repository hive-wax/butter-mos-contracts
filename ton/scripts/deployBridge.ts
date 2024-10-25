import { toNano } from '@ton/core';
import { Bridge } from '../wrappers/Bridge';
import { compile, NetworkProvider } from '@ton/blueprint';

// testnet: EQD9pVSCmODM-M3V380x4OH1kG6a7tTTnsP00n7M59iD5etS
export async function run(provider: NetworkProvider) {
    const orderId = Math.floor(Math.random() * 10000);
    const bridge = provider.open(
        Bridge.createFromConfig(
            {
                orderId,
            },
            await compile('Bridge'),
        ),
    );

    await bridge.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(bridge.address);

    console.log('ID', await bridge.getOrderID());
}
