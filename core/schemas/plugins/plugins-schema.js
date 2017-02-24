var mongoose = require('mymongoose');

// define the schema for our user model
var plugins = mongoose.Schema({
    name : String,
    dir : String,
    theme : {
        name : String
    }
});


// create the model for users and expose it to our app
module.exports = mongoose.model('plugins', plugins);
