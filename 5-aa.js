const { ethers, utils, toBeHex, getBytes, concat, AbiCoder, JsonRpcProvider, zeroPadValue, keccak256, parseUnits } = require('ethers');
const { ecsign, toRpcSig, keccak256: keccak256_buffer } = require('ethereumjs-util');
const deployData = require('./deployData.json');
const Web3 = require('web3');
const web3 = new Web3('http://127.0.0.1:8545');
const provider = new JsonRpcProvider("http://127.0.0.1:8545");
const salt = 2;
const testData = require('./testData.json');

const entryPoint = require('./build/contracts/EntryPoint.json');
const entryPointAddress = deployData.entryPoint;
const entryPointABI = entryPoint.abi;
const entryPointContract = new web3.eth.Contract(entryPointABI, entryPointAddress);

const wethAbi = require('./build/contracts/WETHToken.json').abi;
const WETH = testData.WETH;
const wethContract = new web3.eth.Contract(wethAbi, WETH);

const simpleAccountABI = require('./build/contracts/SimpleAccount.json');

const payMasterAddress = deployData.verifyingPaymaster;
// const payMasterAbi = require('./build/contracts/VerifyingPaymaster.json') ;
// const payMasterContract = new web3.eth.Contract(payMasterAbi.abi, payMasterAddress);
const MOCK_VALID_UNTIL = '0x00000000deadbeef';
const MOCK_VALID_AFTER = '0x0000000000001234';

const simpleAccountFactory = require('./build/contracts/SimpleAccountFactory.json');
const simpleAccountFactoryAddress = deployData.simpleAccountFactory;
const simpleAccountFactoryABI = simpleAccountFactory.abi;
const simpleAccountFactoryContract = new web3.eth.Contract(simpleAccountFactoryABI, simpleAccountFactoryAddress);

var walletOwner = '0x';

var coordinatorPublicKey = testData.coordinatorPublicKey;
var alicePublicKey = bobPublicKey = '0x';
var alicePrivateKey = bobPrivateKey = '0x';

const DAI = testData.DAI;
const EXPAND_API_KEY = testData.EXPAND_API_KEY;
const EXPAND_BASE_URL = testData.EXPAND_BASE_URL;
const axios = require('axios');

const verificationGasLimit = 1e8;
var executionGasLimit = 3000000;
const maxPriorityFeePerGas = parseUnits('1', 'gwei');
const maxFeePerGas = parseUnits('2', 'gwei');

const coder = new AbiCoder();

const packAccountGasLimits = (verificationGasLimit, callGasLimit) => {
    return concat([zeroPadValue(toBeHex(verificationGasLimit), 16), zeroPadValue(toBeHex(callGasLimit), 16)]);
}

async function getBalance() {

    console.log(`Alice ETH Balance ${web3.utils.fromWei(await web3.eth.getBalance(alicePublicKey))}`);
    console.log(`Alice sender wallet ${walletOwner} ETH Balance ${web3.utils.fromWei(await web3.eth.getBalance(walletOwner))}`);
    // console.log(`Paymaster ETH Balance ${web3.utils.fromWei(await payMasterContract.methods.getDeposit().call())}`) ;

    console.log(`Alice WETH Balance ${web3.utils.fromWei(await wethContract.methods.balanceOf(alicePublicKey).call())}`);
    console.log(`Alice sender wallet ${walletOwner}  WETH Balance ${web3.utils.fromWei(await wethContract.methods.balanceOf(walletOwner).call())}`);

    // console.log(`Bob WETH Balance ${web3.utils.fromWei(await wethContract.methods.balanceOf(bobPublicKey).call())}`) ;
    // console.log(`Bob DAI Balance ${web3.utils.fromWei(await daiContract.methods.balanceOf(bobPublicKey).call())}`) ;

}

async function initAddresses() {

    coordinatorPublicKey = testData.coordinatorPublicKey;
    coordinatorPrivateKey = testData.coordinatorPrivateKey;

    alicePublicKey = testData.alicePublicKey;
    alicePrivateKey = testData.alicePrivateKey;

    bobPublicKey = testData.bobPublicKey;
    bobPrivateKey = testData.bobPrivateKey;

    walletOwner = await simpleAccountFactoryContract.methods.getAddress(alicePublicKey, salt).call();

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
    executionGasLimit = await simpleAccountFactoryContract.methods.createAccount(alicePublicKey, salt).estimateGas();

    const walletCreateABI = simpleAccountFactoryContract.methods.createAccount(alicePublicKey, salt).encodeABI();
    initCode = concat([simpleAccountFactoryAddress, walletCreateABI]);
}

