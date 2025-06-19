const jwt = require("jsonwebtoken");
const secret = process.env.JWT_SECRET;

const generateAccessToken = (user) => {
  return jwt.sign({ id: user.id, email: user.email }, secret);
};

module.exports = generateAccessToken;
