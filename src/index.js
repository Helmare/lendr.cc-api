const express = require('express');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Initialize server.
const app = express();
app.use(require('helmet')());
app.use(require('cors')());
app.use(express.json());

app.enable('trust proxy');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    'err': 'Too many requests.'
  }
});
app.use(limiter);

// TODO: Add API's
app.use('/dev', require('./apis/dev'));

// 404 Fallback.
app.use((req, res) => {
  res.status(404).send({ err: `Cannot ${req.method.toUpperCase()} ${req.url}` })
});


// Start app.
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Running api.happiiloans.com on port ${port}.`));