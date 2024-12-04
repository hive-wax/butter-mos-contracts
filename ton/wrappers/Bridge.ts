import {
    Address,
    beginCell,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    Sender,
    SendMode,
    Slice,
} from '@ton/core';

export type BridgeConfig = {
    orderNonce: number;
};

export function bridgeConfigToCell(config: BridgeConfig): Cell {
    return beginCell().storeUint(config.orderNonce, 256).endCell();
}

export const Opcodes = {
    increase: 0x7e8764ef,
    messageIn: 0xd5f86120,
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

    async sendMessageIn(
        provider: ContractProvider,
        via: Sender,
        opts: {
            value: bigint;
            hash: bigint;
            v: bigint;
            r: bigint;
            s: bigint;
            receiptRoot: bigint;
            version: bigint;
            blockNum: number;
            chainId: number;
            addr: bigint;
            topics: bigint[];
            message: Cell;
            expectedAddress: bigint;
        },
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.messageIn, 32)
                .storeUint(0, 64)
                .storeUint(opts.hash ?? 0, 256)
                .storeUint(1, 8) // signature number
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
                        )
                        .endCell(),
                )
                .storeRef(
                    beginCell() // meta: receiptRoot, version, blockNum, chainId
                        .storeUint(opts.receiptRoot, 256)
                        .storeUint(opts.version, 256)
                        .storeUint(opts.blockNum, 256)
                        .storeUint(opts.chainId, 64)
                        .endCell(),
                )
                .storeRef(
                    beginCell() // MessageRelayPacked
                        .storeUint(opts.addr, 256)
                        .storeRef(
                            beginCell()
                                .storeUint(opts.topics[0], 256)
                                .storeUint(opts.topics[1], 256)
                                .storeUint(opts.topics[2], 256)
                                .endCell(),
                        )
                        .storeRef(opts.message)
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
            target: Slice;
            payload: Cell;
            initiator: Address;
            gasLimit: number;
        },
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.messageOut, 32)
                .storeUint(0, 64)
                .storeUint(opts.relay ? 1 : 0, 8)
                .storeUint(opts.msgType, 8)
                .storeUint(opts.toChain, 64)
                .storeAddress(opts.initiator)
                .storeSlice(opts.target)
                .storeUint(opts.gasLimit, 64)
                .storeRef(opts.payload)
                .endCell(),
        });
    }

    async getOrderNonce(provider: ContractProvider) {
        const result = await provider.get('get_order_nonce', []);
        return result.stack.readNumber();
    }
}
