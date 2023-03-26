const mongoose = require('mongoose');
const express = require('express');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Initialize server.
const app = express();
app.use(require('helmet')());
app.use(require('cors')());
app.use(require('cookie-parser')());
app.use(express.json());

app.enable('trust proxy');

const limit = process.env.REQUEST_LIMIT ? Number.parseInt(process.env.REQUEST_LIMIT) : 100;
if (limit > 0) {
  const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: limit,
    message: {
      'err': 'Too many requests.'
    }
  });
  app.use(limiter);
}

// TODO: Add API's
app.use(require('./apis'));

// 404 Fallback.
app.use((req, res) => {
  res.status(404).send({ err: `Cannot ${req.method.toUpperCase()} ${req.url}` });
});


// Connect to database.
mongoose.connect(process.env.DB_HOST, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  // Start app after connection.
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Running api.lendr.cc on port ${port}.`));
}).catch((err) => console.error(err));