const router = require('express').Router();
router.use('/member', require('./member'));

module.exports = router;