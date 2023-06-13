const express = require('express')
const router = express.Router()
const { getConnectedClients } = require('../services/websocket')

router.get('/', (req, res) => {
  res.send({ clients: getConnectedClients() })
})

module.exports = router
