const express = require('express')
const cors = require('cors')
const path = require('path')
const axios = require('axios')
const config = require('./config')
const qs = require('qs')

const port = process.env.PORT || 5000;

var app = express();

app.use(cors())

const header_token = {
  headers: {
    "Authorization": `Bearer ${config.token}`
  }
}

app.get('/currentheartrate', (req, res) => {
    axios.get('https://api.fitbit.com/1/user/-/activities/heart/date/today/1d.json',header_token)
    .then(response => {
      let timelist = response.data['activities-heart-intraday'].dataset;

      res.send(timelist[timelist.length - 1])
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
    console.log(response.data.summary.totalMinutesAsleep)
    res.send({success: true, totalMinutesAsleep: response.data.summary.totalMinutesAsleep})
  })
  .catch(e => {res.send(e)})
})

app.get('/steps', (req, res) => {

  axios.get(`https://api.fitbit.com/1/user/-/activities/date/2020-04-01.json`, header_token)
  .then(response => {
    console.log(response.data.summary.steps)
    res.send({success: true, steps: response.data.summary.steps})
  })
  .catch(e => {res.send(e)})

})

app.get('/refresh', (req, res) => {

  var data = qs.stringify({
    'grant_type': 'refresh_token',
    // this refresh token will eventually come from a database
    'refresh_token': 'd7860fd797955a0877e3c0ef84d0d5eb1c2bd11ec1a41d134a10b904340ecb41',
    'expires_in': 60 
  })
 
  // only specify grant_type and refresh_token
  axios.post('https://api.fitbit.com/oauth2/token', 
  
  data, {
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic MjJCR1NQOjUwMjEyZTlmNWIwYWUyOWZiMTE1Yzg4ODdlMDM3NTli'
    }
  })
  .then(response => {
    console.log("Responsing")
    res.send({success: 1, access_token: response.data.access_token, refresh_token: response.data.refresh_token, expires_in: response.data.expires_in})
  })
  .catch(e => {
    console.log("Erroring")
    console.log(e);
    res.send({success: 0})
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
