'use strict'
var plugins = require('./loader.js')
var express = require('express')
var path = require('path')
var logger = require('winston')
module.exports = function (config) {
  var mainApp = express()
  var adminApp = express()
  var themesDir = path.join(config.rootDir, config.themesFamily, 'node_modules')
  adminApp.use('/public', express.static(themesDir))
  mainApp.use('/public', express.static(themesDir))
  plugins.rootDir = config.rootDir
  plugins.config = config
  
  const ankit = plugins.addProperties(config.plugins, config)
  plugins.modifyDefinition(ankit)
  return plugins.initialiseModules(ankit).then(function () {
    return plugins.initialiseThemes(ankit, config, 'adminTheme')
  })
    .then(function () {
      return plugins.initialiseThemes(ankit, config, 'mainTheme')
    })
    .then(function () {
      return plugins.initialisePluginsThemes(ankit)
    })
    .then(function () {
      return plugins.executeModules(ankit, mainApp, adminApp)
    })
    .then(function () {
      return {
        mainApp: mainApp,
        adminApp: adminApp,
      }
    })
  
/*  return plugins.loadPlugins(config.plugins)
    .addProperties(config)
    .hashModulesUsingNames()
    .modifyDefinition(config)
    .initialiseModules(config)
    .then(function () {
      return plugins.initialiseThemes(config, 'adminTheme')
    })
    .then(function () {
      return plugins.initialiseThemes(config, 'mainTheme')
    })
    .then(function () {
      return plugins.initialisePluginsThemes(config)
    })
    .then(function () {
      return plugins.executeModules(mainApp, adminApp, config)
    })
    .catch(function (er) {
      logger.error(er)
    })
    .then(function () {
      logger.info('done')
      return {
        mainApp: mainApp,
        adminApp: adminApp,
        plugins: plugins.getAllPlugins()
      }
    })
    */
}
