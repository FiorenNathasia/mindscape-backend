require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const verify = require("./middleware/verify");
const authRouter = require("./routes/auth");
const userRouter = require("./routes/user");
const entryRouter = require("./routes/entry");

app.use(express.json());
app.use(cors());

app.use("/api/auth", authRouter);

app.use(verify);

app.use("/api/user", userRouter);
app.use("/api/entry", entryRouter);

const port = process.env.PORT || 3030;

app.listen(port, () => {
  console.log(`server listening on ${port}`);
});
