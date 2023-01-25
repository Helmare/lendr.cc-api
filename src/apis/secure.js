const Member = require('../models/member');
/**
 * Gets the login ID from the request.
 * @param {import('express').Request} req 
 * @return {string}
 */
function getLoginId(req) {
  // Setup auth header.
  const auth = req.header('Authorization');
  if (!auth) {
    return undefined;
  }
  const tokens = auth.split(' ');
  if (tokens[0] != 'Bearer') {
    return undefined;
  }

  return tokens[1];
}
async function getLoggedInMember(req) {
  // Get login id.
  const loginId = getLoginId(req);

  // Get member from login id.
  const member = await Member.findOne({ "logins._id": loginId })
  if (member == null) {
    return null;
  }

  // Get if login is expired.
  let expired = false;
  member.logins = member.logins.filter(login => {
    if (login._id == loginId && Date.now() > login.expires.getTime()) {
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
/**
 * Secures the request by returning the current logged in member
 * and sending a 401 error if not logged in.
 * 
 * @param {import('express').Request} req 
 * @param {import('express').Response} res
 * @param {object} opts
 * @param {boolean} opts.requireAdmin whether or not being an admin is required
 * @param {string[]} opts.requiredIds an array of ids which the logged in member must be any.
 */
async function secure(req, res, opts = {}) {
  opts = {
    requireAdmin: false,
    ...opts
  };

  const member = await getLoggedInMember(req);
  if (!member) {
    res.status(401).send({ err: 'Access denied, must be logged in.' });
    return null;
  }

  if (opts.requireAdmin && member.role != 'admin') {
    res.status(403).send({ err: 'Access denied, must be an admin.' });
    return null;
  }
  else {
    return member;
  }
}

module.exports = { getLoginId, getLoggedInMember, secure }