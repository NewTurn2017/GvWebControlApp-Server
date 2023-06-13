const os = require('os')

const getLocalIp = () => {
  const interfaces = os.networkInterfaces()

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

module.exports = { getLocalIp }
