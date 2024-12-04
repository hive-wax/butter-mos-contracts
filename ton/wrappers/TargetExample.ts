import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type TargetExampleConfig = {};

export function targetExampleConfigToCell(config: TargetExampleConfig): Cell {
    return beginCell().endCell();
}

export class TargetExample implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new TargetExample(address);
    }

    static createFromConfig(config: TargetExampleConfig, code: Cell, workchain = 0) {
        const data = targetExampleConfigToCell(config);
        const init = { code, data };
        return new TargetExample(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }
}
