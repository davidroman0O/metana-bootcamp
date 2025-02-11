
Two parts:
- solidity
- web

For the solidity part it will require that you install `foundry` because I didn't do the module-5 yet on `hardhat`

On one terminal `make anvil` to start a local ethereum. Then on another `make deploy` and you will see the `Contract deployed at: 0x7FA9385bE102ac3EAc297483Dd6233D62b3e1496` supposedly with a different address!

You need to add a custom network: Anvil chain (ID 31337), it should use http://127.0.0.1:8545 as the RPC endpoint.

Give some money to your address like so:

```
cast send --from 0xa0Ee7A142d267C1f36714E4a8F75612F20a79720 --private-key 0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6 --value 100000000000000000000 0x86095f747174A2b9E44c2ed0e9265D5AC0c76BF7
```

Here `0x86095f747174A2b9E44c2ed0e9265D5AC0c76BF7` is my dev address.


# On deploy

What's happening on deploy can be seeing inside of the Makefile of `solidity` folder. It is taking the ABIs and addresses, then it puts them into `.ts` files in the `web` project. It's a poor's man automation.


