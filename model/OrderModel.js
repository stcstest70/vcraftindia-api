import mongoose from "mongoose"

const orderSchema = new mongoose.Schema({
    products: [
        {
          type:Array,
        },
      ],
      payment: {},
      buyer: {
        type: mongoose.ObjectId,
        ref: "USER",
      },
      status: {
        type: String,
        default: "Not Process",
        enum: ["Not Process", "Processing", "Shipped", "deliverd", "cancel"],
      },
    },
    { timestamps: true }
)

const OrderModel= mongoose.model('order', orderSchema)
export default OrderModel;