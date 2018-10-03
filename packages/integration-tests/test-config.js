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
  plasmaContract: process.env.PLASMA_CONTRACT || '0x45ff03d1c82c4dd62b33eb0eb9e71593055a376b'
}

module.exports = config
