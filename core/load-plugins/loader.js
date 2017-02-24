/*jslint node: true, plusplus: true */
/*global module, require*/
/* jshint strict: true */
'use strict';
var bluebird = require('bluebird');
var assign = require("lodash.assign");
var isString = require('lodash.isstring');
var express = require('express');
var Injector = require('./injector.js');
var admin,
	plugins,
	hashedPlugins;
module.exports = {
	loadPlugins: function (pluginsList) {
		plugins = pluginsList;
		return this;
	},
	addProperties: function (config) {
		/*
		modules is array of form from getModules function
		*/
		var all = [],
			logger,
			rootDir,
			pluginsFamily,
			themesFamily,
			main,
			admin,
			configs,
			global;
		logger = config.logger;
		rootDir = config.rootDir;
		pluginsFamily = config.pluginsFamily;
		themesFamily = config.themesFamily;
		main = createThemeObjectForPlugin(config, 'mainTheme');
		admin = createThemeObjectForPlugin(config, 'adminTheme');
		configs = [];
		global = {
			main: main,
			admin: admin,
			rootDir: rootDir,
			all: {
				configs: configs
			}
		};

		plugins = plugins.map(function (plugin) {
			var config,
				theme,
				publicMethod,
				PrivateMethod,
				privateMethodInstance,
				InitMethod;

			config = {
				plugin: {
					name: plugin.name,
					dir: plugin.dir || plugin.name,
					theme: {
						name: plugin.theme.name || 'default_theme'
					},
					admin: {},
					main: {}
				},
				global: global
			};
			configs.push(config);
			addDirAndAssetDirToTheme(config, pluginsFamily, themesFamily, rootDir);
			config.plugin.admin.views = [
				config.plugin.theme.dir,
				config.global.admin.theme.dir
			];
			config.plugin.main.views = [
				config.plugin.theme.dir,
				config.global.main.theme.dir
			];
			publicMethod = {};
			PrivateMethod = function () {};
			PrivateMethod.prototype = publicMethod;
			privateMethodInstance = new PrivateMethod();
			InitMethod = function () {
				this.init = {};
				this.init.register = this;
				this.publicMethod = publicMethod;
				this.privateAndPublicMethod = privateMethodInstance;
				this.wrap = function (contextName, func) {
					var temp,
						temp2,
						thisObject;
					if (!privateMethodInstance.hasOwnProperty(contextName) &&
							!publicMethod.hasOwnProperty(contextName)) {
						//throw error that method does not exist
						return;
					}
					if (privateMethodInstance.hasOwnProperty(contextName)) {
						thisObject = privateMethodInstance;
					} else if (publicMethod.hasOwnProperty(contextName)) {
						thisObject = publicMethod;
					}
					temp = thisObject[contextName];
					temp2 = func.bind(temp.data, temp);
					temp2.data = thisObject.data;
					temp2.bindParam = function (prop, value) {
						this.data[prop] = value;
						return this;
					};
					thisObject[contextName] = temp2;
				};
				this.register = function (options) {
					var self = this,
						temp2,
						temp3,
						temp;
					self = this;
					temp = {};
					if (isString(options)) {
						options = {
							name: options,
							isPublic: false
						};
					}
					if (options.hasOwnProperty('initialValue')) {
						temp2 = options.initialValue;
					} else {
						temp2 = function () {};
					}
					temp3 = temp2.bind(temp);

					temp3.data = temp;
					temp3.bindParam = function (prop, value) {
						this.data[prop] = value;
						return this;
					};
					if (options.hasOwnProperty('isPublic') && options.isPublic === false) {
						privateMethodInstance[options.name] = temp3;
					} else {
						publicMethod[options.name] = temp3;
					}
				};
			};
			InitMethod.prototype = privateMethodInstance;
			return {
				name: plugin.name,
				dir: plugin.dir || plugin.name,
				init: new InitMethod(),
				privateMethod: privateMethodInstance,
				publicMethod: publicMethod,
				config: config
			};
						
		});
		logger.info("All the plugins have been loaded in memory");
		return this;
	},
	hashModulesUsingNames: function () {
		/*
		modules is complete module object from previous function
		*/
		hashedPlugins = {};
		plugins.forEach(function (module) {
			hashedPlugins[module.name] = module;
			return module;
		});
		return this;
	},
	modifyDefinition: function (config) {
		/*
		modules is complete module object from addPropertiesToModules function
		*/
		var self = this,
			allPromise = [],
			logger = config.logger;
		plugins.forEach(function (module) {
			module = require('../../' + config.pluginsFamily + '/node_modules/' + module.dir);
			if (!module.hasOwnProperty('init')) {
				module.init = function () {
					return bluebird.resolve();
				};
			}
			if (!module.hasOwnProperty('execute')) {
				module.execute = function () {
					return bluebird.resolve();
				};
			}
		});
		logger.info("All the plugins definition have been modified");
		return this;
	},
	initialiseModules: function (config) {
		var self = this,
			logger,
			initialiseSequence,
			allPromise;
		initialiseSequence = createInitialiseSequence(plugins, config);
		allPromise = [];
		logger = config.logger;
		initialiseSequence.forEach(function (module) {
			var moduleObj,
				additionalDeps,
				injector;
			logger.info("Going to initialize " + module.name + " of directory " + module.dir);
			moduleObj = hashedPlugins[module.name];
			additionalDeps = {
				config: moduleObj.config,
				logger: logger,
				self: moduleObj.init
			};
			injector = new Injector(null, null, moduleObj.config, self.rootDir, additionalDeps);
			module.decorates.forEach(function (m) {
				injector.add(m, hashedPlugins[m].init);
			});
			allPromise.push(injector.getFunction(require('../../' + config.pluginsFamily + '/node_modules/' + moduleObj.dir)));
			logger.info(module.name + " initialized");
		});
		return bluebird.all(allPromise);
	},
	initialiseThemes: function (config, typeOfTheme) {
		var themeObj,
			logger,
			injector,
			self,
			allPromise,
			themeDecorates,
			additionalDeps;
		logger = config.logger;
		allPromise = [];
		try {
			themeObj = require('../../' + config.themesFamily + '/node_modules/' + config[typeOfTheme]);
		} catch (err) {
			return bluebird.resolve();
		}
		self = this;
		themeDecorates = getArguments(themeObj.init);
		logger.info("Going to initialize the theme" + config.adminTheme);
		additionalDeps = {
			logger: logger
		};
		injector = new Injector(null, null, {}, self.rootDir, additionalDeps);
		themeDecorates.forEach(function (m) {
			injector.add(m, hashedPlugins[m].init);
		});
		allPromise.push(injector.getFunction(themeObj));
		logger.info(module.name + " initialized");
		return bluebird.all(allPromise);
	},
	initialisePluginsThemes: function (config) {
		var self = this,
			allPromise = [],
			themeDecorates,
			logger;
		logger = config.logger;
		plugins.forEach(function (plugin) {
			var themeObj,
				themeDecorates,
				additionalDeps,
				injector;
			try {
				themeObj = require(plugin.config.plugin.theme.dir);
			} catch (err) {
				return bluebird.resolve();
			}
			themeDecorates = getArguments(themeObj.init);
			additionalDeps = {
				logger: logger
			};
			logger.info("Going to initialize theme " + plugin.config.plugin.theme.name + ' of ' + plugin.config.plugin.name);
			injector = new Injector(null, null, {}, self.rootDir, additionalDeps);
			themeDecorates.forEach(function (m) {
				injector.add(m, hashedPlugins[m].init);
			});
			allPromise.push(injector.getFunction(themeObj));
			logger.info(plugin.config.plugin.theme.name + " initialized");
		});
		return bluebird.all(allPromise);
	},
	executeModules: function (app, adminApp, config) {
		var self,
			logger,
			executeSequence,
			allPromise;
		self = this;
		executeSequence = createExecuteSequence(plugins, config);
		allPromise = [];
		logger = config.logger;
		executeSequence.forEach(function (module) {
			var moduleObj,
				injector,
				additionalDeps;
			logger.info("Executing " + module.name);
			moduleObj = hashedPlugins[module.name];
			additionalDeps = {
				config: moduleObj.config,
				logger: logger,
				self: moduleObj.privateMethod
			};
			injector = new Injector(app, adminApp, moduleObj.config, self.rootDir, additionalDeps);
			module.accesses.forEach(function (m) {
				injector.add(m, hashedPlugins[m].publicMethod);
			});
			allPromise.push(injector.getToExecute(require('../../' + config.pluginsFamily + '/node_modules/' + moduleObj.dir)));
			logger.info(module.name + " Executed ");
		});
		return bluebird.all(allPromise);
	}
};

