// Author : github @ankitbug94
'use strict'

var express = require('express')
var app = express()
var port = process.env.PORT || 8080
var logger = require('./core/logger')
var configDB = require('./config/database.js')
var pluginLoader = require('./core/plugins/index.js')
var configLoader = require('./core/config/loader.js')(__dirname)
var appConfig = require('./core/app/configure.js')
var bluebird = require('bluebird')
var runningMode = 1
// 1 for production
// 0 for testing
configDB.connect(runningMode)
configLoader
  .catch(function (err) {
    return bluebird.reject(err)
  })
  .then(function (config) {
    appConfig(app, config)
    return pluginLoader(config)
  })
  .then(function (obj) {
    app.use('/admin', obj.adminApp)
    app.use('/', obj.mainApp)
    require('./core/app/routes.js')(app)
    app.listen(process.env.app_port || 8080)
    console.log('Site running at http://127.0.0.1:' + port)
  })
  .catch(function (err) {
    logger.error(err)
  })
