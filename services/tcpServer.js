const net = require('net')
const { updateWebSocketClients } = require('./websocket')
const { sendUDPPacket } = require('./udpPacket')

let tcpServer
let sockets = []

const startServer = () => {
  if (tcpServer && tcpServer.listening) {
    console.log('TCP Server is already running')
    return
  }

  tcpServer = net.createServer()

  tcpServer.on('connection', (socket) => {
    sockets.push(socket)
    updateWebSocketClients()

    socket.on('close', () => {
      sockets = sockets.filter((s) => s !== socket)
      updateWebSocketClients()
    })

    socket.on('data', (data) => {
      console.log('Received data from client: ', data)
    })
  })

  tcpServer.listen(5001, () => {
    console.log('TCP Server started on port 5001')
    sendUDPPacket()
  })
}

const stopServer = () => {
  if (tcpServer) {
    sockets.forEach((socket) => socket.destroy())
    tcpServer.close(() => {
      console.log('TCP Server stopped')
      tcpServer = null
      updateWebSocketClients()
    })
  } else {
    console.log('Server is not running')
  }
}

module.exports = { startServer, stopServer }
