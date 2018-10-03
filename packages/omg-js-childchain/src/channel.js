const { Socket } = require('phoenix-channels')

class Channel {
  constructor (url) {
    this.socket = new Socket(url)
  }

  connect () {
    this.socket.connect()
  }

  subscribe (topic) {
    const channel = this.socket.channel(topic)
    channel.join()
    return channel
  }
}

module.exports = Channel
