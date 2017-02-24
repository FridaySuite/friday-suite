/*jshint esversion: 6, node: true */
/*jslint node: true*/
/*global module, require*/
'use strict';
var assign = require("lodash.assign");
var express = require('express');
var Injector = class Injector {
	constructor(_app, _adminApp, config, rootDir, additionalDeps) {
		if ('plugin' in config)
			config.plugin.locals = {};
		if (_app !== null) {
			var app = express();
			app.set('views', config.plugin.main.views);
			app.locals.basedir = config.global.main.theme.dir;
			app.locals.plugin = {
				theme: config.plugin.theme
			};
			assign(app.locals, config.global.main);
			additionalDeps.app = app;
			config.plugin.locals.main = app.locals;
			_app.use(app);
		}
		if (_adminApp !== null) {
			var adminApp = express();
			adminApp.set('views', config.plugin.admin.views);
			adminApp.locals.plugin = {
				theme: config.plugin.theme
			};
			adminApp.locals.basedir = config.global.admin.theme.dir;
			assign(adminApp.locals, config.global.admin);
			additionalDeps.adminApp = adminApp;
			config.plugin.locals.admin = adminApp.locals;
			_adminApp.use(adminApp);
		}
		this.dependencies = additionalDeps;
	}
	add(qualifier, obj) {
		this.dependencies[hyphenatedToCamelCase(qualifier)] = obj;
	}
	getFunction(module) {
		var dependencies = resolveDeps(module.init, this.dependencies);
		return module.init.apply(module, dependencies);
	}
	getToExecute(module) {
		var dependencies = resolveDeps(module.execute, this.dependencies);
		return module.execute.apply(module, dependencies);
	}
};
module.exports = Injector;

function hyphenatedToCamelCase(str) {
	// code taken from http://stackoverflow.com/a/6661012/1533609
	return str.replace(/-([a-z])/g, function (g) {
		return g[1].toUpperCase();
	});
}
function resolveDeps(func, dependencies) {
	var args = getArguments(func);
	var ddependencies = [];
	for (var i = 0; i < args.length; i++) {
		ddependencies.push(dependencies[args[i]]);
	}
	return ddependencies;
}

function getArguments(func) {
	//This regex is from require.js
	var FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;
	var args = func.toString().match(FN_ARGS)[1].split(',');
	args = args.map(function (arg) {
		var trimmedArg = arg.trim();
		return trimmedArg;
	}).filter(function (arg) {
		return arg !== '';
	});
	return args;
}