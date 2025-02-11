
Two parts:
- solidity
- web

For the solidity part it will require that you install `foundry` because I didn't do the module-5 yet on `hardhat`

On one terminal `make anvil` to start a local ethereum. Then on another `make deploy` and you will see the `Contract deployed at: 0x7FA9385bE102ac3EAc297483Dd6233D62b3e1496` supposedly with a different address!

You need to add a custom network: Anvil chain (ID 31337), it should use http://127.0.0.1:8545 as the RPC endpoint.


# On deploy

What's happening on deploy can be seeing inside of the Makefile of `solidity` folder. It is taking the ABIs and addresses, then it puts them into `.ts` files in the `web` project. It's a poor's man automation.

