var mongoose = require("mongoose");
var Schema = mongoose.Schema;
mongoose.connect("mongodb://Vithor:paimae12@ds121483.mlab.com:21483/umdatabaseteste", {
    useMongoClient: true
}, (err) => {
    if (err) return console.log("Erro ao conectar no database 'umdatabaseteste'");
    console.log("Conectado ao database 'umdatabaseteste' ");
})