var mongoose = require('mymongoose');

// define the schema for our user model
var adminSchema = mongoose.Schema({
    theme : {
        name : String
    }
});


// create the model for users and expose it to our app
module.exports = mongoose.model('admin', adminSchema);
