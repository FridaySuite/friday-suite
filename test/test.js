// Author : github @ankitbug94
'use strict'

var express = require('express')
var app = express()
var port = process.env.PORT || 8080
var logger = require('./logger')
var configDB = require('../config/database.js')
var pluginsLoadWrapper = require('../core/plugins/index.js')
var pluginsLoader = require('../core/plugins/loader.js')
var configLoader = require('../core/config/loader.js')(__dirname)
var appConfig = require('../core/app/configure.js')
var bluebird = require('bluebird')
var runningMode = 0
// 1 for production
// 0 for testing
configDB.connect(runningMode)
module.exports = {
  integrationTest: function (pluginName, dir) {
    return configLoader
      .catch(function (err) {
        return bluebird.reject(err)
      })
      .then(function (config) {
        config.plugins = getTargetPluginsList(config, pluginName, dir)
        return pluginsLoadWrapper.initPlugins(config)
      })
      .then(function (plugins) {
        console.log(plugins)
        return plugins
      })
      .catch(function (err) {
        logger.error(err)
      })    
  },
  systemTest: function (pluginName, dir) {
    return configLoader
      .catch(function (err) {
        return bluebird.reject(err)
      })
      .then(function (config) {
        addTestPlugin(config.plugins, pluginName, dir)
        return pluginsLoadWrapper.run(config)
      })
      .then(function (plugins) {
        console.log(plugins)
        return plugins
      })
      .catch(function (err) {
        logger.error(err)
      })
  }
}
function addTestPlugin(plugins, pluginName, dir) {
  
  const currentIndex = plugins.map(function (o) {
    return o.name
  }).indexOf(pluginName)
  if (currentIndex !== -1 && typeof dir !== 'undefined') {
    plugins[currentIndex].dir = dir
  } else if (currentIndex === -1) {      
    if (typeof dir !== 'undefined') {
      plugins.push({
        name: pluginName,
        dir: dir
      })
    } else {
      logger.error('plugin dir: ' + dir + ' cannot be found')        
    }
  }
  return plugins
}
function getTargetPluginsList (config, pluginName, dir) {
  // if dir != null -> add plugin to config.plugins
  const plugins = config.plugins
  plugins = addTestPlugin(plugins, pluginName, dir)
  const currentPlugin = plugins.filter(function (plugin) {
    return plugin.name === pluginName
  })
  const initedSeq = pluginsLoader.createInitialiseSequence(
    pluginsLoadWrapper.preparePlugins(config),
    currentPlugin
  )
  const hashPlugin = {}
  initedSeq.forEach(function (plugin) {
    hashPlugin[plugin.name] = true
  })
  return plugins.filter(function (plugin) {
    return hashPlugin.hasOwnProperty(plugin.name)
  })
}
