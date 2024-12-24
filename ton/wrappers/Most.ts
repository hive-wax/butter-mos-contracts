import {
    Address,
    beginCell,
    BitBuilder,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    Sender,
    SendMode,
} from '@ton/core';
import { Opcodes } from './Bridge';

export type MostConfig = {
    orderNonce: number;
};

export function mostConfigToCell(config: MostConfig): Cell {
    return beginCell()
        .storeUint(config.orderNonce, 256)
        .storeAddress(Address.parse('EQBAYsrbNBd0v2nWTis0lWhWHktMEELC9MCBYo1oJltLsI3U'))
        .endCell();
}

export class Most implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

    static createFromAddress(address: Address) {
        return new Most(address);
    }

    static createFromConfig(config: MostConfig, code: Cell, workchain = 0) {
        const data = mostConfigToCell(config);
        const init = { code, data };
        return new Most(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendUpgradeCode(
        provider: ContractProvider,
        via: Sender,
        opts: {
            value: bigint;
            code: Cell;
        },
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(Opcodes.upgradeCode, 32).storeUint(0, 64).storeRef(opts.code).endCell(),
        });
    }

    async sendMapoExecute(
        provider: ContractProvider,
        via: Sender,
        opts: {
            value: bigint;
        },
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.mapoExecute, 32)
                .storeUint(0, 64)
                .storeUint(0, 64)
                .storeUint(0, 64)
                .storeAddress(Address.parse('EQBAYsrbNBd0v2nWTis0lWhWHktMEELC9MCBYo1oJltLsI3U'))
                .storeUint(0, 256)
                .endCell(),
        });
    }

    async sendSetJettonMaster(
        provider: ContractProvider,
        via: Sender,
        opts: {
            value: bigint;
            jettonMasterAddress: Address;
        },
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.setJettonMaster, 32) // You'll need to add this opcode
                .storeUint(0, 64)
                .storeAddress(opts.jettonMasterAddress)
                .endCell(),
        });
    }
    async getOrderNonce(provider: ContractProvider) {
        const result = await provider.get('get_order_nonce', []);
        return result.stack.readNumber();
    }
}