function createInitialiseSequence(modules, config) {
	/*
	modules is complete module object from addPropertiesToModules
	*/
	var moduleDecorates = {},
		sequence = [],
		hasBeenAdded = {};
	modules.forEach(function (module) {
		moduleDecorates[module.name] = getArguments(require('../../' + config.pluginsFamily + '/node_modules/' + module.dir).init);
	});
	modules.forEach(function (module) {
		addToSequence(module.name);
	});
	return sequence;

	function addToSequence(plugin) {
		var i,
			thisModuleDecorates;
		if (hasBeenAdded.hasOwnProperty(plugin)) {
			return;
		}
		thisModuleDecorates = moduleDecorates[plugin];
		hasBeenAdded[plugin] = true;
		for (i = 0; i < thisModuleDecorates.length; i++) {
			addToSequence(thisModuleDecorates[i]);
		}
		sequence.push({
			name: plugin,
			decorates: thisModuleDecorates
		});
	}
}

function createExecuteSequence(Modules, config) {
	/*
	modules is complete module object from addPropertiesToModules
	*/
	var moduleAccesses = {},
		sequence = [],
		hasBeenAdded = {};
	Modules.forEach(function (module) {
		moduleAccesses[module.name] = getArguments(require('../../' + config.pluginsFamily + '/node_modules/' + module.dir).execute);
	});
	Modules.forEach(function (module) {
		addToSequence(module.name);
	});
	return sequence;

	function addToSequence(plugin) {
		var i,
			thisModuleAccesses;
		if (hasBeenAdded.hasOwnProperty(plugin)) {
			return;
		}
		hasBeenAdded[plugin] = true;
		thisModuleAccesses = moduleAccesses[plugin];
		for (i = 0; i < thisModuleAccesses.length; i++) {
			addToSequence(thisModuleAccesses[i]);
		}
		sequence.push({
			name: plugin,
			accesses: thisModuleAccesses
		});
	}
}

