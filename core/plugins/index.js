'use strict'
var modules = require('./loader.js')
var express = require('express')
var path = require('path')
var logger = require('winston')
module.exports = function (config) {
  var mainApp = express()
  var adminApp = express()
  var themesDir = path.join(config.rootDir, config.themesFamily, 'node_modules')
  adminApp.use('/public', express.static(themesDir))
  mainApp.use('/public', express.static(themesDir))
  modules.rootDir = config.rootDir
  modules.config = config
  return modules.loadPlugins(config.plugins)
    .addProperties(config)
    .hashModulesUsingNames()
    .modifyDefinition(config)
    .initialiseModules(config)
    .then(function () {
      return modules.initialiseThemes(config, 'adminTheme')
    })
    .then(function () {
      return modules.initialiseThemes(config, 'mainTheme')
    })
    .then(function () {
      return modules.initialisePluginsThemes(config)
    })
    .then(function () {
      return modules.executeModules(mainApp, adminApp, config)
    })
    .catch(function (er) {
      logger.error(er)
    })
    .then(function () {
      logger.info('done')
      return {
        mainApp: mainApp,
        adminApp: adminApp,
        plugins: modules.getAllPlugins()
      }
    })
}
