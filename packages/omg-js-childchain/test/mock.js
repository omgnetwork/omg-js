const MockAdapter = require('axios-mock-adapter')
const axios = require('axios')
const mock = new MockAdapter(axios)

module.exports = mock
