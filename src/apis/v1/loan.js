const router = require('express').Router();
const { Member, Loan, Activity } = require('../../models/all');
const { secure } = require('../secure');

router.post('/create', async (req, res) => {
  const member = await secure(req, res, {
    requireAdmin: true
  });
  if (member) {
    // Check for required data
    if (!req.body.memo) {
      res.status(400).send({ err: "Invalid memo." });
      return;
    }
    if (!req.body.principal) {
      res.status(400).send({ err: "Invalid principal." });
      return;
    }
    if (!req.body.borrowers) {
      res.status(400).send({ err: "Invalid borrowers." });
      return;
    }

    // Prepare body.
    const principal = req.body.principal;
    delete req.body.principal;

    // Create loan.
    const loan = new Loan(req.body);
    loan.records.push({
      amount: principal,
      type: 'principal'
    });

    try {
      await loan.save();

      // Create activity
      const activity = new Activity({
        members: req.body.borrowers,
        type: 'loan',
        memo: req.body.memo,
        amount: principal,
        affectedLoans: [loan._id]
      });
      await activity.save();

      res.send(loan);
    }
    catch (err) {
      res.status(501).send({ err: err.message });
    }
  }
});
/**
 * Gets and updates a loan.
 * @param {string} id 
 */
async function getAndUpdateLoan(id) {
  const loan = await Loan.findById(id);
  if (loan == null || !loan.archived) {
    return null;
  }
  
  await loan.chargeInterest();
  return loan;
}

router.get('/:id', async (req, res) => {
  const member = await secure(req, res);
  if (member) {
    // Get loan.
    const loan = await getAndUpdateLoan(req.params.id);
    if (loan == null) {
      res.status(404).send({ err: 'Loan does not exist.' });
      return;
    }

    // Make sure logged in member has access.
    if (member.role != "admin") {
      let valid = false;
      loan.borrowers.forEach(id => {
        if (valid || id == member.id) {
          valid = true;
        }
      });
      if (!valid) {
        res.status(403).send({ err: 'Access denied.' });
        return;
      }
    }

    // Send loan.
    res.send(loan);
  }
});
router.post('/:id/post', async (req, res) => {
  const member = await secure(req, res, {
    requireAdmin: true
  });
  if (member) {
    // Get loan.
    const loan = await getAndUpdateLoan(req.params.id);
    if (loan == null) {
      res.status(404).send({ err: 'Loan does not exist.' });
      return;
    }

    loan.records.push(req.body);
    try {
      await loan.save();
      res.send(loan.records[loan.records.length - 1]);
    }
    catch (err) {
      res.status(501).send({ err: err });
    }
  }
});

module.exports = router;