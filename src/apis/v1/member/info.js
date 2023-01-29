const ACTIVITY_PER_PAGE = 7;

const router = require('express').Router();
const { Member, Loan, Activity } = require('../../../models/all');
const { secure } = require('../../secure');

/**
 * Gets all the loans for a member.
 * @param {string | import('mongoose').Types.ObjectId} memberId 
 */
async function getMembersLoans(memberId) {
  let loans;
  if (memberId) {
    loans = await Loan.find({ borrowers: memberId });
  }
  else {
    loans = await Loan.find({});
  }

  // Calculate total.
  let total = 0;
  let upcomingInterest = 0;
  loans.forEach(loan => {
    loan.chargeInterest();
    total += loan.total;
    upcomingInterest += loan.calcInterest();
  });

  return {
    total, upcomingInterest, loans
  };
}
/**
 * Gets all the activity for a member.
 * @param {string | import('mongoose').Types.ObjectId} memberId
 * @param {Number} page
 */
async function getMembersActivity(memberId, page) {
  const p = page || 0;
  const activity = await Activity.find(
    { $or: [{ members: memberId }, { broadcast: true }] }, 
    null, 
    { sort: { createdAt: -1 }, skip: page * ACTIVITY_PER_PAGE, limit: ACTIVITY_PER_PAGE }
  );

  return activity;
}

// An endpoint for displaying basic information for all members (admin only).
router.get('/all', async (req, res) => {
  if (await secure(req, res, { requireAdmin: true })) {
    res.send({
      members: await Member.find({}, { username: 1, role: 1 })
    });
  }
});

// An endpoint for checking whether you are logged in, returns the member logged in.
router.get('/me', async (req, res) => {
  const member = await secure(req, res);
  if (member) {
    const obj = member.toObject();
    delete obj.resetFlag;
    delete obj.password;
    delete obj.logins;
    delete obj.__v;

    res.send(obj);
  }
});
// An endpoint for getting the logged in member's loans.
router.get('/me/loans', async (req, res) => {
  const member = await secure(req, res);
  if (member) {
    res.send(await getMembersLoans(member.role == "admin" ? null : member._id));
  }
});
// An endpoint for getting the logged in member's activity.
router.get('/me/activity', async (req, res) => {
  const member = await secure(req, res);
  if (member) {
    res.send({
      activity: await getMembersActivity(member._id)
    });
  }
});

// An endpoint for displaying a member's information (admin only).
router.get('/:id', async (req, res) => {
  const member = await secure(req, res, {
    requireAdmin: true
  });
  if (member) {
    res.send(
      await Member.findById(req.params.id, { username: 1, role: 1 })
    );
  }
});
// An endpoint for getting a member's loans.
router.get('/:id/loans', async(req, res) => {
  const member = await secure(req, res, {
    requireAdmin: true
  });
  if (member) {
    res.send(
      await getMembersLoans(req.params.id)
    );
  }
});
// An endpoint for getting a member's activity.
router.get('/:id/activity', async(req, res) => {
  const member = await secure(req, res, {
    requireAdmin: true
  });
  if (member) {
    res.send({
      activity: await getMembersActivity(req.params.id)
    });
  }
});

module.exports = router;