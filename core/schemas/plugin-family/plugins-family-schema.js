var mongoose = require('mymongoose');

// define the schema for our user model
var pluginsFamilySchema = mongoose.Schema({
    name : String
});

// create the model for users and expose it to our app
module.exports = mongoose.model('plugins-family', pluginsFamilySchema);
