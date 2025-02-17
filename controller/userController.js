const db = require("../db/db");

const getUser = async (req, res) => {
  const userId = res.locals.userId;

  try {
    const userInfo = await db("users").where({ id: userId }).first();
    res.status(200).send({
      data: {
        firstName: userInfo.first_name,
        lastName: userInfo.last_name,
        email: userInfo.email,
      },
    });
  } catch (error) {
    res.status(404).send({ message: "Error retrieving user information" });
  }
};

module.exports = {
  getUser,
};
