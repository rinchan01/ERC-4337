const { AbiCoder } = require("ethers");
const { ethers } = require("ethers");

// The return data from the error message
const returnData = "0x220266b600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000001441413234207369676e6174757265206572726f72000000000000000000000000";

// The function selector (first 4 bytes)
const functionSelector = returnData.slice(0, 10);

// The encoded error data (remaining bytes)
const encodedErrorData = returnData.slice(10);

// Decode the error data
const errorData = new AbiCoder.decode(
    ["string"], // The expected data type
    "0x" + encodedErrorData.slice(64) // Skip the first 64 bytes (32 bytes for offset and 32 bytes for length)
);

console.log("Function Selector:", functionSelector);
console.log("Error Data:", errorData[0]);