function getArguments(func) {
	//This regex is from require.js
	var FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m,
		args = func.toString().match(FN_ARGS)[1].split(',');
	args = args.map(function (arg) {
		var trimmedArg = arg.trim();
		return trimmedArg.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
	}).filter(function (arg) {
		return arg !== '' && ['app', 'admin-app', 'config', 'self','logger'].indexOf(arg) === -1;
	});
	return args;
}
function createThemeObjectForPlugin(config, type) {
	//type is either mainTheme or adminTheme
	return {
		theme: {
			name: config[type],
			assetDir: '/public/' + config[type] + '/public/',
			dir: config.rootDir + '/' + config.themesFamily + '/node_modules/' + config[type]
		}
	};
}
function addDirAndAssetDirToTheme(config, pluginsFamily, themesFamily, rootDir) {
	var theme = config.plugin.theme;
	if (theme.name === 'default_theme') {
		theme.dir = rootDir + '/' + pluginsFamily + '/node_modules/' + config.plugin.dir + '/default_theme';
		theme.assetDir = "/plugin-public/" + config.plugin.dir + "/default_theme/public";
	} else {
		theme.dir = rootDir + '/' + themesFamily + '/node_modules/' + theme.name;
		theme.assetDir = "/plugin-public/" + theme.name + "/public";
	}
}

