import { TonClient } from '@ton/ton';

export const generateTonClient = () => {
    return new TonClient({
        endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
        // endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
        // endpoint: 'https://testnet.tonapi.io/v2/jsonRPC',
        // endpoint: 'https://testnet.tonapi.io/v2/',
        apiKey: 'df29f6e0fb1a045ecb9e51ce0cc2a98346d2121f69310c899ce0c2d2b7dbe5c1',
    });
};
