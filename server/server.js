require('newrelic')
const express = require('express')
const cors = require('cors')
const path = require('path')
const axios = require('axios')
const qs = require('qs')
const mongoose = require('mongoose')
const jwt_decode = require('jwt-decode')
const Tokens = require('./db/tokenSchema.js')

const port = process.env.PORT || 5000;

var app = express();

app.use(cors())

mongoose.connect(process.env.MONGODB_URI || require('./config').dburi, {useNewUrlParser: true, useUnifiedTopology: true}, () => {
  console.log("Database Connection Successful!")
})

// Will get updated before server starts
let auth_header = null;

// Returns steps for the day
app.get('/steps', (req, res) => {
  axios.get(`https://api.fitbit.com/1/user/-/activities/date/today.json`, auth_header)
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
  
  axios.get(`https://api.fitbit.com/1.2/user/-/sleep/date/today.json`, auth_header)
  .then(response => {

    let minsAsleep = response.data.summary.totalMinutesAsleep;
    let timeSlept = Math.round(minsAsleep * 100.0 / 60)/100;
    res.send({success: true, totalMinutesAsleep: timeSlept})
  })
  .catch(e => {res.send(e)})
})

// Retrieve access token before starting server
Tokens.findOne({type: 'access'}, (err, accessToken) => {
  if(err || accessToken === null) {
    console.log("there was an error (most likely no access token in db)");
    return;
  }

  auth_header = {
    headers: {
      "Authorization": `Bearer ${accessToken.value}`
    }
  }

  let decodedToken = jwt_decode(accessToken.value);
  let currentTime = Date.now().valueOf() / 1000;

  // Checks to see if access token is valid
  if(decodedToken.exp < currentTime) {

    console.log("ACCESS TOKEN EXPIRED");

    // fetch new token and update db
    Tokens.findOne({type: 'refresh'}, (err, token) => {
  
      if(token === null || err) {
        console.log("ERROR OCCURED WHEN FETCHING INITIAL REFRESH TOKEN")
      }
      
      let data = qs.stringify({
        'grant_type': 'refresh_token',
        'refresh_token': token.value
      })

      // Retrieve new access token
      axios.post('https://api.fitbit.com/oauth2/token', data, 
      {
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${process.env.AUTH_KEY || require('./config').base64authkey}`
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
          }
        });

        // update refresh token in db
        Tokens.updateOne({type: 'refresh'}, {value: response.data.refresh_token}, (err, val) => {
          if(err) {
            console.log("Error updating refresh token in DB")
            return;
          }
        });

      })
      .catch(e => {
        console.log("Error in refreshing access and refresh tokens")
      })

    })

  }

  app.listen(port, () => console.log(`Server now running on port ${port}!`));
})

// Serve any static files
app.use(express.static(path.join(__dirname, '../client/build')));

// Handle React routing, return all requests to React app
app.get('*', function(req, res) {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});
