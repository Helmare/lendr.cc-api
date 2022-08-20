const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userScheme = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    default: 'borrower'
  },

  password: {
    type: String,
    required: true
  },
  resetFlag: {
    type: Boolean,
    default: true
  },

  logins: [{
    key: {
      type: String,
      required: true
    },
    expires: {
      type: Date,
      default: Date.now() + 7 * 24 * 60 * 60 * 1000 // One week from now.
    }
  }]
}, {
  methods: {
    /**
     * Sets the users password, does not save.
     * @param {string} password 
     */
    setPassword(password) {
      this.password = bcrypt.hashSync(password, bcrypt.genSaltSync());
    },
    /**
     * Verifies this password matches the user's.
     * @param {string} password 
     */
    verifyPassword(password) {
      return bcrypt.compareSync(password, this.password);
    }
  }
});

const User = mongoose.model('user', userScheme);
module.exports = User;