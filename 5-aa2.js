const { ethers, toBeHex, getBytes, concat, AbiCoder, JsonRpcProvider, zeroPadValue, keccak256, parseUnits, parseEther } = require('ethers');
const deployData = require('./deployData.json');
const Web3 = require('web3');
const web3 = new Web3('http://127.0.0.1:8545');
const provider = new JsonRpcProvider("http://127.0.0.1:8545");
const salt = 2;
const testData = require('./testData.json');

const entryPoint = require('./build/contracts/EntryPoint.json');
const entryPointAddress = deployData.entryPoint;
const entryPointABI = entryPoint.abi;

const signer = new ethers.Wallet(testData.coordinatorPrivateKey, provider)
const entryPointContract = new ethers.Contract(entryPointAddress, entryPointABI, signer);

const wethAbi = require('./build/contracts/WETHToken.json').abi;
const WETH = testData.WETH;
const wethContract = new web3.eth.Contract(wethAbi, WETH);

const payMasterAddress = deployData.verifyingPaymaster;
const payMasterAbi = require('./build/contracts/VerifyingPaymaster.json');
const payMasterContract = new web3.eth.Contract(payMasterAbi.abi, payMasterAddress);
const MOCK_VALID_UNTIL = '0x00000000deadbeef';
const MOCK_VALID_AFTER = '0x0000000000001234';

const simpleAccountFactory = require('./build/contracts/SimpleAccountFactory.json');
const simpleAccountFactoryAddress = deployData.simpleAccountFactory;
const simpleAccountFactoryABI = simpleAccountFactory.abi;
const simpleAccountContract = new ethers.Contract(simpleAccountFactoryAddress, simpleAccountFactoryABI, signer);
// const factoryContract = new web3.eth.Contract(simpleAccountABI, simpleAccountFactoryAddress);

var walletOwner = '0x';

var coordinatorPublicKey = '0x';
var coordinatorPrivateKey = '0x';
var alicePublicKey = bobPublicKey = '0x';
var alicePrivateKey = bobPrivateKey = '0x';

const verificationGasLimit = 1e9;
var callGasLimit = 1e8;
const maxPriorityFeePerGas = parseUnits('1', 'gwei');
const maxFeePerGas = parseUnits('2', 'gwei');

const coder = new AbiCoder();


const packAccountGasLimits = (verificationGasLimit, callGasLimit) => {
    return concat([zeroPadValue(toBeHex(verificationGasLimit), 16), zeroPadValue(toBeHex(callGasLimit), 16)]);
}

async function getBalance() {

    console.log(`Alice ETH Balance ${web3.utils.fromWei(await web3.eth.getBalance(alicePublicKey))}`);
    console.log(`Alice sender wallet ${walletOwner} ETH Balance ${web3.utils.fromWei(await web3.eth.getBalance(walletOwner))}`);
    console.log(`Paymaster ETH Balance ${web3.utils.fromWei(await payMasterContract.methods.getDeposit().call())}`);

    console.log(`Alice WETH Balance ${web3.utils.fromWei(await wethContract.methods.balanceOf(alicePublicKey).call())}`);
    console.log(`Alice sender wallet ${walletOwner}  WETH Balance ${web3.utils.fromWei(await wethContract.methods.balanceOf(walletOwner).call())}`);

    console.log(`Bob WETH Balance ${web3.utils.fromWei(await wethContract.methods.balanceOf(bobPublicKey).call())}`);
    // console.log(`Bob DAI Balance ${web3.utils.fromWei(await daiContract.methods.balanceOf(bobPublicKey).call())}`) ;

}

async function initAddresses() {

    coordinatorPublicKey = testData.coordinatorPublicKey;
    coordinatorPrivateKey = testData.coordinatorPrivateKey;

    alicePublicKey = testData.alicePublicKey;
    alicePrivateKey = testData.alicePrivateKey;

    bobPublicKey = testData.bobPublicKey;
    bobPrivateKey = testData.bobPrivateKey;

    walletOwner = await simpleAccountContract.getAddress(alicePublicKey, salt);
    console.log("Wallet Owner Address: ", walletOwner);
    

}

async function executeOnChainTransaction(ethervalue, callData, to, signPrivateKey) {

    const value = web3.utils.toWei(ethervalue, 'ether');
    const rawTxn = { to, gas: 396296, maxFeePerGas: 44363475285, value, data: callData };
    const signedTx = await web3.eth.accounts.signTransaction(rawTxn, signPrivateKey);
    await web3.eth.sendSignedTransaction(signedTx.rawTransaction, function (error, hash) {
        if (!error) { console.log(`Transaction Success 🎉: ${hash} `) }
        else { console.log(`Transaction Fail ❗❗: ${error}`) }
    });

}

async function composeInitCode() {
    callGasLimit = 55000;
    // const encodeFuncData = factoryContract.methods.createAccount(alicePublicKey, salt).encodeABI();
    const encodeFuncData = simpleAccountContract.interface.encodeFunctionData('createAccount', [alicePublicKey, salt]);
    return concat([simpleAccountFactoryAddress, encodeFuncData]);
}

