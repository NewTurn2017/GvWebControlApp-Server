const express = require('express')
const cors = require('cors')
const dgram = require('dgram')
const net = require('net')
const os = require('os')
const WebSocket = require('ws')

const app = express()
app.use(cors())
const wss = new WebSocket.Server({ port: 8080 })

const interfaces = os.networkInterfaces()
let tcpServer
let sockets = []
let connectedClients = 0

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ clients: connectedClients }))

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
      console.log('Received data from client: ', data)
    })
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
