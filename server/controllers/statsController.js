const axios = require('axios');
const jwt_decode = require('jwt-decode')
const mongoose = require('mongoose')
const qs = require('qs')
const Tokens = require('../models/tokenModel')

module.exports = {

    retrieve: (req, res, next) => {
        
        Tokens.findOne({type: 'access'}, (err, accessToken) => {

            if(err || accessToken === null) {
                res.send({success: false, msg: 'Issue initally fetching access token'})
                return;
            }

            req.accessToken = accessToken.value;

            next();

        })

    },

    verify: (req, res, next) => {

        let decodedToken = jwt_decode(req.accessToken);
        let currentTime = Date.now().valueOf() / 1000;

        if(decodedToken.exp < currentTime) {

            console.log("ACCESS TOKEN EXPIRED");

            Tokens.findOne({type: 'refresh'}, (err, refreshToken) => {

                if(refreshToken === null || err) {
                    res.send({success: false, msg: 'Error in fetching refresh token'});
                    return;
                }

                let data = qs.stringify({
                    'grant_type': 'refresh_token',
                    'refresh_token': refreshToken.value
                })

                // Fetch new access token
                axios.post('https://api.fitbit.com/oauth2/token', data,
                {
                    headers: {
                        'content-type': 'application/x-www-form-urlencoded',
                        'Authorization': `Basic ${process.env.AUTH_KEY || require('../config').base64authkey}`
                      }
                })
                .then(response => {

                    // Update current access token
                    req.accessToken = response.data.access_token;

                    // Update Access Token in db
                    Tokens.updateOne({type: 'access'}, {value: response.data.access_token}, (err, val) => {
                        if(err) {
                            res.send({success: false, msg: 'Error updating access token in db'});
                            return;
                        }
                    });

                    // update refresh token in db
                    Tokens.updateOne({type: 'refresh'}, {value: response.data.refresh_token}, (err, val) => {
                        if(err) {
                            res.send({success: false, msg: 'Error updating refresh token in db'});
                            return;
                        }
                    });

                    next();

                })

            })


        }
        else {
            console.log("access token good")
            next();
        }

    },

    getSteps: (req, res) => {
        axios.get(`https://api.fitbit.com/1/user/-/activities/date/today.json`, 
        {
            headers: {
                "Authorization": `Bearer ${req.accessToken}`
            }
        })
        .then(response => {
            res.send({success: true, value: response.data.summary.steps})
        })
        .catch(e => {res.send({success: false})})
    },

    getSleep: (req, res) => {
        axios.get(`https://api.fitbit.com/1.2/user/-/sleep/date/today.json`, 
        {
            headers: {
                "Authorization": `Bearer ${req.accessToken}`
            }
        })
        .then(response => {
            let minsAsleep = response.data.summary.totalMinutesAsleep;
            let timeSlept = Math.round(minsAsleep * 100.0 / 60)/100;
            res.send({success: true, value: timeSlept})
        })
        .catch(e => {res.send({success: false})})
    },

    getHeartRate: (req, res) => {
        axios.get('https://api.fitbit.com/1/user/-/activities/heart/date/today/1d.json',
        {
            headers: {
                "Authorization": `Bearer ${req.accessToken}`
            }
        })
        .then(response => {
            let timelist = response.data['activities-heart-intraday'].dataset;
            res.send({success: true, value: timelist.length === 0 ? 0 : timelist[timelist.length - 1].value})
        })
        .catch(e => {res.send({success: false})})
    }



}