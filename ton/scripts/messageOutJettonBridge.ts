import { Address, beginCell, toNano } from '@ton/core';
import { Bridge, Opcodes } from '../wrappers/Bridge';
import { NetworkProvider, sleep } from '@ton/blueprint';
import { PayloadCodec } from '../utils/payload';
import { JettonWallet } from '@ton/ton';

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    const address = Address.parse(args.length > 0 ? args[0] : await ui.input('Bridge address'));

    if (!(await provider.isContractDeployed(address))) {
        ui.write(`Error: Contract at address ${address} is not deployed!`);
        return;
    }

    const bridge = provider.open(Bridge.createFromAddress(address));

    const target =
        '613062383639393163363231386233366331643139643461326539656230636533363036656234382E666163746F72792E6272696467652E6E656172';

    const t = beginCell().storeBuffer(Buffer.from(target, 'hex')).endCell();

    const payload =
        '0x1de78eb8658305a581b2f1610c96707b0204d5cba6a782b313672045fa5a87c800000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000e00000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000000000002101c6c3c3336cfe7cafd442fe1ba668142bcf49ac868e79b6687c3717587c20d02100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001449d6dae5d59b3af296df35bdc565371c8a563ef6000000000000000000000000';
    const codec = new PayloadCodec();

    const messageOutPayload = beginCell()
        .storeUint(Opcodes.messageOut, 32) // op::message_out
        .storeUint(0, 64) // query_id
        .storeBit(false) // relay
        .storeUint(3, 32) // msgType
        .storeUint(1360100178526209n, 64) // toChain
        .storeAddress(Address.parse('0QBE2Qs7ub-3frxnGOWFfwBdVqUSeAv2NPl4KgdeC7TJMnNG'))
        .storeSlice(t.beginParse()) // target
        .storeUint(10000000, 64) // gasLimit
        .storeRef(codec.encode(payload)) // payload
        .endCell();

    const transferMsg = beginCell()
        .storeUint(0xf8a7ea5, 32) // transfer op
        .storeUint(0, 64) // query_id
        .storeCoins(toNano('10')) // amount
        .storeAddress(address) // destination
        .storeAddress(provider.sender().address!) // response_destination
        .storeUint(0, 1) // custom_payload
        .storeCoins(toNano('0.05')) // forward_ton_amount
        .storeRef(messageOutPayload) // message_out payload
        .endCell();

    await provider.sender().send({
        to: Address.parse('kQC_LseD66OZzlu0ZDMoADIgDKdrkmBoEgvXNid_cjQJoTmd'),
        value: toNano('0.02'),
        body: transferMsg,
    });

    ui.write('Waiting for bridge to process message...');

    const counterBefore = await bridge.getOrderNonce();

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
