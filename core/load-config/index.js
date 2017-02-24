/*jshint esversion: 6, node: true */
/*global module, require*/
var nconf = require('nconf');
var bluebird = require('bluebird');
var admin = require('../schemas/admin');
var main = require('../schemas/main');
var pluginsFamily = require('../schemas/plugin-family');
var plugins = require('../schemas/plugins');
var themesFamily = require('../schemas/themes-family');
var configObj = {};
module.exports = function (logger) {
	return loadConfigFromDB().then(function () {
		nconf.argv().env();
		return bluebird.all([saveInDB(themesFamily, 'themes-family', {
			name : nconf.get("themes-family")
		}, logger),
		saveInDB(pluginsFamily, 'plugins-family', {
			name : nconf.get("plugins-family")
		}, logger),
		saveInDB(admin, 'admin-theme', {
			theme : {
				name : nconf.get("admin-theme")
			}
		}, logger),
		saveInDB(main, 'main-theme', {
			theme : {
				name : nconf.get("main-theme")
			}
		}, logger),
		loadPluginsList(logger)]);
	});
};
function saveInDB(schema, configEntry, content, logger){
	if(! (configEntry in configObj) || nconf.get("forced") === "true"){
		configObj[configEntry] = nconf.get(configEntry);
		_temp = new schema(content);
		return _temp.save().then(function (doc) {
			logger.info(configEntry + nconf.get(configEntry) + "stored in database");
			return configObj[configEntry];
		});
	}
	return configObj[configEntry];
}
function loadPluginsList(logger){
	if(! ('plugins' in configObj) || nconf.get("forced") === "true"){
		var _plugins = Object.keys(require('../../' + nconf.get('plugins-family') + "/package.json").dependencies)
		.map(function (plugin) {
			return {
				name : plugin.split(".")[1],
				dir : plugin,
				theme : {
					name : 'default_theme'
				}
			};
		});
		plugins.collection.insert(_plugins, function (err, docs) {
			configObj[plugins] = docs;
			logger.info("Plugins loaded in DB");
		});
		configObj.plugins = _plugins;
		return _temp.save().then(function (doc) {
			logger.info("Plugins stored in database");
			return configObj.plugins;
		});
	}
	return configObj.plugins;
}
function loadConfigFromDB () {
	return admin.findOne({}).exec().then(setAdminFromDB)
	.then(() => main.findOne({}).exec())
	.then(setMainFromDB)
	.then(() => themesFamily.findOne({}).exec())
	.then(setThemesFamilyFromDB)
	.then(() => pluginsFamily.findOne({}).exec())
	.then(setPluginsFamilyFromDB)
	.then(() => plugins.find({}).exec())
	.then(setPluginsFromDB);
}
function setPluginsFromDB (plugins) {
	if (plugins.length !== 0) {
		configObj.plugins = plugins;
	}
}
function setPluginsFamilyFromDB (family) {
	if (family !== null) {
		configObj['plugins-family'] = family.name;
	}
}
function setThemesFamilyFromDB (family) {
	if (family !== null) {
		configObj['themes-family'] = family.name;
	}
}
function setAdminFromDB (admin) {
	if (admin !== null) {
		configObj['admin-theme'] = admin.theme.name;
	}
}
function setMainFromDB (main) {
	if (main !== null) {
		configObj['main-theme'] = main.theme.name;
	}
}
