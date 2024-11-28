import express from "express"
import cookieParser from "cookie-parser";
import { connectDB } from "./config/database.js";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.routes.js";
dotenv.config();
const app = express();
const PORT= process.env.PORT|| 5000;

app.use(express.json());//Parse incoming requests with json payload
app.use(cookieParser());//allows us to parse cookies in the request

app.use("/api/auth", authRoutes);

app.listen(PORT, ()=>{
    connectDB();
    console.log("Server is running on port:",PORT);
})

//n5vd6k9Ycw3FDZxm