import bodyParser from "body-parser";
dotenv.config({path:'./config.env'});
const PORT = process.env.PORT || 5000;
import connectDB from './conn.js'
import cors from 'cors'
import auth from './router/auth.js'
import dotenv from "dotenv";
import express from "express";

const app = express();

connectDB();
// const corsOptions = {
//     origin: true,
//     credentials: true,
//   };
  // app.use(cors(corsOptions));
  app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });
app.use(cors());
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