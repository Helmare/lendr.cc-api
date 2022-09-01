const router = require('express').Router();
const { Member, Loan } = require('../../models/all');
const { listeners } = require('../../models/member');
const { secure } = require('../secure');

/**
 * 
 * @param {string[]} names
 * @returns {string[]|false}
 */
async function getIdsFromNames(names) {
  if (names instanceof Array && names.length > 0) {
    let ids = [];
    for (let i = 0; i < names.length; i++) {
      const member = await Member.findOne({ username: names[i] });
      if (member == null) {
        return false;
      }
      else {
        ids.push(member.id);
      }
    }
    return ids;
  }
  else {
    return false;
  }
}
router.get('/create', async (req, res) => {
  const member = secure(req, res, {
    requireAdmin: true
  });
  if (member) {
    // Convert borrower usernames to ids.
    const borrowers = await getIdsFromNames(req.body.borrowers);
    if (!borrowers) {
      res.status(400).send({ err: 'Invalid borrowers' });
      return;
    }
    else {
      req.body.borrowers = borrowers;
    }

    const loan = new Loan(req.body);
    try {
      await loan.save();
      res.send(loan);
    }
    catch (err) {
      res.status(501).send({ err: err });
    }
  }
});

module.exports = router;