const express = require('express')
const cors = require('cors')
const dgram = require('dgram')
const net = require('net')
const os = require('os')
const WebSocket = require('ws')
const sendInputGainRouter = require('./routes/sendInputGain')
const sendInputMuteRouter = require('./routes/sendInputMute')
const EventEmitter = require('events')
let eventEmitter = new EventEmitter()

const app = express()
app.use(cors())
app.use(express.json())
app.use('/sendInputGain', sendInputGainRouter)
app.use('/sendInputMute', sendInputMuteRouter)

app.use(function (err, req, res, next) {
  console.error(err.stack)
  res.status(500).send('Something broke!')
})

const wss = new WebSocket.Server({ port: 8080 })

const interfaces = os.networkInterfaces()
let tcpServer
let sockets = []
let connectedClients = 0
// Buffer for handling incomplete messages
let recvBuffer = Buffer.alloc(0)

wss.on('connection', (ws) => {
  console.log('웹소켓 연결확인')
  ws.send(JSON.stringify({ clients: connectedClients }))
  console.log(
    `A client just connected. Total connected clients: ${connectedClients}`
  )

  ws.on('message', (message) => {
    console.log('received: %s', message)
  })

  ws.on('close', () => {
    connectedClients--
    console.log(
      `A client just disconnected. Total connected clients: ${connectedClients}`
    )
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ clients: connectedClients }))
      }
    })
  })
})

// 새로운 API를 만듭니다.
app.get('/clients', (req, res) => {
  res.send({ clients: connectedClients })
})

app.get('/start', (req, res) => {
  if (tcpServer && tcpServer.listening) {
    console.log('TCP Server is already running')
    res.send('TCP Server is already running')
    return
  }

  tcpServer = net.createServer()

  tcpServer.on('connection', (socket) => {
    sockets.push(socket)
    connectedClients++
    console.log(
      `TCP client connected. Total connected clients: ${connectedClients}`
    )
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ clients: connectedClients }))
      }
    })

    socket.on('close', () => {
      sockets = sockets.filter((s) => s !== socket)
      connectedClients = Math.max(connectedClients - 1, 0) // Ensure the count of clients doesn't go below 0
      console.log(
        `A client just disconnected. Total connected clients: ${connectedClients}`
      )
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ clients: connectedClients }))
        }
      })
    })

    socket.on('data', (data) => {
      recvBuffer = Buffer.concat([recvBuffer, data])

      while (recvBuffer.length > 0) {
        const messageLength = recvBuffer[0]

        if (recvBuffer.length >= messageLength + 1) {
          const message = recvBuffer.slice(1, messageLength + 1)
          console.log('Received data from client: ', message)

          eventEmitter.emit('dataReceived', message) // Emitting event when data is received

          // Remove the processed message from the buffer
          recvBuffer = recvBuffer.slice(messageLength + 1)
        } else {
          // If the full message has not yet been received, wait for the next 'data' event
          break
        }
      }
    })
    app.set('sockets', sockets)
  })

  tcpServer.listen(5001, () => {
    console.log('TCP Server started on port 5001')

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
  })

  res.send('Server started')
})

app.get('/stop', (req, res) => {
  if (tcpServer) {
    sockets.forEach((socket) => socket.destroy())
    tcpServer.close(() => {
      console.log('TCP Server stopped')
      tcpServer = null
      connectedClients = 0
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ clients: connectedClients }))
        }
      })
    })
    res.send('Server stopped')
  } else {
    res.send('Server is not running')
  }
})

app.listen(3001, () => {
  console.log('Express server listening on port 3001')
})

// UDP 패킷 생성
function createUdpPacket(ipAddress) {
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

function getLocalIp() {
  for (const name in interfaces) {
    for (const interface of interfaces[name]) {
      const { family, address, internal } = interface
      if (family === 'IPv4' && !internal) {
        return address
      }
    }
  }
  return null
}
let count = 0
app.post('/sendStatusRequestCommon', (req, res) => {
  const { para2, ch } = req.body

  const commandID = 'R'.charCodeAt(0)
  const para1 = 'R'.charCodeAt(0)
  const mCmd = new Uint8Array(6)

  mCmd[0] = mCmd.length - 1
  mCmd[1] = commandID
  mCmd[2] = para1
  mCmd[3] = para2.charCodeAt(0)
  mCmd[4] = ch.charCodeAt(0)
  mCmd[5] = mCmd.reduce((a, b) => a + b, 0) - mCmd[0]

  const socketsCount = req.app.get('sockets').length
  console.log('socketsCount: ', socketsCount)

  req.app.get('sockets').forEach((socket) => {
    count++
    console.log('count: ', count)

    socket.write(mCmd)
  })

  // Listen for the dataReceived event and send response
  eventEmitter.once('dataReceived', (message) => {
    let hexString = message.toString('hex')
    let hexArray = hexString.match(/.{1,2}/g).map((byte) => '0x' + byte)
    console.log('message: ', hexArray)

    // Check if the array contains 0x52 0x67 0x31
    if (
      hexArray.slice(0, 3).toString() === ['0x52', '0x67', '0x31'].toString()
    ) {
      let hexValue = hexArray.slice(3, 7).join('').replace(/0x/g, '')
      console.log('hexValue: ', hexValue)
      let floatValue = hexToFloat(hexValue) // Convert the hex value to float
      console.log('spk1ch1 value:', floatValue)
    }
    if (
      hexArray.slice(0, 3).toString() === ['0x52', '0x67', '0x32'].toString()
    ) {
      let hexValue = hexArray.slice(3, 7).join('').replace(/0x/g, '')
      console.log('hexValue: ', hexValue)
      let floatValue = hexToFloat(hexValue) // Convert the hex value to float
      console.log('spk1ch2 value:', floatValue)
    }

    if (
      hexArray.slice(0, 3).toString() === ['0x52', '0x74', '0x31'].toString()
    ) {
      // hexArray[3] == 00 -> mute off, 01 -> mute on
      console.log('spk1ch1 mute:', hexArray[3] === '0x01')
    }
    if (
      hexArray.slice(0, 3).toString() === ['0x52', '0x74', '0x32'].toString()
    ) {
      // hexArray[3] == 00 -> mute off, 01 -> mute on
      console.log('spk1ch2 mute:', hexArray[3] === '0x01')
    }

    let result = {}

    //if msg contain 0x52 0x67 0x31  ->

    res.json('ok') // Sending the response back to client
  })
})

function hexToFloat(hex) {
  // Convert hex to byte array in reverse order
  let byteArray = hex
    .match(/[\da-f]{2}/gi)
    .map((h) => parseInt(h, 16))
    .reverse()

  const uint8array = new Uint8Array(byteArray)
  const dataView = new DataView(uint8array.buffer)

  return dataView.getFloat32(0, true) // true for little endian
}
