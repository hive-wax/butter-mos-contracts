# Ton Bridge

## Contracts

### Bridge Testnet
EQDyD3ICi9YkGdIf19dJHoq-70Ng9lWY9lCbIVM-tfi_yp1v

## Functions

### Mapo Execute

```
begin_cell()
    .store_op(op::mapo_execute)
    .store_query_id(query_id)
    .store_uint(1, 64) ;; from chain id
    .store_uint(56, 64) ;; to chain id
    .store_slice(sender_address) ;; sender address
    .store_uint(2, 256) ;; order id
    .store_ref(begin_cell().end_cell()) ;; message
    .end_cell()
```

### Call message out

```
slice bridge_addr = <bridge address>;
;; message out body
cell body = begin_cell()
    .store_uint(0x136a3529, 32) ;; op::message_out
    .store_uint(0, 64) ;; queryId
    .store_ref(
        begin_cell()
            .store_uint(0, 8) ;; relay, 0 or 1
            .store_uint(0, 8) ;; msgType, 0 for message or 1 for calldata
            .store_uint(56, 64) ;; toChain, eg. 56 for bnb
            .store_slice(begin_cell().store_uint(0x70997970c51812dc3a010c7d01b50e0d17dc79c8, 512).end_cell().begin_parse()) ;; target address
            .store_ref(begin_cell().store_uint(1, 8).end_cell()) ;; payload, custom data
            .store_uint(200000000, 64) ;; gasLimit
            .end_cell()
    )
    .end_cell();

;; internal message
cell msg = begin_cell()
    .store_uint(0x18, 6)
    .store_slice(bridge_addr)
    .store_coins(50000000) ;; 0.05 TON for fees
    .store_uint(0, 1 + 4 + 4 + 64 + 32 + 1 + 1)
    .store_slice(body)
    .end_cell();
```

## Events

### MessageOut

```javascript
begin_cell()
    .store_uint(TON_CHAIN_ID, 64)
    .store_uint(toChain, 64)
    .store_uint(full_order_id, 256)
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
