const router = require('express').Router();
const { User } = require('../../models/all');
const getLoggedInUser = require('../secure');

// Creates a login instance for the user.
router.post('/login', async (req, res) => {
  if (!req.body.username) {
    res.status(400).send({ 'err': 'Missing username.' });
    return;
  }
  if (!req.body.password) {
    res.status(400).send({ 'err': 'Missing password' });
    return;
  }

  const user = await User.findOne({ username: req.body.username });
  if (user && user.verifyPassword(req.body.password)) {
    if (user.resetFlag) {
      // Forces user to reset password.
      res.send({
        resetFlag: user.resetFlag
      });
    }
    else {
      // Logs in user.
      const login = user.login();
      await user.save();
      res.send(login);
    }
  } else {
    res.send({ 'err': 'Invalid username or password.' })
  }
});

// Resets the password of someone who needs it reset.
router.put('/reset-password', async (req, res) => {
  if (!req.body.resetFlag) {
    res.status(400).send({ err: 'Missing resetFlag.' });
    return;
  }
  if (!req.body.password) {
    res.status(400).send({ err: 'Missing password.' });
    return;
  }

  const user = await User.findOne({ resetFlag: req.body.resetFlag });
  if (user == null) {
    res.status(403).send({ err: 'Forbidden' })
  }
  else {
    user.setPassword(req.body.password);
    user.resetFlag = '';

    await user.save();
    res.send({ msg: 'Successfully changed password.' });
  }
});

// Logs out of the current user.
router.post('/logout', async (req, res) => {
  const user = await getLoggedInUser(req);
  if (!user) {
    res.status(401).send({ err: 'Access denied, must be logged in.' });
    return;
  }

  user.logins = user.logins.filter(l => l._id != loginId);
  await user.save();
  res.send({ msg: 'Successfully logged out.' });
});
// Clears all login instances of the current user.
router.post('/logout-all', async (req, res) => {
  const user = await getLoggedInUser(req);
  if (!user) {
    res.status(401).send({ err: 'Access denied, must be logged in.' });
    return;
  }

  user.logins = [];
  await user.save();
  res.send({ msg: 'Successfully logged out of everything.' });
});

// An endpoint for checking whether you are logged in, returns the user logged in.
router.get('/me', async (req, res) => {
  const user = await getLoggedInUser(req);
  if (!user) {
    res.status(401).send({ err: 'Access denied, must be logged in.' });
    return;
  }

  const obj = user.toObject();
  delete obj.resetFlag
  delete obj.password
  delete obj.logins;

  res.send(obj);
});

module.exports = router;