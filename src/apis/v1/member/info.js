const ACTIVITY_PER_PAGE = 7;

const router = require('express').Router();
const { isValidObjectId } = require('mongoose');
const { Member, Loan, Activity, getMembersLoans, getMembersActivity } = require('../../../models/all');
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

// An endpoint for displaying basic information for all members (admin only).
router.get('/all', async (req, res) => {
  if (await secure(req, res, { requireAdmin: true })) {
    res.send({
      members: await Member.find({}, { username: 1, role: 1, email: 1 })
    });
  }
});
router.get('/all/loans', async (req, res) => {
  if (await secure(req, res, { requireAdmin: true })) {
    res.send(await getMembersLoans());
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
    res.send(await getMembersLoans(member._id));
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

// A temporary endpoint for testing emails.
router.post('/me/test-email', async (req, res) => {
  const member = await secure(req, res);
  if (member) {
    try {
      const info = await member.sendMail({
        subject: 'Password Reset',
        content: {
          header: [
            'You\'re receiving this email because your <span style="color: #9029f4">lendr.cc</span> password was reset.',
            'To login, goto <a href="https://www.lendr.cc/login">https://www.lendr.cc/login</a> and use the following to login:'
          ],
          info: [
            'Username: <strong>chris</strong>',
            'Password: <strong>SEjao2039Askjcu</strong>'
          ],
          footer: [
            'You\'ll be prompted to create a new password afterwords.'
          ],
        }
      });

      if (info) {
        res.send(info);
      }
      else {
        res.send({ msg: 'Member does not have an email address.' });
      }
    }
    catch (err) {
      res.status(500).send(err);
    }
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

  const memberLoans = await getMembersLoans(req.params.id, {
    sort: { interest: -1 }
  });

  // Pay off loans.
  /** @type {number} */
  let amount = req.body.amount;
  let affectedLoans = [];
  await memberLoans.loans.forEach(async (loan) => {
    if (amount == 0) return;

    if (loan.total == 0) {
      loan.archived = true;
    }
    else if (loan.total > -amount) {
      loan.records.push({
        type: 'payment',
        amount: amount
      });
      memberLoans.total += amount;
      amount = 0;
    }
    else {
      memberLoans.total -= loan.total;
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

  try {
    const borrower = await Member.findById(req.params.id);
    const emAmount = (-req.body.amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    const emAccountTotal = memberLoans.total.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    // Send email
    borrower.sendMail({
      subject: 'Payment Confirmation',
      content: {
        header: [
          `Your payment for <span style="color: #9029f4; font-weight: bold">\$${emAmount}</span> was received!`,
          'Information regarding your payment can be found below or on <a href="https://www.lendr.cc">https://www.lendr.cc</a>.'
        ],
        info: [
          `Amount: <strong>\$${emAmount}</strong>`,
          `Account Total: <strong>\$${emAccountTotal}</strong>`
        ]
      }
    });

    // Send success
    res.send({ msg: "Successfully created payment.", amount: amount });
  }
  catch (err) {
    res.status(500).send({ err: err.message })
  }
});

module.exports = router;