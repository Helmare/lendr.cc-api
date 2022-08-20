const Member = require('../models/member');

async function getLoggedInMember(req) {
  // Setup auth header.
  const auth = req.header('Authorization');
  if (!auth) {
    return null;
  }
  const tokens = auth.split(' ');
  if (tokens[0] != 'Bearer') {
    return null;
  }

  // Get member from login id.
  const member = await Member.findOne({ "logins._id": tokens[1] })
  if (member == null) {
    return null;
  }

  // Get if login is expired.
  let expired = false;
  member.logins = member.logins.filter(login => {
    if (login._id == tokens[1] && Date.now() <= login.expires.getDate()) {
      expired = true;
      return false;
    }
    return true;
  });

  // Return whether the login is valid.
  if (expired) {
    await member.save();
    return null;
  }
  else{
    return member;
  }
}

module.exports = getLoggedInMember;