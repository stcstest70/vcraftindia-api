import mongoose from "mongoose";



const connectDB = async () => {
    try {
        const DB = process.env.DATABASE;

        mongoose.connect(DB,{
            useNewUrlParser: true,
            useUnifiedTopology: true,
        }).then(()=>{
            console.log('Connection Successful');
        }).catch((err)=> console.log('Connection error'));
    } catch (error) {
      console.log(`Errro in Mongodb ${error}`.bgRed.white);
    }
  };
  
  export default connectDB;

