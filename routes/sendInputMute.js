const express = require('express')
const router = express.Router()

router.post('/', (req, res) => {
  const { channel, mute } = req.body

  const commandID = 'S'.charCodeAt(0)
  const para1 = 't'.charCodeAt(0)
  const para2 = channel.charCodeAt(0)

  const mCmd = new Uint8Array(6)
  mCmd[0] = mCmd.length - 1
  mCmd[1] = commandID
  mCmd[2] = para1
  mCmd[3] = para2
  mCmd[4] = mute
  mCmd[5] = Array.from(mCmd).reduce((a, b) => a + b, 0) - mCmd[0]

  //sockets variable is not defined in this module, you should pass it from the main module
  req.app.get('sockets').forEach((socket) => socket.write(mCmd))

  res.send('Input mute sent')
})

module.exports = router
