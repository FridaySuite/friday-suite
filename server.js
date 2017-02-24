// Author : github @ankitbug94
'use strict'

var express = require('express')
var app = express()
var port = process.env.PORT || 8080
var morgan = require('morgan')
var helmet = require('helmet')
var logger = require('./core/logger')
var configDB = require('./config/database.js')
var path = require('path')
var runningMode = 1
// 1 for production
// 0 for testing
configDB.connect(runningMode) // connect to our database

// add necessary headers to request object for security
app.use(helmet())
app.use(morgan('tiny', {
  stream: logger.stream
}))
// every action will be logged in the console

app.set('view engine', 'pug')
app.locals.pretty = true

var configLoader = require('./core/load-config')(logger)
configLoader.then(function (details) {
  var themesDir, pluginsDir, config, adminApp, mainApp
  config = {
    themesFamily: details[0],
    pluginsFamily: details[1],
    adminTheme: details[2],
    mainTheme: details[3],
    plugins: details[4],
    rootDir: __dirname,
    logger: logger
  }
  themesDir = path.join(__dirname, config.themesFamily, 'node_modules')
  pluginsDir = path.join(__dirname, config.pluginsFamily, 'node_modules')
  adminApp = express()
  adminApp.use('/public', express.static(themesDir))
  app.use('/plugin-public', express.static(pluginsDir))
  app.use('/admin', adminApp)
  mainApp = express()
  mainApp.use('/public', express.static(themesDir))
  app.use('/', mainApp)
  require('./core/load-plugins')(mainApp, adminApp, config)
  console.log('before launching')
  require('./app/routes.js')(app)
  app.listen(process.env.app_port || 8080)
  console.log('Site running at http://127.0.0.1:' + port)
})
