const router = require('express').Router();
router.use('/dev', require('./dev'));
router.use('/v1', require('./v1'));

module.exports = router;