var mongoose = require("mongoose");
var Schema = mongoose.Schema;
mongoose.connect(process.env.database, {
    useMongoClient: true
}, (err) => {
    if (err) return console.log("Erro ao conectar no database 'umdatabaseteste'");
    console.log("Conectado ao database 'umdatabaseteste' ");
})
var User = new Schema({
    _id: {
        type: String
    },
    coins: {
        type: Number,
        default: 0
    },
    ban: {
        type: Boolean,
        default: false
    },
    ajudante: {
        type: Boolean,
        default: false
    }
})

var Users = mongoose.model("Users", User);
exports.Users = Users