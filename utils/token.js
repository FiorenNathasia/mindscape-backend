const jwt = require("jsonwebtoken");

const generateAccessToken = (user) => {
  return jwt.sign({ id: user.id, email: user.email }, "mySecretKey", {
    expiresIn: "24h",
  });
};

module.exports = generateAccessToken;
