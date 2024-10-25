import { toNano } from '@ton/core';
import { Bridge } from '../wrappers/Bridge';
import { compile, NetworkProvider } from '@ton/blueprint';

// testnet: EQDyD3ICi9YkGdIf19dJHoq-70Ng9lWY9lCbIVM-tfi_yp1v
export async function run(provider: NetworkProvider) {
    const orderNonce = Math.floor(Math.random() * 10000);
    const bridge = provider.open(
        Bridge.createFromConfig(
            {
                orderNonce,
            },
            await compile('Bridge'),
        ),
    );

    await bridge.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(bridge.address);

    console.log('ID', await bridge.getOrderNonce());
}
