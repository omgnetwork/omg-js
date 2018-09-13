//convert hex to byteArr

const hexToByteArr = (hex) => {
    //delete 0x prefix if exists
    if(hex.includes("0x")){
        var hex = hex.replace("0x", "")
    }
    let buffered = new Buffer(hex, "hex")
    let uint8Value = new Uint8Array(buffered)
    return uint8Value
}

module.exports = hexToByteArr;

