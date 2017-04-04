var helmet = require('helmet')
var morgan = require('morgan')
var path = require('path')
var express = require('express')
module.exports = function (app, config) {
  var pluginsDir
  pluginsDir = path.join(config.rootDir, config.pluginsFamily, 'node_modules')
  app.use('/plugin-public', express.static(pluginsDir))
  app.use(helmet())
  app.use(morgan('tiny', {
    stream: {
      write: function (message, encoding) {
        config.logger.info(message)
      }
    }
  }))
  app.set('view engine', 'pug')
  app.locals.pretty = true
}