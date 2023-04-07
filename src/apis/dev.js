const router = require('express').Router();
const { Member } = require('../models/all');

const DEV_IPS = ["::ffff:127.0.0.1", "::1"];
if (process.env.DEV_IPS) {
  process.env.DEV_IPS.split(';').forEach(ip => DEV_IPS.push(ip));
}

// Verify source of the request.
router.use(async (req, res, next) => {
  let isValid = false;
  DEV_IPS.forEach(ip => {
    isValid = isValid || req.ip == ip;
  });

  if (isValid) {
    await next();
  }
  else {
    res.status(403).send({ 'err': 'Access denied' });
  }
});

// Creates a new member
router.post('/member/create', async (req, res) => {
  // Verify body
  if (!req.body.username) {
    res.status(400).send({ 'err': 'Missing username.' });
    return;
  }

  const result = {};
  const member = new Member({ username: req.body.username });

  // Set role.
  if (req.body.role) {
    member.role = req.body.role;
  }

  // Set password.
  if (req.body.password) {
    member.setPassword(req.body.password);
    member.resetFlag = false;
  }
  else {
    result.tempPassword = member.resetPassword();
  }

  // Save.
  try {
    await member.save();
    result.member = member.toJSON();
    res.send(result);
  }
  catch (err) {
    res.status(500).send({ 'err': err.message });
  }
});

// Export router
module.exports = router;