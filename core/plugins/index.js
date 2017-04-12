'use strict'
var pluginsLoader = require('./loader.js')
var logger = require('winston')
var bluebird = require('bluebird')
module.exports = {
  preparePlugins: function (config) {
    const plugins = pluginsLoader.addProperties(config.plugins, config)
    return pluginsLoader.modifyDefinition(plugins)
  },
  initPlugins: function (config) {
    return pluginsLoader.initialiseModules(
      this.preparePlugins(config)
    )
  },
  initAdminTheme: function (initedPlugins, config) {
    return initedPlugins
      .then(function (plugins) {
        return pluginsLoader.initialiseThemes(plugins, config, 'adminTheme')
      })
  },
  initMainTheme: function (initedPlugins, config) {
    return initedPlugins
      .then(function (plugins) {
        return pluginsLoader.initialiseThemes(plugins, config, 'adminTheme')
      })
  },
  initPluginsThemes: function (initedPlugins) {
    return initedPlugins
      .then(function (plugins) {
        return pluginsLoader.initialisePluginsThemes(plugins)
      })
  },
  initPluginsAndAllThemes: function (initedPlugins, config) {
    return initedPlugins
      .then(function (plugins) {
        return bluebird.all([
          pluginsLoader.initialiseThemes(plugins, config, 'adminTheme'),
          pluginsLoader.initialiseThemes(plugins, config, 'mainTheme'),
          pluginsLoader.initialisePluginsThemes(plugins)
        ])
      })
      .then(function (plugins) {
        return plugins[0]
      })
  },
  executePlugins: function (initedPlugins, config) {
    return initedPlugins
      .then(function (plugins) {
        return pluginsLoader.executeModules(plugins, config)
      })
  },
  run: function (config) {
    return this.executePlugins(
      this.initPluginsAndAllThemes(
        this.initPlugins(config),
        config
      ),
      config
    )
  }
}