async function composePaymasterAndData(ops) {

    ops.paymasterAndData = ethers.concat([payMasterAddress, utils.AbiCoder.encode(['uint48', 'uint48'], [MOCK_VALID_UNTIL, MOCK_VALID_AFTER]), '0x' + '00'.repeat(65)])
    ops.signature = '0x';
    const hash = await payMasterContract.methods.getHash(ops, MOCK_VALID_UNTIL, MOCK_VALID_AFTER).call();
    const signer = new ethers.Wallet(coordinatorPrivateKey, provider);
    const sign = await signer.signMessage(ethers.getBytes(hash));
    const paymasterAndData = ethers.concat([payMasterAddress, ethers.AbiCoder().encode(['uint48', 'uint48'], [MOCK_VALID_UNTIL, MOCK_VALID_AFTER]), sign])
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

    walletOwner = await simpleAccountFactoryContract.methods.getAddress(alicePublicKey, salt).call();


    // Transfer 10 ETH to Alice from coordinator
    await executeOnChainTransaction('200', '0x', alicePublicKey, coordinatorPrivateKey);


    // Convert 0.5 ETH to WETH for Alice
    // await wethContract.methods.approve(WETH, web3.utils.toWei('0.5', 'ether')).send({ from: coordinatorPublicKey });
    // let rawData = wethContract.methods.transferFrom(coordinatorPublicKey, alicePublicKey, web3.utils.toWei('0.5', 'ether')).encodeABI();
    // await executeOnChainTransaction('0.5', rawData, WETH, alicePrivateKey);

    // Transfer 2 ETH to aliceSenderWallet
    await executeOnChainTransaction('100', '0x', walletOwner, alicePrivateKey);
    console.log("Wallet Owner balance: ", web3.utils.fromWei(await web3.eth.getBalance(walletOwner), 'ether'));


    // Transfer 0.25 WETH from alice address to aliceSenderWallet
    // let wethValue = web3.utils.toWei('0.25', 'ether');
    // rawData = wethContract.methods.transfer(walletOwner, wethValue).encodeABI();
    // await executeOnChainTransaction('0', rawData, WETH, alicePrivateKey);

    console.log("Paymaster Address: ", payMasterAddress);

    // Transfer 2 ETH to paymaster
    rawData = await entryPointContract.methods.depositTo(payMasterAddress).encodeABI();
    await executeOnChainTransaction('2', rawData, entryPointAddress, alicePrivateKey);

}

async function composeWETHTransferCallData() {

    wethValue = web3.utils.toWei('0.01', 'ether');
    callData = wethContract.methods.transfer(bobPublicKey, wethValue).encodeABI();

}

async function executeHandleOps(initCode, callData, viaPaymaster) {

    walletOwner = await simpleAccountFactoryContract.methods.getAddress(alicePublicKey, salt).call();
    const nonce = await entryPointContract.methods.getNonce(walletOwner, 0).call();

    const walletContract = new web3.eth.Contract(simpleAccountABI.abi, walletOwner);
    if (callData != '0x')
        callData = await walletContract.methods.execute(WETH, 0, callData).encodeABI();

    let accountGasLimits = packAccountGasLimits(verificationGasLimit, executionGasLimit + 100000);
    let gasFees = packAccountGasLimits(maxPriorityFeePerGas, maxFeePerGas);

    console.log("Init code: ", initCode)    
    
    const ops =
    {
        sender: walletOwner,
        nonce,
        initCode,
        callData: '0x',
        accountGasLimits,
        preVerificationGas: 1,
        gasFees,
        paymasterAndData: '0x',
        signature: '0x'
    };
    console.log("Init code: ", ops.initCode);
    

    if (viaPaymaster)
        ops.paymasterAndData = await composePaymasterAndData(ops);


    const packUserOp = coder.encode(
        ['address', 'uint256', 'bytes32', 'bytes32', 'bytes32', 'uint256', 'bytes32', 'bytes32'],
        [
            ops.sender,
            ops.nonce,
            keccak256(ops.initCode),
            keccak256(ops.callData),
            ops.accountGasLimits,
            ops.preVerificationGas,
            ops.gasFees,
            keccak256(ops.paymasterAndData),
        ]
    );

    const userOpHash = keccak256(packUserOp);
    console.log("UserOpHash: ", userOpHash);

    const enc = coder.encode(['bytes32', 'address', 'uint256'], [userOpHash, entryPointAddress, 31337]);
    const encKecak = keccak256(enc);

    const msg1 = Buffer.concat([Buffer.from('\x19Ethereum Signed Message:\n', 'ascii'), Buffer.from(getBytes(encKecak))]);

    const sig = ecsign(keccak256_buffer(msg1), Buffer.from(alicePrivateKey.slice(2), 'hex'));

    ops.signature = toRpcSig(sig.v, sig.r, sig.s);
    console.log("Ops: ", ops);


    const handleOpsRawData = entryPointContract.methods.handleOps([ops], coordinatorPublicKey).encodeABI();
    


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

async function composeV3SwapCallData() {
    const config = {
        dexId: '1300',
        amountIn: web3.utils.toWei('0.04', 'ether'),
        amountOutMin: '0',
        path: [WETH, DAI],
        to: bobPublicKey,
        deadline: Date.now() + 60 * 60 * 20,
        from: alicePublicKey,
        gas: '229880'
    };

    const axiosInstance = new axios.create({
        baseURL: EXPAND_BASE_URL,
        timeout: 5000,
        headers: { 'X-API-KEY': EXPAND_API_KEY },
    });

    const response = await axiosInstance.post('/dex/swap/', config);
    callData = response.data.data.data;

}

async function init() {

    await initAddresses();

    await composeInitCode();

    await fundContractsAndAddresses();

    // await composeWETHTransferCallData();

    // await composeV3SwapCallData();

    await executeHandleOps(initCode, '0x', false);

    // await getBalance() ;

    // await executeHandleOps(initCode,'0x', true) ;

    // await executeHandleOps('0x', callData, false);

    // await composeWETHTransferCallData();

    // await getBalance() ;

    // await executeHandleOps('0x',callData, true) ;

    await getBalance();

}

init();