import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type BridgeConfig = {
    orderId: number;
};

export function bridgeConfigToCell(config: BridgeConfig): Cell {
    return beginCell().storeUint(config.orderId, 64).endCell();
}

export const Opcodes = {
    increase: 0x7e8764ef,
    verify: 0x3b3cca17,
    messageOut: 0x136a3529,
};

export class Bridge implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

    static createFromAddress(address: Address) {
        return new Bridge(address);
    }

    static createFromConfig(config: BridgeConfig, code: Cell, workchain = 0) {
        const data = bridgeConfigToCell(config);
        const init = { code, data };
        return new Bridge(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendVerify(
        provider: ContractProvider,
        via: Sender,
        opts: {
            value: bigint;
            hash: bigint;
            v: bigint;
            r: bigint;
            s: bigint;
            expectedAddress: bigint;
        },
    ) {
        const receiptRoot = 0;
        const version = 0;
        const blockNum = 0;
        const chainId = 0;

        const addr = 0;
        const topics = [0, 0, 0];
        const data = 0;
        const message = beginCell().storeUint(2, 256).endCell().beginParse();
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.verify, 32)
                .storeUint(0, 64)
                .storeUint(opts.hash ?? 0, 256)
                .storeUint(3, 8) // signature number
                .storeRef(
                    beginCell()
                        .storeRef(
                            beginCell().storeUint(opts.v, 8).storeUint(opts.r, 256).storeUint(opts.s, 256).endCell(),
                        )
                        .storeRef(
                            beginCell().storeUint(opts.v, 8).storeUint(opts.r, 256).storeUint(opts.s, 256).endCell(),
                        )
                        .storeRef(
                            beginCell().storeUint(opts.v, 8).storeUint(opts.r, 256).storeUint(opts.s, 256).endCell(),
                        ),
                )
                .storeRef(
                    beginCell() // meta: receiptRoot, version, blockNum, chainId
                        .storeUint(receiptRoot, 256)
                        .storeUint(version, 256)
                        .storeUint(blockNum, 256)
                        .storeUint(chainId, 256)
                        .endCell(),
                )
                .storeRef(
                    beginCell() // MessageRelayPacked
                        .storeUint(addr, 256)
                        .storeRef(
                            beginCell()
                                .storeUint(topics[0], 256)
                                .storeUint(topics[1], 256)
                                .storeUint(topics[2], 256)
                                .endCell(),
                        )
                        .storeSlice(message)
                        .endCell(),
                )
                .storeUint(opts.expectedAddress, 160)
                .endCell(),
        });
    }

    async sendMessageOut(
        provider: ContractProvider,
        via: Sender,
        opts: {
            value: bigint;
            relay: boolean;
            msgType: number;
            toChain: bigint;
            target: bigint;
            payload: string;
            gasLimit: number;
        },
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.messageOut, 32)
                .storeUint(0, 64)
                .storeRef(
                    beginCell()
                        .storeUint(opts.relay ? 1 : 0, 8)
                        .storeUint(opts.msgType, 8)
                        .storeUint(opts.toChain, 64)
                        .storeSlice(beginCell().storeUint(BigInt(opts.target), 512).endCell().beginParse())
                        .storeRef(beginCell().storeUint(1, 8).endCell())
                        .storeUint(opts.gasLimit, 64)
                        .endCell(),
                )
                .endCell(),
        });
    }

    async getOrderID(provider: ContractProvider) {
        const result = await provider.get('get_order_id', []);
        return result.stack.readNumber();
    }
}
