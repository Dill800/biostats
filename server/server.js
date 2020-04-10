const express = require('express')
const cors = require('cors')
const path = require('path')
const mongoose = require('mongoose')
const statsRouter = require('./routes/statsRouter')

// Use env port or default
const port = process.env.PORT || 5000;

const app = express();

app.use(cors());

// connect to DB
mongoose.connect(process.env.MONGODB_URI || require('./config').dburi, {useNewUrlParser: true, useUnifiedTopology: true}, () => {
    console.log("Database Connection Successful!")
})

app.use('/stats', statsRouter)

// Serve any static files
app.use(express.static(path.join(__dirname, '../client/build')));

// Handle React routing, return all requests to React app
app.get('*', function(req, res) {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

// Start server
app.listen(port, () => console.log(`Server now running on port ${port}!`));
