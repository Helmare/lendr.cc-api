const mongoose = require('mongoose');
const randstr = require('../randstr');

const loanSchema = new mongoose.Schema({
  _id: {
    type: String,
    default() {
      return randstr(6)
    }
  },

  title: {
    type: String,
    default: 'Personal Loan'
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
  gracePeriodEndDate: {
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
    memo: String,
    method: {
      type: String,
      enum: ['manual', 'auto', 'paypal'],
      default: 'manual'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
}, {
  toJSON: { virtuals: true }
});

// Add readonly 'total'.
loanSchema.virtual('total').get(function() {
  let total = 0;
  this.records.forEach(record => {
    total += record.amount;
  });
  return Math.round(total * 10000) / 10000;
});

const Account = mongoose.model('loan', loanSchema);
module.exports = Account;