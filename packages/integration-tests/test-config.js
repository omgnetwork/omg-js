require('dotenv').config()

const config = {
  geth: {
    host: process.env.GETH_HOST || 'localhost',
    port: process.env.GETH_PORT || '8545'
  },
  watcher: {
    host: process.env.WATCHER_HOST || 'localhost',
    port: process.env.WATCHER_PORT || '4000'
  },
  childchain: {
    host: process.env.CHILDCHAIN_HOST || 'localhost',
    port: process.env.CHILDCHAIN_PORT || '9656'
  },
  plasmaContract: process.env.PLASMA_CONTRACT || '0x0f7da01a8f038c22e5122b972263017e65591a00'
}

module.exports = config
