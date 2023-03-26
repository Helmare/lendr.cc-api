const ACTIVITY_PER_PAGE = 7;

const router = require('express').Router();
const { isValidObjectId } = require('mongoose');
const { Member, Loan, Activity } = require('../../../models/all');
const { secure } = require('../../secure');

/**
 * Checks whether a member exists.
 * @param {string | import('mongoose').Types.ObjectId} memberId 
 * @returns {boolean}
 */
async function memberExists(memberId) {
  try {
    if (await Member.findById(memberId)) {
      return true;
    }
    else {
      return false;
    }
  }
  catch {
    return false;
  }
}
/**
 * Gets all the loans for a member.
 * @param {string | import('mongoose').Types.ObjectId} memberId 
 */
async function getMembersLoans(memberId) {
  let loans;
  if (memberId) {
    loans = await Loan.find({ borrowers: memberId, $or: [{archived: false}, {archived: { $exists: false }}] });
  }
  else {
    loans = await Loan.find({});
  }

  // Calculate total.
  let total = 0;
  let upcomingInterest = 0;
  await loans.forEach(async (loan) => {
    await loan.chargeInterest();
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
    { sort: { createdAt: -1 }, skip: p * ACTIVITY_PER_PAGE, limit: ACTIVITY_PER_PAGE }
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
    if (!isValidObjectId(req.params.id)) {
      res.status(400).send({ err: 'Invalid member id.' });
      return;
    }

    const m = await Member.findById(req.params.id, { username: 1, role: 1 });
    if (m) {
      res.send(m);
    }
    else {
      res.status(404).send({ err: "Member does not exist." });
    }
  }
});
// An endpoint for getting a member's loans.
router.get('/:id/loans', async(req, res) => {
  const member = await secure(req, res, {
    requireAdmin: true
  });
  if (member) {
    if (!isValidObjectId(req.params.id)) {
      res.status(400).send({ err: 'Invalid member id.' });
      return;
    }
    if (!memberExists(req.params.id)) {
      res.status(404).send({ err: "Member does not exist." });
      return;
    }

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
    if (!isValidObjectId(req.params.id)) {
      res.status(400).send({ err: 'Invalid member id.' });
      return;
    }
    if (!memberExists(req.params.id)) {
      res.status(404).send({ err: "Member does not exist." });
      return;
    }

    res.send({
      activity: await getMembersActivity(req.params.id)
    });
  }
});

// An endpoint for accepting member-wise payments.
router.post('/:id/payment', async (req, res) => {
  const member = await secure(req, res, {
    requireAdmin: true
  });

  // Validate
  if (!member) return;
  if (!isValidObjectId(req.params.id)) {
    res.status(400).send({ err: 'Invalid member id.' });
    return;
  }
  if (!memberExists(req.params.id)) {
    res.status(404).send({ err: "Member does not exist." });
    return;
  }
  if (!req.body.amount || req.body.amount >= 0) {
    res.status(401).send({ err: 'Amount value must be less than 0.' });
    return;
  }

  const loans = await Loan.find(
    { borrowers: req.params.id, $or: [{archived: false}, {archived: { $exists: false }}] },
    null,
    { sort: { interest: -1 } }
  );

  // Pay off loans.
  let amount = req.body.amount;
  let affectedLoans = [];
  await loans.forEach(async (loan) => {
    await loan.chargeInterest();
    if (amount == 0) return;

    if (loan.total == 0) {
      loan.archived = true;
    }
    else if (loan.total > -amount) {
      loan.records.push({
        type: 'payment',
        amount: amount
      });
      amount = 0;
    }
    else {
      amount += loan.total;
      loan.records.push({
        type: 'payment',
        amount: -loan.total
      });
      loan.archived = true;
    }

    affectedLoans.push(loan._id);
    await loan.save();
  });

  // Create activity.
  const activity = new Activity({
    members: [req.params.id],
    memo: "PAYMENT",
    type: "payment",
    amount: req.body.amount,
    affectedLoans: affectedLoans
  });
  await activity.save();

  // Send success
  res.send({ msg: "Successfully created payment.", amount: amount });
});

module.exports = router;