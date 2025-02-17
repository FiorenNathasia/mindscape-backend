const express = require("express");
const cors = require("cors");
const app = express();
const verify = require("./middleware/verify");
const authRouter = require("./routes/auth");

app.use(express.json());
app.use(cors());

app.use("/api/auth", authRouter);
app.use(verify);

app.listen(3030, () => {
  console.log("server listening on 3030");
});
