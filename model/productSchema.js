const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name:{
        type: String,
        required:true
    },
    image:{
        data: Buffer,
        contentType: String,
    },
    type:{
        type: String,
        required:true
    },
    descriptions:[
        {
            description:{
                type: String
            }
        }
    ],
    originalPrice:{
        type: Number,
        required: true
    },
    sellingPrice:{
        type: Number,
        required: true
    },
    reviews:[
        {
            reviewerName:{
                type: String,
            },
            reviewDescription:{
                type: String,
            },
            rating:{
                type: String,
            }
        }
    ],
    weight:{
        type: String,
    },
    dimension:{
        type: String
    }
})
module.exports = ProductModel = mongoose.model('Product', productSchema)

// const Product = mongoose.model('PRODUCT', productSchema);

// module.exports = Product;