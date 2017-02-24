/*jslint node: true */
/*global module, require*/
'use strict';

var bluebird = require('bluebird');
var merge = require("lodash.merge");
var isString = require('lodash.isstring');
var express = require('express');

var modules = require('./loader.js');

module.exports = function (app, adminApp, config) {
	var self = this,
		logger = config.logger;
	modules.rootDir = config.rootDir;
	modules.config = config;
	modules.loadPlugins(config.plugins)
		.addProperties(config)
		.hashModulesUsingNames()
		.modifyDefinition(config)
		.initialiseModules(config)
		.then(function () {
			return modules.initialiseThemes(config, 'adminTheme');
		})
		.then(function ()  {
			return modules.initialiseThemes(config, 'mainTheme');
		})
		.then(function () {
			return modules.initialisePluginsThemes(config);
		})
		.then(function () {
			return modules.executeModules(app, adminApp, config);
		})
		.then(function () {
			logger.info("done");
		})
		.catch(function (er) {
			logger.error(er);
		});
};