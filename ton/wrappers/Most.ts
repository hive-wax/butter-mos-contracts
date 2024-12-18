import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type MostConfig = {
    orderNonce: number;
};

export function mostConfigToCell(config: MostConfig): Cell {
    return beginCell().storeUint(config.orderNonce, 256).endCell();
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
}
