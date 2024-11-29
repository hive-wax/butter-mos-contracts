import { Address, beginCell, toNano } from '@ton/core';
import { Bridge } from '../wrappers/Bridge';
import { NetworkProvider, sleep } from '@ton/blueprint';
import { PayloadCodec } from '../utils/payload';

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    const address = Address.parse(args.length > 0 ? args[0] : await ui.input('Bridge address'));

    if (!(await provider.isContractDeployed(address))) {
        ui.write(`Error: Contract at address ${address} is not deployed!`);
        return;
    }

    const bridge = provider.open(Bridge.createFromAddress(address));

    const counterBefore = await bridge.getOrderNonce();

    const target =
        '613062383639393163363231386233366331643139643461326539656230636533363036656234382E666163746F72792E6272696467652E6E656172';

    const t = beginCell().storeBuffer(Buffer.from(target, 'hex')).endCell();

    const payload =
        '0x1de78eb8658305a581b2f1610c96707b0204d5cba6a782b313672045fa5a87c800000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000e00000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000000000002101c6c3c3336cfe7cafd442fe1ba668142bcf49ac868e79b6687c3717587c20d02100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001449d6dae5d59b3af296df35bdc565371c8a563ef6000000000000000000000000';
    const codec = new PayloadCodec();

    await bridge.sendMessageOut(provider.sender(), {
        relay: false,
        msgType: 1,
        toChain: 1360100178526209n,
        target: t.beginParse(),
        payload: codec.encode(payload),
        initiator: Address.parse('0QBE2Qs7ub-3frxnGOWFfwBdVqUSeAv2NPl4KgdeC7TJMnNG'),
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
