const Member = require('./member');
const Loan = require('./loan');
const Activity = require('./activity');

// Exports all models.
module.exports = {
  Member, Loan, Activity,

  /**
   * Gets all the loans for a member.
   * @param {string | import('mongoose').Types.ObjectId} memberId 
   */
  async getMembersLoans(memberId) {
    let loans;
    if (memberId) {
      loans = await Loan.find({ borrowers: memberId, $or: [{archived: false}, {archived: { $exists: false }}] });
    }
    else {
      loans = await Loan.find({ $or: [{archived: false}, {archived: { $exists: false }}] });
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
  },

  /**
   * Gets all the activity for a member.
   * @param {string | import('mongoose').Types.ObjectId} memberId
   * @param {Number} page
   */
  async getMembersActivity(memberId, page) {
    const p = page || 0;
    const activity = await Activity.find(
      { $or: [{ members: memberId }, { broadcast: true }] }, 
      null, 
      { sort: { createdAt: -1 }, skip: p * ACTIVITY_PER_PAGE, limit: ACTIVITY_PER_PAGE }
    );

    return activity;
  }
}