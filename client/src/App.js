import React, { useState, useEffect } from 'react';
import logo from './logo.svg';
import './App.css';
import axios from 'axios'

function App() {

  const [heartRate, setHeartRate] = useState('?');
  const [steps, setSteps] = useState('?');
  const [sleepTime, setSleepTime] = useState('?');

  useEffect(() => {
    axios.get('/heartrate')
    .then(response => {
      setHeartRate(response.data.heartrate.value);
    })
  }, [])

  useEffect(() => {
    axios.get('/sleep')
    .then(response => {
      setSleepTime(response.data.totalMinutesAsleep);
    })
  }, [])

  useEffect(() => {
    axios.get('/steps')
    .then(response => {
      setSteps(response.data.steps);
    })
  }, [])

  return (
    <div className="App">
      
      <h1>This is a fitbit backend test</h1>
      <p>Heartrate: {heartRate}</p>
      <p>Steps Taken: {steps}</p>
      <p>Time Slept: {sleepTime}</p>


    </div>
  );
}

export default App;
