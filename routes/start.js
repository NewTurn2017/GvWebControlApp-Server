const express = require('express')
const router = express.Router()
const { startServer } = require('../services/tcpServer')

router.get('/', (req, res) => {
  startServer()
  res.send('Server started')
})

module.exports = router
