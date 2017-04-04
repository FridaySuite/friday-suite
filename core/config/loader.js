'use strict'
var nconf = require('nconf')
var bluebird = require('bluebird')
var admin = require('../schemas/admin')
var main = require('../schemas/main')
var pluginsFamily = require('../schemas/plugin-family')
var plugins = require('../schemas/plugins')
var themesFamily = require('../schemas/themes-family')
var winston = require('winston')
module.exports = function (rootDir) {
  nconf.argv().env()
  return bluebird.all([
    loadConf(themesFamily, 'themes-family'),
    loadConf(pluginsFamily, 'plugins-family'),
    loadConf(admin, 'admin-theme'),
    loadConf(main, 'main-theme'),
    loadPlugins()
  ]).then(function (details) {
    return {
      themesFamily: details[0].name,
      pluginsFamily: details[1].name,
      adminTheme: details[2].theme.name,
      mainTheme: details[3].theme.name,
      plugins: details[4],
      rootDir: rootDir,
      logger: winston
    }
  })
}
function loadPlugins () {
  const configValue = getConfig('plugins-family')
  return getConfig('prefer') === 'cmd'
    ? !isValid('plugins-family')
      ? loadPluginsFromDB(plugins, 'plugins')
      : getConfig('save') === 'false'
        ? loadPluginsFromFile(configValue)
        : savePluginsInDB(plugins, loadPluginsFromFile(configValue))
    : loadPluginsFromDB(plugins)
      .catch(function () {
        return !isValid('plugins-family')
          ? bluebird.reject('Cannot load ' + 'themes-family' + ' even from CMD')
          : getConfig('save') === 'false'
            ? loadPluginsFromFile(configValue)
            : savePluginsInDB(plugins, loadPluginsFromFile(configValue))
              .catch(function () {
                return bluebird.reject('Error in saving in DB')
              })
      })
}
function loadConf (DB, config) {
  return getConfig('prefer') === 'cmd'
    ? !isValid(config)
      ? loadFromDB(DB, config)
      : getConfig('save') === 'false'
        ? createRecord(config)
        : saveInDB(DB, config)
    : loadFromDB(DB, config)
      .catch(function () {
        return !isValid(config)
          ? bluebird.reject('Cannot load ' + config + ' even from CMD')
          : getConfig('save') === 'false'
            ? createRecord(config)
            : saveInDB(DB, config)
              .catch(function () {
                return bluebird.reject('Error in saving in DB')
              })
      })
}
function getConfig (config) {
  return nconf.get(config)
}
function loadFromDB (DB, config) {
  return DB.findOne({}).lean().exec()
  .then(function (doc) {
    if (doc === null) {
      winston.info('No ' + config + ' found in DB')
      return bluebird.reject('No ' + config + ' found.')
    }
    return doc
  })
}
function saveInDB (DB, configName) {
  const content = createRecord(configName)
  const temp = new DB(content)
  return temp.save().then(function (doc) {
    winston.info(configName + ':' + nconf.get(configName) + 'stored in database')
    return doc
  })
}
function isValid (config) {
  var configValue = nconf.get(config)
  return configValue != null && configValue.trim !== ''
}
function savePluginsInDB (pluginsDB, plugins) {
  return pluginsDB.insertMany(plugins).then(function (docs) {
    winston.info('Plugins stored in database')
    return plugins
  })
}
function loadPluginsFromFile (family) {
  try {
    const fplugins = require('../../' + family + '/package.json').dependencies
    return Object.keys(fplugins)
    .map(function (plugin) {
      return {
        name: plugin.split('.')[1],
        dir: plugin,
        theme: {
          name: 'default_theme'
        }
      }
    })
  } catch (e) {
    return bluebird.reject('No plugins-family found in command. Did you specify a plugins-family in command')
  }
}
function loadPluginsFromDB (releventDB) {
  return releventDB.find({}).lean().exec()
    .catch(function () {
      winston.error('Error in plugins database')
      return bluebird.reject('Error in plugin database.')
    })
    .then(function (docs) {
      if (docs.length === 0) {
        winston.info('No plugins found in DB')
        return bluebird.reject('No plugins found. Consider using `--fix true` option')
      }
      return docs
    })
}
function createRecord (configName) {
  if (configName === 'plugins-family') {
    return {
      name: getConfig(configName)
    }
  }
  if (configName === 'themes-family') {
    return {
      name: getConfig(configName)
    }
  }
  if (configName === 'admin-theme') {
    return {
      theme: {
        name: getConfig(configName)
      }
    }
  }
  if (configName === 'main-theme') {
    return {
      theme: {
        name: getConfig(configName)
      }
    }
  }
}
