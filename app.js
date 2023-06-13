const express = require('express')
const cors = require('cors')
const clientsRoute = require('./routes/clients')
const startRoute = require('./routes/start')
const stopRoute = require('./routes/stop')

const app = express()

app.use(cors())

app.use('/clients', clientsRoute)
app.use('/start', startRoute)
app.use('/stop', stopRoute)

app.listen(3001, () => {
  console.log('Express server listening on port 3001')
})
