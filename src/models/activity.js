const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  members: [mongoose.Types.ObjectId],
  broadcast: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    enum: ["loan", "interest", "payment", "other"],
    required: true
  },
  memo: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    default: 0
  },
  affectedLoans: [String],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Activity = mongoose.model('activity', activitySchema);
module.exports = Activity;