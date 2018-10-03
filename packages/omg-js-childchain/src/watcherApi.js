const fetch = require('node-fetch')
const JSONBigNumber = require('json-bigint')

class WatcherError extends Error {
  constructor ({ code, description }) {
    super(description)
    this.code = code
  }
}

async function get (url) {
  const resp = await fetch(url)
  const body = await resp.text()
  let json
  try {
    // Need to use a JSON parser capable of handling uint256
    json = JSONBigNumber.parse(body)
  } catch (err) {
    throw new WatcherError('Unknown server error')
  }
  if (json.result === 'error') {
    throw new WatcherError(json.data)
  }
  return json.data
}

module.exports = { get }