async function composePaymasterAndData(ops) {

    ops.paymasterAndData = ethers.concat([payMasterAddress, coder.encode(['uint48', 'uint48'], [MOCK_VALID_UNTIL, MOCK_VALID_AFTER]), '0x' + '00'.repeat(65)])
    ops.signature = '0x';
    const hash = await payMasterContract.methods.getHash(ops, MOCK_VALID_UNTIL, MOCK_VALID_AFTER).call();
    const signer = new ethers.Wallet(coordinatorPrivateKey, provider);
    const sign = await signer.signMessage(getBytes(hash));
    const paymasterAndData = ethers.concat([payMasterAddress, coder.encode(['uint48', 'uint48'], [MOCK_VALID_UNTIL, MOCK_VALID_AFTER]), sign])
    return paymasterAndData;

}

async function fundContractsAndAddresses() {

    const accounts = [
        coordinatorPublicKey,
        alicePublicKey,
        bobPublicKey
    ];

    for (const account of accounts) {
        const balance = await web3.eth.getBalance(account);
        console.log(`Balance of ${account}: ${web3.utils.fromWei(balance, 'ether')} ETH`);
    }
    console.log("Wallet Owner Address: ", walletOwner);
    
    const alice = new ethers.Wallet(alicePrivateKey, provider);
    await alice.sendTransaction({ to: walletOwner, value: parseEther('100') });
    const coordinator = new ethers.Wallet(coordinatorPrivateKey, provider);
    await coordinator.sendTransaction({ to: alicePublicKey, value: parseEther('100') });
    // await executeOnChainTransaction('100', '0x', walletOwner, alicePrivateKey);

    // // Transfer 10 ETH to Alice from coordinator
    // await executeOnChainTransaction('20', '0x', alicePublicKey, coordinatorPrivateKey);

    // await wethContract.methods.mint(coordinatorPublicKey, web3.utils.toWei('100', 'ether')).send({ from: coordinatorPublicKey });
    // await wethContract.methods.mint(walletOwner, web3.utils.toWei('100', 'ether')).send({ from: coordinatorPublicKey });
    // await wethContract.methods.mint(alicePublicKey, web3.utils.toWei('100', 'ether')).send({ from: coordinatorPublicKey });


    // Transfer 100 ETH to paymaster
    // rawData = await entryPointContract.methods.depositTo(payMasterAddress).encodeABI();
    // await executeOnChainTransaction('100', rawData, entryPointAddress, alicePrivateKey);

}

async function composeWETHTransferCallData() {

    wethValue = web3.utils.toWei('20', 'ether');
    callData = wethContract.interface.encodeFunctionData('transfer', [alicePublicKey, wethValue]);

}

const packUserOp = async (op) => {
    let accountGasLimits = packAccountGasLimits(op.verificationGasLimit, op.callGasLimit + 100000);
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
    return packedOp;
}

const encodeUserOp = async (packedOp) => {
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


const executeHandleOps = async (op, ownerAddress, callData) => {
    op.sender = await simpleAccountContract.getAddress(ownerAddress, salt);
    console.log(op.sender);
    op.nonce = await entryPointContract.getNonce(op.sender, 0);
    // op.initCode = await composeInitCode(ownerAddress);
    // const walletContract = new web3.eth.Contract(simpleAccountABI.abi, op.sender);
    op.callData = callData;
    if (callData != "0x")
        callData = await composeWETHTransferCallData();

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
    // console.log(op);
    const packedOp = await encodeUserOp(await packUserOp(op));
    const userOpHash = keccak256(packedOp);
    const enc = new AbiCoder().encode(['bytes32', 'address', 'uint256'], [userOpHash, entryPointAddress, 31337]);
    const message = getBytes(keccak256(enc));

    const signer = new ethers.Wallet(alicePrivateKey, provider);
    const sign = await signer.signMessage(message);
    op.signature = sign;
    const packedOp1 = await packUserOp(op);

    try {
        console.log("Handleops --> ", packedOp1);
        console.log(coordinatorPublicKey);
        const tx = await entryPointContract.handleOps([packedOp1], coordinatorPublicKey)
        console.log("Handleops Success --> ", tx.hash);
    } catch (error) {
        console.log("Handleops Error --> ", error);
        
    }

}
async function init() {
    const op = {
        sender: '0x',
        nonce: 0,
        initCode: '0x',
        callData: '0x',
        verificationGasLimit,
        callGasLimit,
        maxFeePerGas,
        maxPriorityFeePerGas,
        preVerificationGas: 1,
        paymasterAndData: '0x',
        signature: '0x'
    }

    await initAddresses();

    await fundContractsAndAddresses();

    op.callData = composeWETHTransferCallData();
    
    await executeHandleOps(op, alicePublicKey, callData);

    // await composeWETHTransferCallData();

    // await executeHandleOps(initCode, '0x', false);

    // await getBalance();

    // await executeHandleOps(initCode,'0x', true) ;

    // await executeHandleOps('0x', callData, false);

    // await composeWETHTransferCallData();

    // await getBalance() ;

    // await executeHandleOps('0x', callData, true);

    await getBalance();

}

init();