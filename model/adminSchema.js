import mongoose from "mongoose"
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const adminSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    tokens:[
        {
            token: {
                type: String,
                required:true
            }
        }
    ]
});

adminSchema.pre('save', async function(next){
    if(this.isModified('password')){
        this.password = await bcrypt.hash(this.password, 12);
    }
    next();
})

adminSchema.methods.generateAuthToken1 = async function(){
    try{
        let token = jwt.sign({_id: this._id}, process.env.SECRET_KEY);
        this.tokens = this.tokens.concat({token: token});
        await this.save();
        return token;
    }catch(err){
        console.log(err);
    }
}

const AdminModal = mongoose.model('Admin', adminSchema);

export default AdminModal;