# Vérification Blockscout (mainnet 4663)

Blockscout est derrière Cloudflare : `forge verify-contract` et l'API sont bloqués hors navigateur. À faire à la main, 2 minutes :

1. Ouvrir https://robinhoodchain.blockscout.com/address/0xCCc7C1EA864E99CBe43788c203Af9c1BDfaba7c0/contract-verification
   - Method : **Solidity (Standard JSON input)**, compiler **v0.8.26+commit.8a97fa7a**
   - Fichier : `Collar.standard-input.json` · contract name `Collar` · pas d'arguments de constructeur
2. Ouvrir https://robinhoodchain.blockscout.com/address/0x23409CaD886380f066329eF237a37d55950AF9Ad/contract-verification
   - Même méthode et compilateur, fichier `Hoodochi.standard-input.json`, contract name `Hoodochi`
   - Constructor arguments (ABI-encodés, décocher l'autodétection si elle échoue) :

```
000000000000000000000000ccc7c1ea864e99cbe43788c203af9c1bdfaba7c0000000000000000000000000c22abb0e1b6493a6d09db6c281b586a8343d5e0f0000000000000000000000000000000000000000000000000006ffb45e352000fdbf5e71774ce5ddafda7c804f3bb09452749de959136a1220f7659734b42e1100000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000001e68747470733a2f2f6170692e686f6f646f6368692e696f2f746f6b656e2f0000
```

   (= Collar 0xCCc7C1EA864E99CBe43788c203Af9c1BDfaba7c0, keeper 0xC22ABb0E1b6493A6D09Db6C281B586a8343D5E0f, 1970000000000000 wei, provenance 0xfdbf5e71…b42e11, "https://api.hoodochi.io/token/")
