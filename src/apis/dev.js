const router = require('express').Router();
const { User } = require('../models/all');

const DEV_IPS = ["::ffff:127.0.0.1", "::1"];
if (process.env.DEV_IPS) {
  process.env.DEV_IPS.split(';').forEach(ip => DEV_IPS.push(ip));
}

// Verify source of the request.
router.use((req, res, next) => {
  let isValid = false;
  DEV_IPS.forEach(ip => {
    isValid = isValid || req.ip == ip;
  });

  if (isValid) {
    next();
  }
  else {
    res.status(403).send({ 'err': 'Access denied' });
  }
});

// Creates a new user
router.post('/user/create', (req, res) => {
  // Verify body
  if (!req.body.username) {
    res.status(401).send({ 'err': 'Missing username' });
    return;
  }

  const result = {};
  const user = new User({ username: req.body.username });

  // Set role.
  if (req.body.role) {
    user.role = req.body.role;
  }

  // Set password.
  if (req.body.password) {
    user.setPassword(req.body.password);
    user.resetFlag = false;
  }
  else {
    result.tempPassword = user.resetPassword();
  }

  // Save.
  user.save().then(() => {
    result.user = user.toJSON();
    res.send(result);
  }).catch((err) => {
    res.status(501).send({ 'err': 'Could not create new user.' });
    console.log(err);
  });
});

// Gets a user by there id.
router.get('/user/:id', (req, res) => {
  User.findById(req.params.id).then(user => {
    if (user) {
      res.send(user.toJSON());
    }
    else {
      res.send({ 'err': 'Could not find user.' });
    }
  });
});
router.put('/user/:id/reset', (req, res) => {
  User.findById(req.params.id).then(user => {
    if (user) {
      const tempPassword = user.resetPassword();
      user.save().then(() => res.send({ tempPassword: tempPassword, user: user.toJSON() }));
    }
    else {
      res.send({ 'err': 'Could not find user.' });
    }
  });
});

// Export router
module.exports = router;