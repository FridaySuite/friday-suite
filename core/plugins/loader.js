
'use strict'
var bluebird = require('bluebird')
var Injector = require('./injector.js')
var isString = require('lodash.isstring')
var logger = require('winston')
module.exports = {
  getAllPlugins: function (plugins) {
    return plugins
  },
  addProperties: function (plugins, config) {
    /*
    modules is array of form from getModules function
    */
    var rootDir
    var pluginsFamily
    var themesFamily
    var main
    var admin
    var configs
    var global
    rootDir = config.rootDir
    pluginsFamily = config.pluginsFamily
    themesFamily = config.themesFamily
    main = createThemeObjectForPlugin(config, 'mainTheme')
    admin = createThemeObjectForPlugin(config, 'adminTheme')
    configs = []
    global = {
      main: main,
      admin: admin,
      rootDir: rootDir,
      all: {
        configs: configs
      }
    }

    return plugins.map(function (plugin) {
      const pluginDir = plugin.dir || plugin.name
      let $config = {
        plugin: {
          name: plugin.name,
          dir: pluginDir,
          path: '../../' + config.pluginsFamily + '/node_modules/' + pluginDir,
          theme: {
            name: plugin.theme.name || 'default_theme'
          },
          admin: {},
          main: {}
        },
        global: global
      }
      configs.push($config)
      addDirAndAssetDirToTheme($config, pluginsFamily, themesFamily, rootDir)
      $config.plugin.admin.views = [
        $config.plugin.theme.dir,
        $config.global.admin.theme.dir
      ]
      $config.plugin.main.views = [
        $config.plugin.theme.dir,
        $config.global.main.theme.dir
      ]
      var instances = createNewInstances()
      return {
        name: plugin.name,
        dir: plugin.dir,
        init: instances.init,
        privateMethod: instances.private,
        publicMethod: instances.public,
        config: $config
      }
    })
  },
  hashPluginsUsingNames: function (plugins) {
    /*
    modules is complete module object from previous function
    */
    const hashedPlugins = {}
    plugins.forEach(function (module) {
      hashedPlugins[module.name] = module
    })
    return hashedPlugins
  },
  modifyDefinition: function (plugins) {
    /*
    modules is complete module object from addPropertiesToModules function
    */
    return plugins.map(function (plugin) {
      let pluginExported = require(plugin.config.plugin.path)
      if (!pluginExported.hasOwnProperty('init')) {
        pluginExported.init = function () {
          return bluebird.resolve()
        }
      }
      if (!pluginExported.hasOwnProperty('execute')) {
        pluginExported.execute = function () {
          return bluebird.resolve()
        }
      }
      return pluginExported
    })
  },
  initialiseModules: function (plugins) {
    var self = this
    var initialiseSequence
    var allPromise
    const hashedPlugins = this.hashPluginsUsingNames(plugins)
    initialiseSequence = createInitialiseSequence(plugins)
    allPromise = []
    initialiseSequence.forEach(function (module) {
      var moduleObj,
        additionalDeps,
        injector
      logger.info('Going to initialize ' + module.name + ' of directory ' + module.dir)
      moduleObj = hashedPlugins[module.name]
      additionalDeps = {
        config: moduleObj.config,
        self: moduleObj.init
      }
      injector = new Injector(null, null, moduleObj.config, self.rootDir, additionalDeps)
      module.decorates.forEach(function (m) {
        injector.add(m, hashedPlugins[m].init)
      })
      allPromise.push(injector.getFunction(require(moduleObj.config.plugin.path)))
      logger.info(module.name + ' initialized')
    })
    return bluebird.all(allPromise)
  },
  initialiseThemes: function (plugins, config, typeOfTheme) {
    var themeObj,
      injector,
      self,
      themeDecorates,
      additionalDeps
    const hashedPlugins = this.hashPluginsUsingNames(plugins)
    try {
      themeObj = require('../../' + config.themesFamily + '/node_modules/' + config[typeOfTheme])
    } catch (err) {
      return bluebird.resolve()
    }
    self = this
    themeDecorates = getArguments(themeObj.init)
    logger.info('Going to initialize the theme' + config.adminTheme)
    additionalDeps = {
    }
    injector = new Injector(null, null, {}, self.rootDir, additionalDeps)
    themeDecorates.forEach(function (m) {
      injector.add(m, hashedPlugins[m].init)
    })
    return bluebird.resolve(injector.getFunction(themeObj))
  },
  initialisePluginsThemes: function (plugins) {
    var self = this
    var allPromise = []
    const hashedPlugins = this.hashPluginsUsingNames(plugins)
    plugins.forEach(function (plugin) {
      var themeObj,
        themeDecorates,
        additionalDeps,
        injector
      try {
        themeObj = require(plugin.config.plugin.theme.dir)
      } catch (err) {
        return bluebird.resolve()
      }
      themeDecorates = getArguments(themeObj.init)
      additionalDeps = {
      }
      logger.info('Going to initialize theme ' + plugin.config.plugin.theme.name + ' of ' + plugin.config.plugin.name)
      injector = new Injector(null, null, {}, self.rootDir, additionalDeps)
      themeDecorates.forEach(function (m) {
        injector.add(m, hashedPlugins[m].init)
      })
      allPromise.push(injector.getFunction(themeObj))
      logger.info(plugin.config.plugin.theme.name + ' initialized')
    })
    return bluebird.all(allPromise)
  },
  executeModules: function (plugins, app, adminApp) {
    var self,
      executeSequence,
      allPromise
    self = this
    executeSequence = createExecuteSequence(plugins)
    allPromise = []
    const hashedPlugins = this.hashPluginsUsingNames(plugins)
    executeSequence.forEach(function (module) {
      var moduleObj,
        injector,
        additionalDeps
      logger.info('Executing ' + module.name)
      moduleObj = hashedPlugins[module.name]
      additionalDeps = {
        config: moduleObj.config,
        self: moduleObj.privateMethod
      }
      injector = new Injector(app, adminApp, moduleObj.config, self.rootDir, additionalDeps)
      module.accesses.forEach(function (m) {
        injector.add(m, hashedPlugins[m].publicMethod)
      })
      allPromise.push(injector.getToExecute(require(moduleObj.config.plugin.path)))
      logger.info(module.name + ' Executed ')
    })
    return bluebird.all(allPromise)
  }
}

