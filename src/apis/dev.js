const router = require('express').Router();

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

// Export router
module.exports = router;