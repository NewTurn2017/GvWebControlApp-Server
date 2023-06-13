const WebSocket = require('ws')

let connectedClients = 0

const wss = new WebSocket.Server({ port: 8080 })

wss.on('connection', (ws) => {
  // 클라이언트가 접속하면 connectedClients를 증가시키고 모든 클라이언트에게 업데이트를 보냅니다.
  connectedClients++
  updateWebSocketClients()

  ws.on('message', (message) => {
    console.log('received: %s', message)
  })

  ws.on('close', () => {
    // 클라이언트가 연결을 해제하면 connectedClients를 감소시키고 모든 클라이언트에게 업데이트를 보냅니다.
    connectedClients--
    updateWebSocketClients()
  })
})

const updateWebSocketClients = () => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ clients: connectedClients }))
    }
  })
}

const getConnectedClients = () => {
  return connectedClients
}

module.exports = { updateWebSocketClients, getConnectedClients }
