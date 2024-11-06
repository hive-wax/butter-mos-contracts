import { Address, toNano } from '@ton/core';
import { Bridge } from '../wrappers/Bridge';
import { NetworkProvider, sleep } from '@ton/blueprint';

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    const address = Address.parse(args.length > 0 ? args[0] : await ui.input('Bridge address'));

    if (!(await provider.isContractDeployed(address))) {
        ui.write(`Error: Contract at address ${address} is not deployed!`);
        return;
    }

    const bridge = provider.open(Bridge.createFromAddress(address));

    const counterBefore = await bridge.getOrderNonce();

    await bridge.sendMessageOut(provider.sender(), {
        relay: false,
        msgType: 0,
        toChain: 56n,
        target: BigInt('0x70997970c51812dc3a010c7d01b50e0d17dc79c8'),
        payload: 'message',
        gasLimit: 200000000,
        value: toNano('0.06'),
    });

    ui.write('Waiting for bridge to message out...');

    let counterAfter = await bridge.getOrderNonce();
    let attempt = 1;
    while (counterAfter === counterBefore) {
        ui.setActionPrompt(`Attempt ${attempt}`);
        await sleep(2000);
        counterAfter = await bridge.getOrderNonce();
        attempt++;
    }

    ui.clearActionPrompt();
    ui.write('Bridge message out successfully!');
}
