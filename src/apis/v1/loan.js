const router = require('express').Router();
const { Member, Loan, Activity, getMembersLoans } = require('../../models/all');
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

      // Send emails
      for (let i = 0; i < req.body.borrowers.length; i++) {
        const borrower = await Member.findById(req.body.borrowers[i]);

        const emPrincipal = loan.records[0].amount.toLocaleString('en-US', { 
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
        const emInterest = (loan.interest * 100).toFixed(3);
        const emGpe = loan.gracePeriodEnd.toLocaleDateString('en-US', {
          month: 'short',
          day: '2-digit',
          year: 'numeric'
        });
        const emAccountTotal = (await getMembersLoans(borrower._id)).total.toLocaleString('en-US', { 
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });

        await borrower.sendMail({
          subject: 'New Loan Created!',
          html: `
          <h2>New Loan Created!</h2>
          <p>A new loan was created on your lendr.cc account for <span style="color: #9029f4; font-weight: bold">\$${emPrincipal}</span></p>
          <p>Information about your loan can be found below or at <a href="https://www.lendr.cc/loan/${loan._id}">https://www.lendr.cc/loan/${loan._id}</a></p>
          <div style="font-family: monospace; margin-top: 2em;">
            <p>ID: <strong>${loan._id}</strong></p>
            <p>Memo: <strong>${loan.memo}</strong></p>
            <p>Principal: <strong>\$${emPrincipal}</strong></p>
            <p>Interest: <strong>${emInterest}% APR</strong></p>
            <p>Grace Period End: <strong>${emGpe}</strong></p>
            <br>
            <p>Account Total: <strong>\$${emAccountTotal}</strong></p>
          </div>
          `
        });
      }

      res.send(loan);
    }
    catch (err) {
      res.status(500).send({ err: err.message });
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