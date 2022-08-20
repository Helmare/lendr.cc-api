const router = require('express').Router();
router.use('/dev', require('./dev'));

module.exports = router;