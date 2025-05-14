const db = require("../db/db");

const getUser = async (req, res) => {
  const userId = res.locals.userId;

  try {
    const userInfo = await db("users").where({ id: userId }).first();

    if (!userInfo) {
      return res.status(404).send({ message: "User not found" });
    }

    return res.status(200).send({
      data: {
        firstName: userInfo.first_name,
        lastName: userInfo.last_name,
        email: userInfo.email,
      },
    });
  } catch (error) {
    return res.status(500);
  }
};

module.exports = {
  getUser,
};
