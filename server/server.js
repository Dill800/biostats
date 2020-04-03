const express = require('express')
const cors = require('cors')
const path = require('path')
const axios = require('axios')
const config = require('./config')
const qs = require('qs')
const mongoose = require('mongoose')
const Tokens = require('./db/tokenSchema.js')

const port = process.env.PORT || 5000;

var app = express();

app.use(cors())

mongoose.connect(config.dburi, {useNewUrlParser: true, useUnifiedTopology: true}, () => {
  console.log("Database Connection Successful!")
})

// Will get updated before server starts
let auth_header = null;

let today = new Date();
var todayFormatted = today.getFullYear()+'-'+(String)(today.getMonth()+1).padStart(2, '0') +'-'+(String)(today.getDate()).padStart(2, '0');

// Each request checks to see if access token is valid before proceeding
app.use('/*', (req, res, next) => {

  // Check for access token expiration
  axios.get('https://api.fitbit.com/1/user/-/profile.json', auth_header)
  .then(response => {

    // no issues
    if(response.status === 200) {
      console.log("Auth token is still valid")
      next();
      return;
    }

    // something weird happened
    console.log("Issue with request: ", response.status);

  })
  .catch(e => {
    console.log(e.response.status, e.response.statusText, e.response.headers['retry-after'])

    // Access token expired
    if(e.response.status === 401) {

      console.log("ACCESS TOKEN WAS EXPIRED")

      // Retrieve refresh token from DB and use to get new access and refresh token
      Tokens.findOne({type: 'refresh'}, (err, token) => {
  
        if(token === null || err) {
          res.send({success: 0})
          return;
        }
        
        let data = qs.stringify({
          'grant_type': 'refresh_token',
          'refresh_token': token.value
        })
  
        axios.post('https://api.fitbit.com/oauth2/token', data, 
        {
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${config.base64authkey}`
          }
        })
        .then(response => {

          // Update the header token locally
          // reduces db calls
          auth_header = {
            headers: {
              "Authorization": `Bearer ${response.data.access_token}`
            }
          }

          // Update Access Token in db
          Tokens.updateOne({type: 'access'}, {value: response.data.access_token}, (err, val) => {
            if(err) {
              console.log("Error updating access token in DB")
              res.send('error')
              return;
            }
          });
  
          // update refresh token in db
          Tokens.updateOne({type: 'refresh'}, {value: response.data.refresh_token}, (err, val) => {
            if(err) {
              console.log("Error updating refresh token in DB")
              res.send('error')
              return;
            }
          });
  
          next();
        })
        .catch(e => {
          console.log("Error in refreshing access and refresh tokens")
          res.send({success: 0})
        })
  
      })

    }

  })

})

// Returns steps for the day
app.get('/steps', (req, res) => {
  axios.get(`https://api.fitbit.com/1/user/-/activities/date/${todayFormatted}.json`, auth_header)
  .then(response => {
    res.send({success: true, steps: response.data.summary.steps})
  })
  .catch(e => {res.send(e)})
})

// Returns heartrate in BPM
app.get('/heartrate', (req, res) => {
  axios.get('https://api.fitbit.com/1/user/-/activities/heart/date/today/1d.json',auth_header)
  .then(response => {
    let timelist = response.data['activities-heart-intraday'].dataset;
    res.send({success: true, heartrate: timelist.length === 0 ? 0 : timelist[timelist.length - 1]})
  })
  .catch(e => res.send(e))
})

// Returns sleep in hours
app.get('/sleep', (req, res) => {
  
  axios.get(`https://api.fitbit.com/1.2/user/-/sleep/date/${todayFormatted}.json`, auth_header)
  .then(response => {
    let minsAsleep = response.data.summary.totalMinutesAsleep;
    let timeSlept = Math.round(minsAsleep * 100.0 / 60)/100;
    res.send({success: true, totalMinutesAsleep: timeSlept})
  })
  .catch(e => {res.send(e)})
})

// Retrieve access token before starting server
Tokens.findOne({type: 'access'}, (err, token) => {
  if(err || token === null) {
    console.log("there was an error (most likely no access token in db)");
    return;
  }
  auth_header = {
    headers: {
      "Authorization": `Bearer ${token.value}`
    }
  }

  app.listen(port, () => console.log(`Server now running on port ${port}!`));
})

// deployment stuff
//if (process.env.NODE_ENV === 'production') {
  // Serve any static files
  app.use(express.static(path.join(__dirname, '../client/build')));

  // Handle React routing, return all requests to React app
  app.get('*', function(req, res) {
      res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
//}