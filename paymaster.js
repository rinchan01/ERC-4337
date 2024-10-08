const { entryPointContract, simpleAccountContract } = require('../config/contract-instances.config');
const { concat, zeroPadValue, toBeHex, getBytes, keccak256, AbiCoder } = require('ethers');

const salt = process.env.SALT;

const packAccountGasLimits = async (verificationGasLimit, callGasLimit) => {
    return concat([zeroPadValue(toBeHex(verificationGasLimit), 16), zeroPadValue(toBeHex(callGasLimit), 16)]);
}

const composeInitCode = async (ownerAddress) => {
    const walletCreateABI = simpleAccountContract.methods.createAccount(ownerAddress, salt).encodeABI();
    initCode = concat([await simpleAccountContract.getAddress(), walletCreateABI]);
}

const packUserOp = async (op) => {
    let accountGasLimits = packAccountGasLimits(op.verificationGasLimit, op.executionGasLimit + 100000);
    let gasFees = packAccountGasLimits(op.maxPriorityFeePerGas, op.maxFeePerGas);
    const packedOp = {
        sender: op.sender,
        nonce: op.nonce,
        initCode: op.initCode,
        callData: op.callData,
        accountGasLimits,
        preVerificationGas: op.preVerificationGas,
        gasFees,
        paymasterAndData: '0x',
        signature: '0x'
    }
    return new AbiCoder().encode(
        ['address', 'uint256', 'bytes32', 'bytes32', 'bytes32', 'uint256', 'bytes32', 'bytes32'],
        [
            packedOp.sender,
            packedOp.nonce,
            keccak256(packedOp.initCode),
            keccak256(packedOp.callData),
            packedOp.accountGasLimits,
            packedOp.preVerificationGas,
            packedOp.gasFees,
            keccak256(packedOp.paymasterAndData),
        ]
    );
}

const signPackedUserOp = async (packedOp, entryPoint, chainId) => {
    const userOpHash = keccak256(packedOp);
    const enc = new AbiCoder().encode(['bytes32', 'address', 'uint256'], [userOpHash, entryPoint, chainId]);
    const encKecak = keccak256(enc);
    const msg = getBytes(encKecak);
}

const executeHandleOps = async (op, ownerAddress, callData) => {
    let walletAddress = await simpleAccountContract.methods.getAddress(ownerAddress, salt).call();
    const nonce = await entryPointContract.methods.getNonce(walletAddress, 0).call();
    const initCode = await composeInitCode(ownerAddress);
    const walletContract = new web3.eth.Contract(simpleAccountABI.abi, walletAddress);
    // if (callData == "createDID")
    //     callData = await walletContract.methods.execute(WETH, 0, callData).encodeABI();

    // const op = {
    //     sender: walletAddress,
    //     nonce,
    //     initCode,
    //     callData,
    //     verificationGasLimit,
    //     callGasLimit,
    //     maxFeePerGas,
    //     maxPriorityFeePerGas,
    //     preVerificationGas: 1,
    //     paymasterAddress,
    //     paymasterVerificationGasLimit,
    //     paymasterPostOpGasLimit,
    //     signature: '0x'
    // }
    const packedOp = await packUserOp(op);

    const enc = coder.encode(['bytes32', 'address', 'uint256'], [userOpHash, entryPointAddress, 31337]);

    const encKecak = keccak256(enc);
    const msg = getBytes(encKecak);
    const signer = new ethers.Wallet(alicePrivateKey, provider);
    const sign = await signer.signMessage(msg);
    packedOp.signature = sign;

    const hash = await paymasterContract.methods.getHash(packedOp, MOCK_VALID_UNTIL, MOCK_VALID_AFTER).call();
    const sig = await signer.signMessage(getBytes(hash));
    packedOp.paymasterAndData = concat([paymasterAddress, coder.encode(['uint48', 'uint48'], [MOCK_VALID_UNTIL, MOCK_VALID_AFTER]), sig]);

    // const msg1 = Buffer.concat([Buffer.from('\x19Ethereum Signed Message:\n32', 'ascii'), Buffer.from(getBytes(encKecak))]);

    // const sig = ecsign(keccak256_buffer(msg1), Buffer.from(getBytes(alicePrivateKey)));
    // // const pub = ecrecover(keccak256_buffer(msg1), sig.v, sig.r, sig.s);
    // // addrBuf = pubToAddress(pub);
    // // console.log("Address: ", bufferToHex(addrBuf));
    // ops.signature = toRpcSig(sig.v, sig.r, sig.s); const hash = await payMasterContract.methods.getHash(ops, MOCK_VALID_UNTIL, MOCK_VALID_AFTER).call();

    // const signer = new ethers.Wallet(alicePrivateKey, provider);
    // const sign = await signer.signMessage(getBytes(hash));
    // ops.paymasterAndData = concat([paymasterAddress, coder.encode(['uint48', 'uint48'], [MOCK_VALID_UNTIL, MOCK_VALID_AFTER]), sign]);

    const handleOpsRawData = entryPointContract.methods.handleOps([packedOp], coordinatorPublicKey).encodeABI();

    const handleOpsops = {
        to: entryPointAddress,
        gas: 3000000, maxFeePerGas: 0,
        data: handleOpsRawData
    };

    const signedTx = await web3.eth.accounts.signTransaction(handleOpsops, coordinatorPrivateKey);
    await web3.eth.sendSignedTransaction(signedTx.rawTransaction, function (error, hash) {
        if (!error) { console.log("Handleops Success --> ", hash); }
        else { console.log("Handleops Error --> ", error) }
    });

}