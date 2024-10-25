import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import { Bridge } from '../wrappers/Bridge';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import * as secp256k1 from 'secp256k1';
import * as crypto from 'crypto';
import {
    getAddress,
    hashMessage,
    keccak256,
    parseSignature,
    recoverAddress,
    recoverMessageAddress,
    recoverPublicKey,
    size,
    stringToHex,
    toBytes,
    toPrefixedMessage,
    verifyMessage,
} from 'viem';
import { privateKeyToAccount, publicKeyToAddress } from 'viem/accounts';
import { EventMessageSent } from '@ton/sandbox/dist/event/Event';

function hexToUint8Array(hexString: string) {
    return new Uint8Array(Buffer.from(hexString.startsWith('0x') ? hexString.slice(2) : hexString, 'hex'));
}

describe('Bridge', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('Bridge');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let bridge: SandboxContract<Bridge>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        bridge = blockchain.openContract(
            Bridge.createFromConfig(
                {
                    orderId: 0,
                },
                code,
            ),
        );

        deployer = await blockchain.treasury('deployer');

        const deployResult = await bridge.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: bridge.address,
            deploy: true,
            success: true,
        });
    });

    it('call message out', async () => {
        const messager = await blockchain.treasury('message_out');

        const bnbId = 56n;
        const orderIdBefore = await bridge.getOrderID();

        console.log('order id before', orderIdBefore);

        const messageOutResult = await bridge.sendMessageOut(messager.getSender(), {
            relay: false,
            msgType: 0,
            toChain: bnbId,
            target: BigInt(0x70997970c51812dc3a010c7d01b50e0d17dc79c8),
            payload: 'message',
            gasLimit: 200000000,
            value: toNano('0.06'),
        });

        expect(messageOutResult.transactions).toHaveTransaction({
            from: messager.address,
            to: bridge.address,
            success: true,
        });

        const event = messageOutResult?.events[0] as EventMessageSent;
        const body = event?.body;

        console.log(body);
        const ds = body?.beginParse();
        const fromChain = ds?.loadUintBig(64);
        // const toChain = ds?.loadUintBig(64);
        console.log(fromChain);

        const orderIdAfter = await bridge.getOrderID();

        console.log('order id after', orderIdAfter);

        expect(orderIdAfter).toBe(orderIdBefore + 1);
    });

    it('sign and verify', async () => {
        const content =
            '0xbf74b3ed582ac731d1cd0c4aa0a272feb293f27858e5e4a942e1559625d1550863ef8f81f37c748d528d574938f44f82d376c8caf8b7b2bcc78f9aed85db214a0000000000000000000000000000000000000000000000000000000000c5099c0000000000000000000000000000000000000000000000000000000000000089';
        const hash = '0xfc40624617cb3100f38078c399e926bf725181f9b9168d245e7a0139f0b65996';
        const account = privateKeyToAccount('0x33e352572fb3f1e2a6ae8c782c85a7f69d38c5f34a2c59dc041f21312735a52d');

        const signature = await account.signMessage({
            message: content,
        });

        const address = await recoverMessageAddress({ message: content, signature });
        console.log(address, account.address);
    });

    it('verify', async () => {
        const content =
            '0xbf74b3ed582ac731d1cd0c4aa0a272feb293f27858e5e4a942e1559625d1550863ef8f81f37c748d528d574938f44f82d376c8caf8b7b2bcc78f9aed85db214a0000000000000000000000000000000000000000000000000000000000c5099c0000000000000000000000000000000000000000000000000000000000000089';
        const hash = '0xfc40624617cb3100f38078c399e926bf725181f9b9168d245e7a0139f0b65996';
        const sh =
            '0x8d5d654efc4def81f34eb58507cdc91a0c78f833742e345423917840b49b2b1a1cb41825a847cb99b8c2c853e10c6d2d7ae6c7035346ccca8572c963e42893671b';
        const signature = hexToUint8Array(sh);
        const signer = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
        const sig = signature.slice(0, 64);
        const rid = signature[64] - 27;
        const pk = secp256k1.ecdsaRecover(sig, rid, hexToUint8Array(hash), true);
        const hash2 = crypto.createHash('sha3-256').update(Buffer.from(pk)).digest();
        const address = '0x' + hash2.slice(-20).toString('hex');

        // const publicKey = await recoverPublicKey({ hash, signature:sh })
        const address2 = await recoverAddress({ hash, signature: sh });

        // console.log(address2)
        // console.log(publicKeyToAddress(publicKey))

        const addr = await recoverMessageAddress({ message: { raw: hash }, signature: sh });
        console.log(addr, address2);
    });

    // BA5734D8F7091719471E7F7ED6B9DF170DC70CC661CA05E688601AD984F068B0
    // D67351E5F06073092499336AB0839EF8A521AFD334E53807205FA2F08EEC74F4
    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and bridge are ready to use

        const beforeHash =
            '0xbf74b3ed582ac731d1cd0c4aa0a272feb293f27858e5e4a942e1559625d1550863ef8f81f37c748d528d574938f44f82d376c8caf8b7b2bcc78f9aed85db214a0000000000000000000000000000000000000000000000000000000000c5099c0000000000000000000000000000000000000000000000000000000000000089';
        const hash = '0xfc40624617cb3100f38078c399e926bf725181f9b9168d245e7a0139f0b65996';
        const signature =
            '0x8d5d654efc4def81f34eb58507cdc91a0c78f833742e345423917840b49b2b1a1cb41825a847cb99b8c2c853e10c6d2d7ae6c7035346ccca8572c963e42893671b';
        const expectedAddress = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';

        // Verify the signature
        const recoveredAddress = await recoverMessageAddress({
            message: {
                raw: hash,
            },
            signature: signature,
        });

        const finalHash = hashMessage({ raw: hash });
        console.log('prefix', toPrefixedMessage({ raw: hash }));
        console.log('size', size(stringToHex(hash)));

        const pub = await recoverPublicKey({ hash: finalHash, signature });
        const addr = await recoverAddress({ hash: finalHash, signature });

        console.log(`pub: `, pub);
        console.log(`address from pub`, publicKeyToAddress(pub));
        console.log(`Final hash: ${finalHash}`);
        console.log('Recovered Address:', recoveredAddress);
        console.log('Expected Address:', expectedAddress);
        console.log('Recovered Address2:', addr);
        console.log('Is Valid:', getAddress(recoveredAddress) === getAddress(expectedAddress));
    });

    it('Calculate address', () => {
        const tonPub =
            '0x04ba5734d8f7091719471e7f7ed6b9df170dc70cc661ca05e688601ad984f068b0d67351e5f06073092499336ab0839ef8a521afd334e53807205fa2f08eec74f4';
        // const pubkey = '0x04745797cf8bac32dba1e96a320cade41bb8603bda689edfdd0af3d741a68e050970309a61d8b666f5acdb8fa13c86cf9047718f15dd010124b67cc5fe6e5522cf'
        // const privKey = privateKeyToAccount('0x612095618b4866f6a801f0d57c466f3e4c42c71fa23a9ec8ed01fd62622c077f')
        console.log(`0x${tonPub.substring(4)}`);
        console.log(publicKeyToAddress(tonPub));
    });

    // 0x04ae84e575adbb682cb2412874cc0cf36eb16fc8b677dd33d9a7f46936ca83c76888f166eb775fad2cf8f05867b66b95f5696d78a183676bdc53210fd88dd85c68
    it('should verify pass', async () => {
        const signature =
            '0x8d5d654efc4def81f34eb58507cdc91a0c78f833742e345423917840b49b2b1a1cb41825a847cb99b8c2c853e10c6d2d7ae6c7035346ccca8572c963e42893671b';
        const beforeHash =
            '0xbf74b3ed582ac731d1cd0c4aa0a272feb293f27858e5e4a942e1559625d1550863ef8f81f37c748d528d574938f44f82d376c8caf8b7b2bcc78f9aed85db214a0000000000000000000000000000000000000000000000000000000000c5099c0000000000000000000000000000000000000000000000000000000000000089';
        const hash = '0xfc40624617cb3100f38078c399e926bf725181f9b9168d245e7a0139f0b65996';
        const { r, s, yParity } = parseSignature(signature);
        const signer = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
        const verifier = await blockchain.treasury('verifier');

        const increaseResult = await bridge.sendVerify(verifier.getSender(), {
            value: toNano('0.05'),
            hash: BigInt(hash),
            v: BigInt(yParity),
            r: BigInt(r),
            s: BigInt(s),
            expectedAddress: BigInt(signer),
        });

        expect(increaseResult.transactions).toHaveTransaction({
            from: verifier.address,
            to: bridge.address,
            success: true,
        });
    });
});
