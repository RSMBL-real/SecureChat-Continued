const nacl = require('tweetnacl');
const naclUtil = require('tweetnacl-util');
const crypto = require('crypto');

function generateKeyPair(username, password) {
  const salt = username;
  const seed = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha512');
  const keyPair = nacl.sign.keyPair.fromSeed(seed);
  return {
    publicKey: naclUtil.encodeBase64(keyPair.publicKey),
    secretKey: naclUtil.encodeBase64(keyPair.secretKey)
  };
}

const keys = generateKeyPair('john', 'mypassword123');
console.log(keys);