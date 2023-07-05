const express = require('express')
const router = express.Router()

router.post('/', (req, res) => {
  const { channel, gain } = req.body

  const commandID = 'S'.charCodeAt(0)
  const para1 = 'g'.charCodeAt(0)
  const para2 = channel.charCodeAt(0)

  const buffer = new ArrayBuffer(4)
  const view = new DataView(buffer)
  view.setFloat32(0, gain, false) // true to indicate little-endian order

  const bytes = new Uint8Array(buffer)
  const mCmd = new Uint8Array(9)
  mCmd[0] = mCmd.length - 1
  mCmd[1] = commandID
  mCmd[2] = para1
  mCmd[3] = para2
  mCmd.set(bytes, 4)
  mCmd[8] = mCmd.reduce((a, b) => a + b, 0) - mCmd[0]

  //sockets variable is not defined in this module, you should pass it from the main module
  req.app.get('sockets').forEach((socket) => socket.write(mCmd))

  res.send('Input gain sent')
})

module.exports = router
