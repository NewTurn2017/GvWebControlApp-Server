const dgram = require('dgram')
const { getLocalIp } = require('../utils/helpers')

const sendUDPPacket = () => {
  const udpClient = dgram.createSocket('udp4')
  const message = createUdpPacket(getLocalIp())
  console.log(message)

  udpClient.bind(() => {
    udpClient.setBroadcast(true)
    udpClient.send(message, 5000, '192.168.0.255', (err) => {
      if (err) {
        console.log('Error sending UDP packet:', err)
      } else {
        console.log('UDP packet sent successfully')
      }
    })
  })
}

const createUdpPacket = (ipAddress) => {
  const length = 0x08
  const commandId = 'S'.charCodeAt(0)
  const para1 = 'B'.charCodeAt(0)
  const para2 = 0x49
  const data = ipAddress.split('.').map(Number).reverse() // 역순으로 배열에 넣습니다.
  const checkSum = commandId + para1 + para2 + data.reduce((a, b) => a + b, 0)

  const buffer = Buffer.alloc(9)
  buffer[0] = length
  buffer[1] = commandId
  buffer[2] = para1
  buffer[3] = para2
  buffer[4] = data[0]
  buffer[5] = data[1]
  buffer[6] = data[2]
  buffer[7] = data[3]
  buffer[8] = checkSum

  return buffer
}

module.exports = { sendUDPPacket }