function createInitialiseSequence (plugins) {
  /*
  modules is complete module object from addPropertiesToModules
  */
  var pluginDecorates = {}
  var sequence = []
  var hasBeenAdded = {}
  plugins.forEach(function (plugin) {
    pluginDecorates[plugin.name] = getArguments(require(plugin.config.plugin.path).init)
  })
  plugins.forEach(function (plugin) {
    addToSequence(plugin.name)
  })
  return sequence

  function addToSequence (plugin) {
    var i,
      thisModuleDecorates
    if (hasBeenAdded.hasOwnProperty(plugin)) {
      return
    }
    thisModuleDecorates = pluginDecorates[plugin]
    hasBeenAdded[plugin] = true
    for (i = 0; i < thisModuleDecorates.length; i++) {
      addToSequence(thisModuleDecorates[i])
    }
    sequence.push({
      name: plugin,
      decorates: thisModuleDecorates
    })
  }
}

function createExecuteSequence (Modules) {
  /*
  modules is complete module object from addPropertiesToModules
  */
  var moduleAccesses = {}
  var sequence = []
  var hasBeenAdded = {}
  Modules.forEach(function (module) {
    moduleAccesses[module.name] = getArguments(require(module.config.plugin.path).execute)
  })
  Modules.forEach(function (module) {
    addToSequence(module.name)
  })
  return sequence

  function addToSequence (plugin) {
    var i
    var thisModuleAccesses
    if (hasBeenAdded.hasOwnProperty(plugin)) {
      return
    }
    hasBeenAdded[plugin] = true
    thisModuleAccesses = moduleAccesses[plugin]
    for (i = 0; i < thisModuleAccesses.length; i++) {
      addToSequence(thisModuleAccesses[i])
    }
    sequence.push({
      name: plugin,
      accesses: thisModuleAccesses
    })
  }
}

function getArguments (func) {
  // This regex is from require.js
  var FN_ARGS = /^function\s*[^(]*\(\s*([^)]*)\)/m
  var args = func.toString().match(FN_ARGS)[1].split(',')
  args = args.map(function (arg) {
    var trimmedArg = arg.trim()
    return trimmedArg.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
  }).filter(function (arg) {
    return arg !== '' && ['app', 'admin-app', 'config', 'self'].indexOf(arg) === -1
  })
  return args
}
function createThemeObjectForPlugin (config, type) {
  // type is either mainTheme or adminTheme
  return {
    theme: {
      name: config[type],
      assetDir: '/public/' + config[type] + '/public/',
      dir: config.rootDir + '/' + config.themesFamily + '/node_modules/' + config[type]
    }
  }
}
function addDirAndAssetDirToTheme (config, pluginsFamily, themesFamily, rootDir) {
  var theme = config.plugin.theme
  if (theme.name === 'default_theme') {
    theme.dir = rootDir + '/' + pluginsFamily + '/node_modules/' + config.plugin.dir + '/default_theme'
    theme.assetDir = '/plugin-public/' + config.plugin.dir + '/default_theme/public'
  } else {
    theme.dir = rootDir + '/' + themesFamily + '/node_modules/' + theme.name
    theme.assetDir = '/plugin-public/' + theme.name + '/public'
  }
}

function createNewInstances () {
  var publicMethod = {}
  var PrivateMethod = function () {}
  PrivateMethod.prototype = publicMethod
  var privateMethodInstance = new PrivateMethod()
  var InitMethod = function () {
    this.init = {}
    this.init.register = this
    this.publicMethod = publicMethod
    this.privateAndPublicMethod = privateMethodInstance
    this.wrap = function (contextName, func) {
      var temp,
        temp2,
        thisObject
      if (!privateMethodInstance.hasOwnProperty(contextName) &&
          !publicMethod.hasOwnProperty(contextName)) {
        // throw error that method does not exist
        return
      }
      if (privateMethodInstance.hasOwnProperty(contextName)) {
        thisObject = privateMethodInstance
      } else if (publicMethod.hasOwnProperty(contextName)) {
        thisObject = publicMethod
      }
      temp = thisObject[contextName]
      temp2 = func.bind(temp.data, temp)
      temp2.data = thisObject.data
      temp2.bindParam = function (prop, value) {
        this.data[prop] = value
        return this
      }
      thisObject[contextName] = temp2
    }
    this.register = function (options) {
      var temp2
      var temp3
      var temp
      temp = {}
      if (isString(options)) {
        options = {
          name: options,
          isPublic: false
        }
      }
      if (options.hasOwnProperty('initialValue')) {
        temp2 = options.initialValue
      } else {
        temp2 = function () {}
      }
      temp3 = temp2.bind(temp)

      temp3.data = temp
      temp3.bindParam = function (prop, value) {
        this.data[prop] = value
        return this
      }
      if (options.hasOwnProperty('isPublic') && options.isPublic === false) {
        privateMethodInstance[options.name] = temp3
      } else {
        publicMethod[options.name] = temp3
      }
    }
  }
  InitMethod.prototype = privateMethodInstance
  return {
    private: privateMethodInstance,
    public: publicMethod,
    init: new InitMethod()
  }
}
