import mongoose from "mongoose"

const categorySchema = new mongoose.Schema({
    name:{
        type: String,
    },
    image:{
        type: String,
    }
})

const CategoryModel= mongoose.model('Category', categorySchema)
export default CategoryModel;
