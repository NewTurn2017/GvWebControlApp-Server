const express = require('express')
const router = express.Router()
const { stopServer } = require('../services/tcpServer')

router.get('/', (req, res) => {
  stopServer()
  res.send('Server stopped')
})

module.exports = router
