const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const randstr = require('../randstr');
const transporter = require('nodemailer').createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  },
  tls: { rejectUnauthorized: false }
});

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
  email: {
    type: String,
    default: ''
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
      this.resetFlag = randstr(64);
      this.logins = [];
      
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
    },

    /**
     * Email this user if they have an email.
     * @param {import('nodemailer').SendMailOptions} mailOptions 
     */
    async sendMail(mailOptions) {
      return new Promise((resolve, reject) => {
        if (this.email) {
          // Compile HTML
          if (mailOptions.content && !mailOptions.html) {
            const content = mailOptions.content;
            let html = `<h2>${mailOptions.subject}</h2>`;

            // Add header
            if (content.header) {
              content.header.forEach(str => {
                html += `\n<p>${str}</p>`
              });
            }

            // Add info
            if (content.info) {
              html += '\n<div style="font-family: monospace; margin-top: 2em; margin-bottom: 2em">';
              content.info.forEach(str => {
                html += str ? `\n\t<p>${str}</p>` : '<br>'
              });
              html += '\n</div>';
            }

            // Add footer
            if (content.footer) {
              content.footer.forEach(str => {
                html += `\n<p>${str}</p>`
              });
            }

            mailOptions.html = html;
          }

          // Change 'to' to the member email.
          mailOptions = {
            from: 'Lendr <noreply@lendr.cc>',
            to: this.email,
            ...mailOptions
          };

          // Send mail.
          transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
              reject(err);
            }
            else {
              resolve(info);
            }
          });
        }
        else {
          resolve(undefined);
        }
      });
    }
  }
});

const Member = mongoose.model('member', memberSchema);
module.exports = Member;