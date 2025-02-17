const jwt = require("jsonwebtoken");

function verify(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.send(400).send({ message: "There is no token!" });
  }

  try {
    const token = authHeader.split(" ")[1];
    const userId = jwt.verify(token, "mySecretKey").id;

    res.locals.userId = userId;
    next();
  } catch (error) {
    return res.status(403).send({ message: "Token is invalid!" });
  }
}

module.exports = verify;
