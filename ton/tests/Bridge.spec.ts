import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, beginCell, Cell, ExternalAddress, Message, toNano } from '@ton/core';
import { Bridge } from '../wrappers/Bridge';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import * as secp256k1 from 'secp256k1';
import * as crypto from 'crypto';
import {
    encodePacked,
    getAddress,
    hashMessage,
    keccak256,
    parseSignature,
    recoverAddress,
    recoverMessageAddress,
    recoverPublicKey,
    size,
    stringToHex,
    toPrefixedMessage,
} from 'viem';
import { privateKeyToAccount, publicKeyToAddress } from 'viem/accounts';
import { EventMessageSent } from '@ton/sandbox/dist/event/Event';
import { generateTonClient } from '../utils/ton';
import { PayloadCodec } from '../utils/payload';
import { parseMessageOutEvent } from '../utils/bridge';

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
                    orderNonce: 0,
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

    it('encode payload', async () => {
        const codec = new PayloadCodec();

        const data =
            '0x1de78eb8658305a581b2f1610c96707b0204d5cba6a782b313672045fa5a87c800000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000e00000000000000000000000000000000000000000000000000de0b6b3a76400000000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000000000002101c6c3c3336cfe7cafd442fe1ba668142bcf49ac868e79b6687c3717587c20d02100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001449d6dae5d59b3af296df35bdc565371c8a563ef6000000000000000000000000';
        const encoded = codec.encode(data);
        const decoded = codec.decode(encoded);
        expect(data).toBe(decoded);
    });

    it('parse tx', async () => {
        const client = generateTonClient();
        const address = Address.parse('kQAr_70VT55zhjTWGODI9JKFMeP4XEdfyTRGHyzPGL_l5SeP');
        let i = 0;
        try {
            const transactions = await client.getTransactions(address, { limit: 10 });
            for (const tx of transactions) {
                if (i !== 2) {
                    i++;
                    continue;
                }
                if (tx.outMessages.size > 0) {
                    tx.outMessages.values().forEach((message: Message, key: number) => {
                        if (message.info.dest && message.info.dest instanceof ExternalAddress) {
                            if (message.info.dest.toString() === 'External<256:883417320>') {
                                const body = message.body;
                                if (body) {
                                    try {
                                        const event = parseMessageOutEvent(body);
                                        console.table([event]);
                                    } catch (error) {
                                        console.error('Error parsing message body:', error);
                                    }
                                }
                            }
                        }
                    });
                }
            }
        } catch (e) {
            console.error(e);
        }
    });

    it('call message out', async () => {
        const messager = await blockchain.treasury('message_out');

        const bnbId = 56n;
        const orderIdBefore = await bridge.getOrderNonce();

        console.log('order id before', orderIdBefore);

        const messageOutResult = await bridge.sendMessageOut(messager.getSender(), {
            relay: false,
            msgType: 0,
            toChain: bnbId,
            target: beginCell()
                .storeUint(BigInt(0x70997970c51812dc3a010c7d01b50e0d17dc79c8), 256)
                .endCell()
                .beginParse(),
            payload: beginCell().endCell(),
            gasLimit: 200000000,
            value: toNano('0.06'),
            initiator: Address.parse('0QBE2Qs7ub-3frxnGOWFfwBdVqUSeAv2NPl4KgdeC7TJMnNG'),
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

        const orderIdAfter = await bridge.getOrderNonce();

        console.log('order id after', orderIdAfter);

        expect(orderIdAfter).toBe(orderIdBefore + 1);
    });

    it('sign and verify with viem', async () => {
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

    it('verify using viem', async () => {
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

    it('message in', async () => {
        const signature =
            '0xa6c438d86c9f4f5b210a6fb8dc8d3a9533350d49fb905a889c0cfef80880b9fa4dcd3713ff4b79cc9d7d66c146015ba9356fbc9975cd27658b21a3f1097e0d001c';
        const hash = '0x1852f796d47a946139808b1749ae129a132fd7d3fbed34f1aa312edf7f3a2cd9';

        const receiptRoot = '0x972ffee54242d4feb376307deca961f0895db675a281ae78dd320bf1f51595af';
        const version = '0x29de751901b431127a4bedd2c75660930cab189266ce166daf73e38f9d0f979c';
        const blockNum = 12392013;
        const chainId = 212;
        const beforeHash = encodePacked(
            ['bytes32', 'bytes32', 'uint256', 'uint256'],
            [receiptRoot, version, BigInt(blockNum), BigInt(chainId)],
        );
        console.log(beforeHash, keccak256(beforeHash));

        const { r, s, yParity } = parseSignature(signature);
        const signer = '0xE0DC8D7f134d0A79019BEF9C2fd4b2013a64fCD6';
        const verifier = await blockchain.treasury('verifier');

        // const increaseResult = await bridge.sendMessageIn(verifier.getSender(), {
        //     value: toNano('0.05'),
        //     hash: BigInt(hash),
        //     v: BigInt(yParity),
        //     r: BigInt(r),
        //     s: BigInt(s),
        //     receiptRoot: BigInt(receiptRoot),
        //     version: BigInt(version),
        //     blockNum,
        //     chainId,
        //     expectedAddress: BigInt(signer),
        // });

        // expect(increaseResult.transactions).toHaveTransaction({
        //     from: verifier.address,
        //     to: bridge.address,
        //     success: true,
        // });
    });
    it('should verify by r,v,s', async () => {
        const signature =
            '0x8d5d654efc4def81f34eb58507cdc91a0c78f833742e345423917840b49b2b1a1cb41825a847cb99b8c2c853e10c6d2d7ae6c7035346ccca8572c963e42893671b';
        const beforeHash =
            '0xbf74b3ed582ac731d1cd0c4aa0a272feb293f27858e5e4a942e1559625d1550863ef8f81f37c748d528d574938f44f82d376c8caf8b7b2bcc78f9aed85db214a0000000000000000000000000000000000000000000000000000000000c5099c0000000000000000000000000000000000000000000000000000000000000089';
        const hash = '0x1852f796d47a946139808b1749ae129a132fd7d3fbed34f1aa312edf7f3a2cd9';

        const receiptRoot = '0x972ffee54242d4feb376307deca961f0895db675a281ae78dd320bf1f51595af';
        const version = '0x29de751901b431127a4bedd2c75660930cab189266ce166daf73e38f9d0f979c';
        const blockNum = 12392013;
        const chainId = 212;

        const v = 28;
        const r = 75430627222101948001170034635586933565787801268069840188024840834445008222714;
        const s = 35190673124364824159006605775776496298734982579896935741638983811508232654080;
        const signer = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
        const verifier = await blockchain.treasury('verifier');

        const increaseResult = await bridge.sendMessageIn(verifier.getSender(), {
            value: toNano('0.05'),
            hash: BigInt(hash),
            v: BigInt(v),
            r: BigInt(r),
            s: BigInt(s),
            receiptRoot: BigInt(receiptRoot),
            version: BigInt(version),
            blockNum,
            chainId,
            addr: BigInt('0x800031F0f47e0D4Aaed6e0d2505596447395f848'),
            topics: [
                BigInt('0xf01fbdd2fdbc5c2f201d087d588789d600e38fe56427e813d9dced2cdb25bcac'),
                BigInt('0x643b809c63485b21b8c56bbf6146ff9d13a0d56c0b723fcabdc6dfd9c9b37ee9'),
                BigInt('0x00000000000000d40004d5020000000200000000000000000000000000000000'),
            ],
            message: beginCell().endCell().beginParse(),
            expectedAddress: BigInt(signer),
        });
    });
    // 0x04ae84e575adbb682cb2412874cc0cf36eb16fc8b677dd33d9a7f46936ca83c76888f166eb775fad2cf8f05867b66b95f5696d78a183676bdc53210fd88dd85c68
    it('should verify pass', async () => {
        const signature =
            '0x8d5d654efc4def81f34eb58507cdc91a0c78f833742e345423917840b49b2b1a1cb41825a847cb99b8c2c853e10c6d2d7ae6c7035346ccca8572c963e42893671b';
        const beforeHash =
            '0xbf74b3ed582ac731d1cd0c4aa0a272feb293f27858e5e4a942e1559625d1550863ef8f81f37c748d528d574938f44f82d376c8caf8b7b2bcc78f9aed85db214a0000000000000000000000000000000000000000000000000000000000c5099c0000000000000000000000000000000000000000000000000000000000000089';
        const hash = '0xfc40624617cb3100f38078c399e926bf725181f9b9168d245e7a0139f0b65996';

        const receiptRoot = '0x972ffee54242d4feb376307deca961f0895db675a281ae78dd320bf1f51595af';
        const version = '0x29de751901b431127a4bedd2c75660930cab189266ce166daf73e38f9d0f979c';
        const blockNum = 12392013;
        const chainId = 212;

        const { r, s, yParity } = parseSignature(signature);
        const signer = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
        const verifier = await blockchain.treasury('verifier');

        // const increaseResult = await bridge.sendMessageIn(verifier.getSender(), {
        //     value: toNano('0.05'),
        //     hash: BigInt(hash),
        //     v: BigInt(yParity),
        //     r: BigInt(r),
        //     s: BigInt(s),
        //     receiptRoot: BigInt(receiptRoot),
        //     version: BigInt(version),
        //     blockNum,
        //     chainId,
        //     expectedAddress: BigInt(signer),
        // });
        //
        // expect(increaseResult.transactions).toHaveTransaction({
        //     from: verifier.address,
        //     to: bridge.address,
        //     success: true,
        // });
    });
});
