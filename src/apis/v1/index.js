const router = require('express').Router();
router.use('/member', require('./member'));
router.use('/loan', require('./loan'))

module.exports = router;