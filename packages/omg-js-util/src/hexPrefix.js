function hexPrefix (data) {
    return data.startsWith('0x') ? data : `0x${data}`
}

module.exports = hexPrefix