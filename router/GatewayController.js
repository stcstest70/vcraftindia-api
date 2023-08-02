import braintree from "braintree";
import OrderModel from "../model/OrderModel.js";
import dotenv from "dotenv";

dotenv.config({ path: '../config.env' });

export const braintreeTokenController = async (req, res) => {
  try {
    const gateway = new braintree.BraintreeGateway({
      environment: braintree.Environment.Sandbox,
      merchantId: process.env.BRAINTREE_MERCHANT_ID,
      publicKey: process.env.BRAINTREE_PUBLIC_KEY,
      privateKey: process.env.BRAINTREE_PRIVATE_KEY,
    });
    gateway.clientToken.generate({}, function (err, response) {
      if (err) {
        res.status(500).send(err)
      } else {
        res.send(response);
      }
    })
  } catch (error) {
    console.log(error);
  }
};

export const braintreePaymentController = async (req, res) => {
  try {
    const gateway = new braintree.BraintreeGateway({
      environment: braintree.Environment.Sandbox,
      merchantId: process.env.BRAINTREE_MERCHANT_ID,
      publicKey: process.env.BRAINTREE_PUBLIC_KEY,
      privateKey: process.env.BRAINTREE_PRIVATE_KEY,
    });
    const { nonce, cart } = req.body;

    let total = 0;

    for (let i = 0; i < cart.length; i++) {
      const productPrice = cart[i].sellingPrice * cart[i].qty;
      const deliveryCharge = cart[i].deliveryCharge * cart[i].qty;
      total += productPrice + deliveryCharge;
    }
    // console.log(cart);
    const productQtyArray = [];
    cart.forEach((product) => {
      const { _id, qty, name, image, sellingPrice } = product;
      productQtyArray.push({ _id, qty, name, image, sellingPrice });
    });
    // console.log(productQtyArray);
    let newTransaction = gateway.transaction.sale(
      {
        amount: total + 60,
        paymentMethodNonce: nonce,
        options: {
          submitForSettlement: true,
        },
      },
      function (error, result) {
        if (result) {
          const order = new OrderModel({
            products: productQtyArray,
            payment: result,
            buyer: req.userID,
          }).save();
          return res.status(201).send('Payment Successful');
          // res.json({ ok: true });
        } else {
          return res.status(500).send('Payment failed!');
        }
      }
    );
  } catch (error) {
    console.log(error);
  }
};