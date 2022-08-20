/**
 * Creates a random string.
 * 
 * @param {number} length 
 * @param {string} charset 
 * @returns {string}
 */
module.exports = function(length, charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') {
  let str = '';
  for (let i = 0; i < length; i++) {
    str += charset.at(Math.round(Math.random() * (charset.length - 1)));
  }
  return str;
};