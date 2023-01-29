const router = require('express').Router();
const { Member } = require('../../../models/all');
const { secure } = require('../../secure');

// An endpoint for checking whether you are logged in, returns the member logged in.
router.get('/me', async (req, res) => {
  const member = await secure(req, res);
  if (member) {
    const obj = member.toObject();
    delete obj.resetFlag;
    delete obj.password;
    delete obj.logins;

    // TODO: Show loans and loan total.

    res.send(obj);
  }
});
// An endpoint for displaying basic information for all members (admin only).
router.get('/all', async (req, res) => {
  res.status(501).send({ err: "Not Implemented" });
});
// An endpoint for displaying a member's information (admin only).
router.get('/:id', async (req, res) => {
  const member = await secure(req, res, {
    requireAdmin: true
  });
  if (member) {
    const obj = (await Member.findById(req.params.id)).toObject();
    delete obj.resetFlag;
    delete obj.password;
    delete obj.logins;

    res.send(obj);
  }
});

module.exports = router;