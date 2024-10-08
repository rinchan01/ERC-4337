const Web3 = require('web3');
const web3 = new Web3();

// The return data from the error
const returnData = '0x220266b600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000001f414131302073656e64657220616c726561647920636f6e737472756374656400';

// Extract the error signature and the encoded error message
const errorSignature = returnData.slice(0, 10); // '0x220266b6'
const encodedErrorMessage = returnData.slice(74); // '41413231206469646e2774207061792070726566756e64000000000000000000'

// Decode the error message
const decodedErrorMessage = web3.utils.hexToUtf8('0x' + encodedErrorMessage);

console.log('Error Signature:', errorSignature);
console.log('Decoded Error Message:', decodedErrorMessage);