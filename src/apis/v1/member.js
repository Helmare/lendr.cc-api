const router = require('express').Router();
const { Member } = require('../../models/all');
const getLoggedInMember = require('../secure');

// Creates a login instance for the member.
router.post('/login', async (req, res) => {
  if (!req.body.username) {
    res.status(400).send({ 'err': 'Missing username.' });
    return;
  }
  if (!req.body.password) {
    res.status(400).send({ 'err': 'Missing password' });
    return;
  }

  const member = await Member.findOne({ username: req.body.username });
  if (member && member.verifyPassword(req.body.password)) {
    if (member.resetFlag) {
      // Forces member to reset password.
      res.send({
        resetFlag: member.resetFlag
      });
    }
    else {
      // Logs in member.
      const login = member.login();
      await member.save();
      res.send(login);
    }
  } else {
    res.send({ 'err': 'Invalid username or password.' });
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

  const member = await Member.findOne({ resetFlag: req.body.resetFlag });
  if (member == null) {
    res.status(403).send({ err: 'Forbidden' })
  }
  else {
    member.setPassword(req.body.password);
    member.resetFlag = '';

    await member.save();
    res.send({ msg: 'Successfully changed password.' });
  }
});

// Logs out of the current member.
router.post('/logout', async (req, res) => {
  const member = await getLoggedInMember(req);
  if (!member) {
    res.status(401).send({ err: 'Access denied, must be logged in.' });
    return;
  }

  member.logins = member.logins.filter(l => l._id != loginId);
  await member.save();
  res.send({ msg: 'Successfully logged out.' });
});
// Clears all login instances of the current member.
router.post('/logout-all', async (req, res) => {
  const member = await getLoggedInMember(req);
  if (!member) {
    res.status(401).send({ err: 'Access denied, must be logged in.' });
    return;
  }

  member.logins = [];
  await member.save();
  res.send({ msg: 'Successfully logged out of everything.' });
});

// An endpoint for checking whether you are logged in, returns the member logged in.
router.get('/me', async (req, res) => {
  const member = await getLoggedInMember(req);
  if (!member) {
    res.status(401).send({ err: 'Access denied, must be logged in.' });
    return;
  }

  const obj = member.toObject();
  delete obj.resetFlag
  delete obj.password
  delete obj.logins;

  res.send(obj);
});

module.exports = router;