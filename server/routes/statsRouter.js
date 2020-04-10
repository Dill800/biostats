const express = require('express')
const statsRouter = new express.Router();
const statsController = require('../controllers/statsController')

// Update access token
statsRouter.get('/*', statsController.retrieve, statsController.verify);

statsRouter.get('/steps', statsController.getSteps)
statsRouter.get('/sleep', statsController.getSleep)
statsRouter.get('/heartrate', statsController.getHeartRate)

module.exports = statsRouter
