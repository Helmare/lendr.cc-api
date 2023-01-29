const mongoose = require('mongoose');
const randstr = require('../randstr');

const loanSchema = new mongoose.Schema({
  _id: {
    type: String,
    default() {
      return randstr(8)
    }
  },

  memo: {
    type: String,
    required: true
  },
  borrowers: [mongoose.Types.ObjectId],
  createdAt: {
    type: Date,
    default: Date.now
  },

  interest: {
    type: Number,
    default: 0
  },
  gracePeriodEnd: {
    type: Date,
    default() {
      const now = new Date();
      now.setUTCDate(now.getUTCDate() + 60);
      return now;
    }
  },
  lastCompounded: {
    type: Date,
    default: Date.now
  },

  records: [{
    amount: {
      type: Number,
      required: true
    },
    type: {
      type: String,
      enum: ['principal', 'interest', 'payment', 'adjustment'],
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
}, {
  toJSON: { virtuals: true },
  methods: {
    /**
     * Calculates interest that will be charged the next month.
     */
    calcInterest() {
      if (this.interest < 0) return 0;

      const nextMonth = new Date();
      nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
      nextMonth.setUTCDate(1);
      nextMonth.setUTCHours(0);
      nextMonth.setUTCMinutes(0);
      nextMonth.setUTCSeconds(0);
      nextMonth.setUTCMilliseconds(0);

      if (this.gracePeriodEnd.getTime() <= nextMonth) {
        return Math.round((this.total * this.interest / 12) * 10000) / 10000;
      }
      else {
        return 0;
      }
    },
    /**
     * Charges all back interest to the loan.
     */
    async chargeInterest() {
      if (this.interest <= 0) return;
      const now = new Date();
      const lc = this.lastCompounded;
      const gpe = this.gracePeriodEnd;
      
      if (now.getTime() >= gpe.getTime()) {
        if (lc.getTime() < gpe.getTime()) {
          lc.setTime(gpe.getTime());
        }

        const months = Math.max(0, (now.getUTCMonth() + now.getUTCFullYear() * 12) - (lc.getUTCMonth() + lc.getUTCFullYear() * 12));
        for (let i = 0; i < months; i++) {
          const createdAt = new Date(lc.getTime());
          createdAt.setUTCMonth(lc.getUTCMonth() + i + 1);
          createdAt.setUTCDate(1);
          createdAt.setUTCHours(0);
          createdAt.setUTCMinutes(0);
          createdAt.setUTCSeconds(0);
          createdAt.setUTCMilliseconds(0);

          this.records.push({
            amount: Math.round((this.total * this.interest / 12) * 10000) / 10000,
            memo: 'INTEREST',
            type: 'interest',
            createdAt: createdAt
          });
        }

        if (months > 0) {
          this.lastCompounded = now;
          await this.save();
        }
      }
    },
  }
});

// Add readonly 'total'.
loanSchema.virtual('total').get(function() {
  let total = 0;
  this.records.forEach(record => {
    total += record.amount;
  });
  return Math.round(total * 10000) / 10000;
});

const Loan = mongoose.model('loan', loanSchema);
module.exports = Loan;