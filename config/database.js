var mongoose=require('mymongoose');
var URI=['mongodb://localhost:27017/cms','mongodb://localhost:27017/cms_test'];
    //first database for production mode and second database for testing mode
mongoose.connection.on('error', function (err) {
  console.log('Could not connect to mongo server!');
  console.log(err);
});
module.exports = {

    url : process.env.MONGOLAB_URI, // looks like mongodb://<user>:<pass>@mongo.onmodulus.net:27017/Mikha4ot
    connect:function(mode){
        mongoose.connect(this.url||URI[mode], { config: { autoIndex: false } });
    },
    drop:function(){
        mongoose.connect(URI[1],function(){
            /* Drop the DB */
            mongoose.connection.db.dropDatabase();
        });
    }
};
