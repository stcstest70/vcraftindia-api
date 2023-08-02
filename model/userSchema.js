import mongoose from "mongoose"
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phone: {
        type: Number,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    pincode: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        default:Date.now
    },
    verified: {
        type: Boolean,
        default: false
    },
    messages:[
        {

            name: {
                type: String,
                required: true
            },
            email: {
                type: String,
                required: true
            },
            phone: {
                type: Number,
                required: true
            },
            message: {
                type: String,
                required: true
            }
        }
    ],
    tokens:[
        {
            token: {
                type: String,
                required:true
            },
            
        },{createdAt: { type: Date, default: Date.now, expires: 3600 },}
    ]
});

userSchema.pre('save', async function(next){
    if(this.isModified('password')){
        console.log('checking inside pre');
        this.password = await bcrypt.hash(this.password, 12);
    }
    next();
})

userSchema.methods.generateAuthToken = async function(){
    try{
        let token = jwt.sign({_id: this._id}, process.env.SECRET_KEY);
        this.tokens = this.tokens.concat({token: token});
        await this.save();
        return token;
    }catch(err){
        console.log(err);
    }
}

userSchema.methods.addMessageToDB = async function(name, email, phone, message){
    try {
        this.messages = this.messages.concat({name, email, phone, message});
        await this.save();
        return this.messages;
    } catch (error) {
        console.log(error)
    }
}

const UserModal = mongoose.model('USER', userSchema);

export default UserModal;