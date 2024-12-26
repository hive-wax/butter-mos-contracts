import { toNano } from '@ton/core';
import { Bridge } from '../wrappers/Bridge';
import { compile, NetworkProvider } from '@ton/blueprint';

// testnet: kQDJdptC1nHSC9XUR2q5fSFIY8hAHqZYqfoZRF01Y6joXYfJ
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

    await bridge.sendDeploy(provider.sender(), toNano('0.08'));

    await provider.waitForDeploy(bridge.address);

    console.log('ID', await bridge.getOrderNonce());
}
