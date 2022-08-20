const User = require('../models/user');

async function getLoggedInUser(req) {
  // Setup auth header.
  const auth = req.header('Authorization');
  if (!auth) {
    return null;
  }
  const tokens = auth.split(' ');
  if (tokens[0] != 'Bearer') {
    return null;
  }

  // Get user from login id.
  const user = await User.findOne({ "logins._id": tokens[1] })
  if (user == null) {
    return null;
  }

  // Get if login is expired.
  let expired = false;
  user.logins = user.logins.filter(login => {
    if (login._id == tokens[1] && Date.now() <= login.expires.getDate()) {
      expired = true;
      return false;
    }
    return true;
  });

  // Return whether the login is valid.
  if (expired) {
    await user.save();
    return null;
  }
  else{
    return user;
  }
}

module.exports = getLoggedInUser;