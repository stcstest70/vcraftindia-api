// const mongoose = require('mongoose');
import mongoose from "mongoose"
const allProductSchema = new mongoose.Schema({
    name:{
        type: String,
        required:true
    },
    image:{
        type: String,
        required:true
    },
    type:{
        type: String,
        required:true
    },
    description:{
        type: String,
        required:true
    },
    originalPrice:{
        type: Number,
        required: true
    },
    sellingPrice:{
        type: Number,
        required: true
    },
    trendingProduct:{
        type: Boolean,
        required: true
    },
    reviews:[
        {
            reviewerId:{
                type: String,
            },
            reviewerName:{
                type: String,
            },
            rating:{
                type: String,
            },
            reviewtitle:{
                type: String,
            },
            reviewDescription:{
                type: String,
            }
        }
    ],
    weight:{
        type: String,
    },
    dimension:{
        type: String
    },
    deliveryCharge:{
        type:Number
    }
})

allProductSchema.methods.addReviewToDB = async function(reviewerId,reviewerName,rating,reviewtitle,reviewDescription){
    try {
        this.reviews = this.reviews.concat({reviewerId,reviewerName,rating,reviewtitle,reviewDescription});
        await this.save();
        return this.reviews;
    } catch (error) {
        console.log(error)
    }
}
const AllProductModel= mongoose.model('AllProduct', allProductSchema);
export default AllProductModel;
