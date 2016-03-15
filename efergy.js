"use strict";

// Dependencies
require('pmx').init();
var express = require('express');
var bodyParser = require('body-parser');
var recipe = require('./routes/recipe');
var config = require('../config/config');
var socket = require('socket.io-client')(config.strongloop);
var request = require('request');
var app = express();

//Config
var channel = 'efergy';
var version = '0.0.1';
var port = 6032;
var type = 'iff';
var efergyUrl = 'http://www.energyhive.com/mobile_proxy/getInstant';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
// Express
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
// URLS
app.post('/createrecipe', recipe);
socket.on('efergy-tokens', function(data) {
    request.get(efergyUrl + '?token=' + data.token, function(err, response, efergy) {
        if (err) {
            console.log(err);
        } else {
            efergy = JSON.parse(efergy);
            request.put(config.api + 'efergy-devices/', {
                form: {
                    power: parseInt(efergy.reading),
                    account: data.account,
                    recipes: ['any']
                }
            });
        }
    });
});
setInterval(function() {
    request.get(config.api + 'efergy-tokens/', function(err, response, tokens) {
        if (err) {
            console.log(err);
        } else {
            tokens = JSON.parse(tokens);
            tokens.forEach(function(token) {
                request.get(efergyUrl + '?token=' + token.token, function(err, response, efergy) {
                    if (err) {
                        console.log(err);
                    } else {
                        try {
                            efergy = JSON.parse(efergy);
                        } catch (err) {
                            console.log(err);
                        }
                        request.put(config.api + 'efergy-devices', {
                            form: {
                                power: parseInt(efergy.reading),
                                account: token.account
                            }
                        });
                    }
                });
            });
        }
    });
}, 10000);
// Start server
app.listen(port, function() {
    console.log('Starting server on port:', port);
    console.log('Channel:', channel + ' ' + version);
    console.log('Type:' + type);
    console.log('Node environment:', process.env.NODE_ENV);
});