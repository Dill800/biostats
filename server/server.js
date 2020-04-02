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

// retrieve access token and proceed
Tokens.findOne({type: 'access'}, (err, token) => {

  if(err) {
    console.log(err);
    return;
  }

  let header_token = {
    headers: {
      "Authorization": `Bearer ${token.value}`
    }
  }
  
  app.get('/heartrate', (req, res) => {
      axios.get('https://api.fitbit.com/1/user/-/activities/heart/date/today/1d.json',header_token)
      .then(response => {
        let timelist = response.data['activities-heart-intraday'].dataset;
        res.send({success: true, heartrate: timelist.length === 0 ? 0 : timelist[timelist.length - 1]})
      })
      .catch(e => res.send(e))
  })
  
  app.get('/sleep', (req, res) => {
    let today = new Date();
    // include below line if dealing with yesterday
    today.setDate(today.getDate() - 1)
    var date = today.getFullYear()+'-'+(String)(today.getMonth()+1).padStart(2, '0') +'-'+(String)(today.getDate()).padStart(2, '0');
    axios.get(`https://api.fitbit.com/1.2/user/-/sleep/date/${date}.json`, header_token)
    .then(response => {
      res.send({success: true, totalMinutesAsleep: response.data.summary.totalMinutesAsleep})
    })
    .catch(e => {res.send(e)})
  })
  
  app.get('/steps', (req, res) => {
    axios.get(`https://api.fitbit.com/1/user/-/activities/date/2020-04-01.json`, header_token)
    .then(response => {
      res.send({success: true, steps: response.data.summary.steps})
    })
    .catch(e => {res.send(e)})
  })
  
  /*
   * Access token and Refresh token are saved to DB
   * Access token will initally be retrieved from database
   * Will use to hit endpoints
   * If access token expires, hit refresh and pass in the refresh token to api
   * Save new access token to local variable and database
   * Save new refresh token to database
  */
  
  app.get('/refresh', (req, res) => {
  
    Tokens.findOne({type: 'refresh'}, (err, token) => {

      if(token === null) {
        res.send({success: 0})
        return;
      }

      if(err) {
        console.log(err);
        return;
      }
      
      var data = qs.stringify({
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
        header_token = {
          headers: {
            "Authorization": `Bearer ${response.data.access_token}`
          }
        }
        console.log("Local header set to " + response.data.access_token)

        // update the tokens in the database
        console.log("Updating info in DB...")
        // Update Access Token
        Tokens.updateOne({type: 'access'}, {value: response.data.access_token}, (err, val) => {
          if(err) {
            console.log(err)
            res.send('error')
            return;
          }
        });

        Tokens.updateOne({type: 'refresh'}, {value: response.data.refresh_token}, (err, val) => {
          if(err) {
            console.log(err)
            res.send('error')
            return;
          }
        });

        res.send({success: 1, access_token: response.data.access_token, refresh_token: response.data.refresh_token, expires_in: response.data.expires_in})
      })
      .catch(e => {
        console.log("Error")
        console.log(e);
        res.send({success: 0})
      })

    })

  })

  // Serve static files from the React app
  app.use(express.static(path.join(__dirname, '../client/build')));

  // for any request that doesn't
  // match one above, send back React's index.html file.
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname+'../client/build/index.html'));
  });

  app.listen(port, () => console.log(`Server now running on port ${port}!`));

})






