const crypto = require('crypto');

/**
 * Return a salted and hashed password entry from a clear text password.
 * @param {string} clearTextPassword
 * @return {object} { salt: string, hash: string }
 */
function makePasswordEntry(clearTextPassword) {
  if (typeof clearTextPassword !== 'string') {
    throw new Error('Password must be a string');
  }
  // Generate 8 random bytes and represent them as hex string
  const salt = crypto.randomBytes(8).toString('hex');
  const hash = crypto.createHash('sha1').update(salt + clearTextPassword).digest('hex');
  return { salt: salt, hash: hash };
}

/**
 * Return true if the specified clear text password and salt generates the
 * specified hash.
 * @param {string} hash
 * @param {string} salt
 * @param {string} clearTextPassword
 * @return {boolean}
 */
function doesPasswordMatch(hash, salt, clearTextPassword) {
  if (typeof clearTextPassword !== 'string') return false;
  if (!salt || !hash) return false;
  const computed = crypto.createHash('sha1').update(salt + clearTextPassword).digest('hex');
  return computed === hash;
}

module.exports = {
  makePasswordEntry,
  doesPasswordMatch
};
