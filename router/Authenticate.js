// const jwt = require("jsonwebtoken");
import jwt from 'jsonwebtoken'
import User from '../model/userSchema.js'
// const User = require('../model/userSchema')


const Authenticate = async (req, res, next)=>{
    try{
        const token = req.cookies.UserToken;
        const verifyToken = jwt.verify(token, process.env.SECRET_KEY);

        const rootUser = await User.findOne({_id:verifyToken._id, "tokens.token":token });

         if(!rootUser){ throw new Error('User not Found')}

        req.token = token;
        req.rootUser = rootUser;
        req.userID = rootUser._id;
        next();
    }
    catch(err){
        res.status(401).send('Unauthorised: No token Provided');
        // console.log(err);
    }
}

export default Authenticate;
