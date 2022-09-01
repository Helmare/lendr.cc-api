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
    default: Date.now()
  },

  interest: {
    type: Number,
    default: 0
  },
  lastCompounded: {
    type: Date,
    default: Date.now()
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
      default: Date.now()
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
  return total;
});

const Account = mongoose.model('loan', loanSchema);
module.exports = Account;