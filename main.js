'use strict'
const express = require("express");
const Livestream = require('./create')
const app = express();
app.use(express.static(__dirname));
const HTMLS = __dirname + '/html/';
const PORT = 5555;
process.env.TZ = 'US/Eastern';

console.log('dirname=' + __dirname)
app.listen(PORT, () => {
    console.log("Application started and Listening on port ", PORT);
});

app.get("/", (req, res) => {
    res.sendFile(HTMLS + "home.html");
});

app.get("/create", (req, res) => {
    let livestream = new Livestream();
    livestream.create(res);
});