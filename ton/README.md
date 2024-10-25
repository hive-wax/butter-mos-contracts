# Ton Bridge

## Contracts

### Bridge Testnet
EQD9pVSCmODM-M3V380x4OH1kG6a7tTTnsP00n7M59iD5etS

## Functions

### Call message out

```javascript
const relay = false
const msgType = 0
const toChain = 56n
const target = BigInt(0x70997970c51812dc3a010c7d01b50e0d17dc79c8)
const payload = beginCell().storeUint(1, 8).endCell()
const gasLimit = 200000000 

beginCell()
    .storeUint(Opcodes.messageOut, 32) // 0x136a3529
    .storeUint(0, 64)
    .storeRef(
        beginCell()
            .storeUint(relay ? 1 : 0, 8)
            .storeUint(msgType, 8)
            .storeUint(toChain, 64)
            .storeSlice(beginCell().storeUint(BigInt(target), 512).endCell().beginParse())
            .storeRef(payload)
            .storeUint(gasLimit, 64)
        .endCell()
    )
    .endCell()
```

## Events

### MessageOut

```javascript
begin_cell()
    .store_uint(TON_CHAIN_ID, 64)
    .store_uint(toChain, 64)
    .store_uint(full_order_id, 64)
    .store_slice(sender_address)
    .store_ref(args)
.end_cell()
```

## Project structure

-   `contracts` - source code of all the smart contracts of the project and their dependencies.
-   `wrappers` - wrapper classes (implementing `Contract` from ton-core) for the contracts, including any [de]serialization primitives and compilation functions.
-   `tests` - tests for the contracts.
-   `scripts` - scripts used by the project, mainly the deployment scripts.

## How to use

### Build

`npx blueprint build` or `yarn blueprint build`

### Test

`npx blueprint test` or `yarn blueprint test`

### Deploy or run another script

`npx blueprint run` or `yarn blueprint run`

### Add a new contract

`npx blueprint create ContractName` or `yarn blueprint create ContractName`
