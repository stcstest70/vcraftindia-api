import bodyParser from "body-parser";
dotenv.config({path:'./config.env'});
const PORT = process.env.PORT || 5000;
import connectDB from './conn.js'
import cors from 'cors'
import auth from './router/auth.js'
import dotenv from "dotenv";
import express from "express";

const app = express();

app.set('trust proxy', 1);

connectDB();
const allowedOrigins = [
  "https://vci-vcraftindia.vercel.app",
  "https://vci-vcraftindia-git-main-stcstest70-gmailcom.vercel.app",
  "https://vci-vcraftindia-1ml76f9fg-stcstest70-gmailcom.vercel.app"
];

// Allow requests from the specified origins and enable credentials
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
import coolieParser from 'cookie-parser'

app.use(coolieParser());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.json());
app.use(auth);



if(process.env.NODE_ENV === "production"){
  app.use(express.static("printerx/build"));
}

app.listen(PORT, ()=>{
    console.log('server is running at port '+ PORT);
})