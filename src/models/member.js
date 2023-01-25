const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const randstr = require('../randstr');

const memberSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  role: {
    type: String,
    enum: ['admin', 'borrower'],
    default: 'borrower'
  },

  password: {
    type: String,
    required: true
  },
  resetFlag: {
    type: String,
    default: ''
  },

  logins: [{
    _id: String,
    expires: {
      type: Date,
      default() {
        return Date.now() + 7 * 24 * 60 * 60 * 1000; // One week from now.
      }
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
     * Resets the password and returns a temporary password.
     * @return {string} temporary password.
     */
    resetPassword() {
      let tempPassword = randstr(16);
      this.setPassword(tempPassword);
      this.resetFlag = randstr(16);

      return tempPassword;
    },
    /**
     * Verifies this password matches the user's.
     * @param {string} password 
     */
    verifyPassword(password) {
      return bcrypt.compareSync(password, this.password);
    },

    /**
     * Creates and adds a login token to the array.
     * @return {object}
     */
    login() {
      this.logins.push({
        _id: randstr(64)
      });
      return this.logins[this.logins.length - 1];
    }
  }
});

const Member = mongoose.model('member', memberSchema);
module.exports = Member;