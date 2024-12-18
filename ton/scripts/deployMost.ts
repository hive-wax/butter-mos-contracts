import { Address, toNano } from '@ton/core';
import { compile, NetworkProvider } from '@ton/blueprint';
import { Most } from '../wrappers/Most';
import { buildJettonContent, Jetton } from '../wrappers/Jetton';

/**
 *
 *   most: 'EQBEEl1eSCkVpK4bWa6E6poeVCTuQNvzTj-U6l_klL3ESHf6',
 *   jetton: 'EQBoC-KIpEaPZ6hi70FDj_SXeDHbxPLHk-DokhnTk7g79rld'
 *
 * @param provider
 */
export async function run(provider: NetworkProvider) {
    const most = provider.open(
        Most.createFromConfig(
            {
                orderNonce: 0,
            },
            await compile('Most'),
        ),
    );

    // await most.sendDeploy(provider.sender(), toNano('0.07'));

    // await provider.waitForDeploy(most.address);

    console.log('Most deployed at:', most.address);

    // 2. Deploy Jetton with Most as admin
    const jettonWalletCode = await compile('JettonWallet');

    const content = buildJettonContent({
        name: 'Butter Jetton',
        symbol: 'BUTTER',
        description: 'Test Butter Jetton',
        decimals: 9,
    });

    const mostAddress = Address.parse('kQBEEl1eSCkVpK4bWa6E6poeVCTuQNvzTj-U6l_klL3ESMxw');
    const jetton = provider.open(
        Jetton.createFromConfig(
            {
                // adminAddress: most.address, // Set Most contract as admin
                adminAddress: mostAddress, // Set Most contract as admin
                content: content,
                walletCode: jettonWalletCode,
            },
            await compile('JettonMinter'),
        ),
    );

    await jetton.sendDeploy(provider.sender(), toNano('0.1'));
    await provider.waitForDeploy(jetton.address);

    console.log('Jetton deployed at:', jetton.address);

    // Print deployment info
    console.log('Deployment completed!');
    console.log({
        most: most.address.toString(),
        jetton: jetton.address.toString(),
    });
}
