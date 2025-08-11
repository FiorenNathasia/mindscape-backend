const jwt = require("jsonwebtoken");
const secret = process.env.JWT_SECRET;

function verify(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(400).json({ message: "There is no token!" });
  }

  try {
    const token = authHeader.split(" ")[1];
    const userId = jwt.verify(token, secret).id;

    res.locals.userId = userId;
    next();
  } catch (error) {
    console.log(error);

    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ message: "Token expired, please login again!" });
    }

    return res.status(403).send({ message: "Token is invalid!" });
  }
}

module.exports = verify;
