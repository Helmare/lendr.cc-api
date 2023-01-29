const router = require('express').Router();
const loginRouter = require('./login');
const infoRouter = require('./info');

router.use(loginRouter);
router.use(infoRouter);

module.exports = router;