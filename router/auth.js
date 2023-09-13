import express from "express";
const router = express.Router();
import bodyParser from "body-parser";
import fs from 'fs';
import AllProductModel from '../model/AllProducts.js'
import CategoryModel from '../model/categorySchema.js'
import UserModal from "../model/userSchema.js";
import authenticate from './Authenticate.js'
import Token from '../model/token.js'
import sendEmail from '../utils/sendEmail.js'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import AdminModal from "../model/adminSchema.js";
import { loadavg } from "os";
import braintree from 'braintree';
import dotenv from "dotenv";
import { braintreeTokenController, braintreePaymentController } from "./GatewayController.js";
import OrderModel from "../model/OrderModel.js";
import { log } from "console";
import jwt from 'jsonwebtoken'

dotenv.config();



// AllProductModel.updateMany(
//     { deliveryCharge: { $exists: false } },
//     { $set: { deliveryCharge: 0 } },
//     { multi: true }
//   )
//     .then((result) => {
//       console.log(`${result.nModified} documents updated successfully.`);
//     })
//     .catch((error) => {
//       console.error('Error updating documents:', error);
//     });

//Adding admin
// const newUser = new AdminModal({
//     username: 'admin',
//     password: '$2a$12$LU8kGWZXTQG7aqARznOUMOM42O5pup64C.hlusZyEksmpQqOQr08q',
//   });
//   newUser.save((err, savedUser) => {
//     if (err) {
//       console.error('Error saving user:', err);
//     } else {
//       console.log('User saved successfully:', savedUser);
//     }
// })
//FOR payment PX website
router.get("/braintree/token", braintreeTokenController);

router.post("/braintree/payment", braintreePaymentController);

//for px website
router.post('/checkCookiePresent', async function (req, res) {
    try {
        const userToken = req.body.userToken;
        // console.log(userToken);
        if (!userToken || userToken.trim() === '') {
            return res.status(400).json({ error: 'UserToken is empty or missing' });
          }
        const verifyToken = jwt.verify(userToken, process.env.SECRET_KEY);
        const rootUser = await UserModal.findOne({_id:verifyToken._id, "tokens.token":userToken });
        if(!rootUser){
            return res.status(406).message('User Not logged in');
        }else{
            return res.status(206).json({ user: rootUser });
        }
      } catch (error) {
        console.log("Error occurred while processing the request:", error);
         return res.status(500).json({ error: "Internal server error" });
      }
})

router.get('/getCategoryPX', async function (req, res) {
    const data = await CategoryModel.find();
    res.send(data);
})

router.get('/reviews/average-score/:id', async function (req, res) {
    const data = await AllProductModel.find({ _id: req.params.id });
    // console.log(data);
    let totalRating = 0;
    let totalReviews = 0;

    data.forEach((product) => {
        product.reviews.forEach((review) => {
            totalRating += parseInt(review.rating);
            totalReviews++;
        });
    });

    const averageRating = totalRating / totalReviews;

    // console.log(averageRating);
    res.send({ averageRating });

})
router.get('/getTrendingProductPX', async function (req, res) {
    const data = await AllProductModel.find({ trendingProduct: true }).collation({ locale: 'en', strength: 2 }).sort({ name: 1 });
    res.send(data);
})

router.post('/register', async function (req, res) {
    const { name, email, phone, address,city, pincode, password, currentPageURL } = req.body;

    if (!name || !email || !phone || !address || !city || !pincode || !password) {
        return res.status(422).json({ error: "There is an error" });
    }
    try {
        let userExist = await UserModal.findOne({ email: email });

        if (userExist) {
            return res.status(422).json({ error: "Email already exist" });
        }
        else {
            const user = new UserModal({ name, email, phone, address, city, pincode, password });

            await user.save();

            const token = await new Token({
                userId: user._id,
                token: crypto.randomBytes(32).toString("hex"),
            }).save();
            const url = `${currentPageURL}/users/${user.id}/verify/${token.token}`;
            await sendEmail(user.email, "Verify Email", url);


            res.status(201).json({ message: "An email sent to your account, please verify!" });
        }
    } catch (error) {
        console.log(error);
    }
});

router.get("/user/:id/verify/:token/", async (req, res) => {
    const theUser = await UserModal.findOne({ _id: req.params.id });
    const token = await Token.findOne({ userId: req.params.id, token: req.params.token, })
    if (!theUser || !token) {
        return res.status(400).send({ message: "Invalid link" });
    }
    else {
        await UserModal.updateOne({ _id: theUser._id }, { $set: { verified: true } });
        res.status(200).send({ message: "Email verified successfully" });
    }
});

router.get("/user/:id/resetPassword/:token/", async (req, res) => {
    const theUser = await UserModal.findOne({ _id: req.params.id });
    const token = await Token.findOne({ userId: req.params.id, token: req.params.token, })
    if (!theUser || !token) {
        return res.status(400).send({ message: "Invalid link" });
    }
    else {
        return res.status(200).send({ message: "Valid link" });
    }
});

router.post('/login', async function (req, res) {
    try {
        let token;
        const { email, password,currentPageURL } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "pls fill the data" });
        }
        const user = await UserModal.findOne({ email: email });
        if (user) {
            const isMatch = await bcrypt.compare(password, user.password);
            if (isMatch) {
                if (user.verified === false) {
                    let token = await Token.findOne({ userId: user._id });
                    if (!token) {
                        token = await new Token({
                            userId: user._id,
                            token: crypto.randomBytes(32).toString("hex"),
                        }).save();
                        const url = `${currentPageURL}/users/${user.id}/verify/${token.token}`;
                        await sendEmail(user.email, "Verify Email", url);
                    }
                    return res.status(400).send({ message: "An Email sent to your account please verify" });
                }
                else {
                    token = await user.generateAuthToken();

                    // res.cookie("UserToken", token, {
                    //     expires: new Date(Date.now() + 18000000),
                    //     httpOnly: true
                    // });
                    return res.status(201).json({ token: token });
                }
            }
            else {
                res.status(402).json({ message: "invalid credentials" });
            }
        }
        else {
            res.status(401).json({ message: "invalid credentials" });
        }
    }
    catch (error) {
        console.log(error);
    }

});

router.post('/forgotPassword', async function (req, res) {
    try {
        let token;
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: "pls fill the data" });
        }
        const user = await UserModal.findOne({ email: email });
        if (user) {
            let token = await Token.findOne({ userId: user._id });
            if (!token) {
                token = await new Token({
                    userId: user._id,
                    token: crypto.randomBytes(32).toString("hex"),
                }).save();
            }

            const url = `${currentPageURL}/users/${user.id}/resetPassword/${token.token}`;
            await sendEmail(user.email, "Reset Password Link", url);
            return res.status(201).json({ error: "An email sent, please verify" });
        } else {
            return res.status(401).json({ error: "Email not registered" });
        }
    } catch (error) {
        console.log(error);
        return res.status(402).json({ error: "Internal server error" });
    }
})

router.post('/resetPassword', async function (req, res) {
    const { id, password } = req.body;
    if (!id || !password) {
        return res.status(400).json({ error: "Enter all fields" });
    }
    const encryptedPassword = await bcrypt.hash(password, 12);
    await UserModal.updateOne({ _id: id }, { $set: { password: encryptedPassword } });
    return res.status(201).json({ message: "Password Updated Successfully" });
});

// router.get('/logout', (req, res) => {
//     res.clearCookie('UserToken', { path: '/' });
//     res.status(200).send('User Logout');
// });

router.post('/updateProfileInfo', async function (req, res) {
    const { id, name, address, contact } = req.body;
    if (!id || !name || !address || !contact) {
        return res.status(401).send('Enter all fields');
    }
    await UserModal.updateOne({ _id: id }, { $set: { name: name, address: address, phone: contact } });
    return res.status(201).json({ message: "Details Updated Successfully" });
});

router.post('/updateProfileEmail', async function (req, res) {
    const { id, email } = req.body;
    if (!id || !email) {
        return res.status(401).send('Enter all fields');
    }
    await UserModal.updateOne({ _id: id }, { $set: { email: email, verified: false } });
    return res.status(201).json({ message: "Details Updated Successfully" });
});

router.post('/deleteAccount', async function (req, res) {
    const { id } = req.body;
    if (!id) {
        return res.status(401).send('User ID not found');
    }
    await UserModal.findByIdAndDelete(id);
    res.clearCookie('UserToken', { path: '/' });
    return res.status(201).json({ message: "User Account deleted!" });
})


router.post('/getOrderDetails', async (req, res) => {
    const userToken = req.body.userToken;
    // const data =await OrderModel.find({ buyer: { $in: [id] } }).exec();
    const verifyToken = jwt.verify(userToken, process.env.SECRET_KEY);
    const rootUser = await UserModal.findOne({_id:verifyToken._id, "tokens.token":userToken });
    // console.log(rootUser._id);
    const id = rootUser._id;
    const query = OrderModel.find({ buyer: { $in: [id] } }).sort({ createdAt: -1 });
    // console.log(query.getQuery());
    const data = await query.exec();
    res.send(data);
});

router.post('/getUserData', async function (req, res) {
    try {
        const userToken = req.body.userToken;
        // console.log(userToken);
        const verifyToken = jwt.verify(userToken, process.env.SECRET_KEY);
        const rootUser = await UserModal.findOne({_id:verifyToken._id, "tokens.token":userToken });
        if(!rootUser){
            return res.status(401).message('User Not logged in');
        }else{
            return res.status(206).json({ user: rootUser });
        }
      } catch (error) {
        console.log("Error occurred while processing the request:", error);
         return res.status(500).json({ error: "Internal server error" });
      }
    // res.send(req.rootUser);
});


// router.post('/contact', async function (req, res) {
//     try {
//         const { name, email, phone, message } = req.body;

//         if (!name || !email || !phone || !message) {
//             // console.log("error in contact form");
//             return res.status(401).json({ error: "pls fill all fields of contact form" });
//         }

//         const userContact = await UserModal.findOne({ _id: req.userID });

//         if (userContact) {
//             const userMessage = await userContact.addMessageToDB(name, email, phone, message);
//             await userContact.save();
//             res.status(201).json({ message: "contact application submitted successfully" });
//         }
//     }
//     catch (err) {
//         console.log(err);
//     }
// });
router.post('/contact', async function (req, res) {
    try {
        const { name, email, phone, message, userToken } = req.body;

        if (!name || !email || !phone || !message || !userToken) {
            // console.log("error in contact form");
            return res.status(401).json({ error: "pls fill all fields of contact form" });
        }
        const verifyToken = jwt.verify(userToken, process.env.SECRET_KEY);
        const rootUser = await UserModal.findOne({_id:verifyToken._id, "tokens.token":userToken });
        // const userContact = await UserModal.findOne({ _id: req.userID });

        if (rootUser) {
            const userMessage = await rootUser.addMessageToDB(name, email, phone, message);
            await rootUser.save();
            res.status(201).json({ message: "contact application submitted successfully" });
        }
    }
    catch (err) {
        console.log(err);
    }
});

router.get('/getProdByCatPX/:name', async function (req, res) {
    const data = await AllProductModel.find({ type: req.params.name }).collation({ locale: 'en', strength: 2 }).sort({ name: 1 });
    res.send(data);
})

router.get('/getProdByID_SP_PX/:id', async function (req, res) {
    const data = await AllProductModel.find({ _id: req.params.id });
    res.send(data);
})

router.post('/addReview', async function (req, res) {
    const { prodId, reviewerName, rating, reviewtitle, reviewDescription, userToken } = req.body;
    if (!prodId || !reviewerName || !rating || !reviewtitle || !reviewDescription || !userToken) {
        console.log("error in review form");
        return res.status(405).json({ error: "pls fill all fields of contact form" });
    }
    const verifyToken = jwt.verify(userToken, process.env.SECRET_KEY);
    const rootUser = await UserModal.findOne({_id:verifyToken._id, "tokens.token":userToken });
    const reviewerId = rootUser._id;
    if (!reviewerId) {
        res.status(401).json({ message: "User not logged in" });
    }
    const product = await AllProductModel.findOne({ _id: prodId });
    if (product) {
        const review = await product.addReviewToDB(reviewerId, reviewerName, rating, reviewtitle, reviewDescription);
        await product.save();
        res.status(201).json({ message: "review submitted submitted successfully" });
    }
})

router.post('/changeAdress', async function (req, res) {
    var data = {
        address: req.body.address
    }
    const userToken = req.body.userToken;
    const verifyToken = jwt.verify(userToken, process.env.SECRET_KEY);
    const rootUser = await UserModal.findOne({_id:verifyToken._id, "tokens.token":userToken });
    UserModal.findByIdAndUpdate(rootUser._id, { $set: data }, { new: true }, function (err, data) {
        if (err) {
            res.status(500);
            res.send(err);
        } else {
            res.status(200);
            res.send();
        }
    })
})

// router.post('/sendPurchaseDetailsToBuyer', async function(req,res){
//     const {userEmail, cartdata}= req.body;
//     // console.log(userEmail);
//     // console.log(cartdata);
// })

router.get('/getAllProducts', async function (req, res) {
    const { fields } = req.query;

    let projection = {};
    if (fields && Array.isArray(fields)) {
        // Create the projection object based on the fields array
        projection = fields.reduce((obj, field) => {
            obj[field] = 1; // Include the field in the projection
            return obj;
        }, {});
    }

    try {
        // Fetch products from the database with the applied projection
        const products = await AllProductModel.find({}, projection);

        res.json(products);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
})

// for admin panel


router.post('/adminregister', async function (req, res) {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(422).json({ error: "There is an error" });
    }
    try {
        let userExist = await AdminModal.findOne({ username: username });

        if (userExist) {
            return res.status(422).json({ error: "Admin already exist" });
        }
        else {
            const admin = new AdminModal({ username, password });

            await admin.save();

            res.status(201).json({ message: "Admin saved Successfully!" });
        }
    } catch (error) {
        console.log(error);
    }
});

router.post('/adminlogin', async function (req, res) {
    try {
        let token;
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: "pls fill the data" });
        }
        const user = await AdminModal.findOne({ username: username });
        if (user) {
            const isMatch = await bcrypt.compare(password, user.password);
            if (isMatch) {
                token = await user.generateAuthToken1();

                res.cookie("AdminToken", token, {
                    expires: new Date(Date.now() + 1800000000),
                    httpOnly: true
                });
                res.status(201).json({ message: "Admin signIn successfully" });

            }
            else {
                res.status(400).json({ message: "invalid credentials" });
            }
        }
        else {
            res.status(400).json({ message: "invalid credentials" });
        }
    }
    catch (error) {
        console.log(error);
    }

});

router.get('/logoutadmin', (req, res) => {
    res.clearCookie('AdminToken', { path: '/' });
    res.status(200).send('User Logout');
});

router.post('/categoryUpload', async function (req, res) {
    const { name, image } = req.body;
    if (!name || !image) {
        return res.status(400).json({ error: "pls fill the data" });
    }
    else {
        const catExist = await CategoryModel.findOne({ name: name });
        if (catExist) {
            return res.status(406).json({ error: "Category already exist" });
        }
        else {
            const newCat = new CategoryModel({ name, image });
            await newCat.save();
            return res.status(201).json({ message: "Category registered successfully" });
        }
    }
})

router.post('/categoryUpdate/:id', async function (req, res) {
    const { id } = req.params;
    var data = {
        name: req.body.name,
        image: req.body.image
    }
    CategoryModel.findByIdAndUpdate(id, { $set: data }, { new: true }, function (err, data) {
        if (err) {
            res.status(500);
            res.send(err);
        } else {
            res.status(200);
            res.send();
        }
    });
})

router.get('/getCategory', async function (req, res) {
    const data = await CategoryModel.find().collation({ locale: 'en', strength: 2 }).sort({ name: 1 });
    res.send(data);
})

router.get('/getSingleCategory/:id', async function (req, res) {
    const { id } = req.params;
    const data = await CategoryModel.findById(id);
    res.send(data);
})


router.post('/deleteCategory', async function (req, res) {
    const catid = req.body.catid;
    try {
        await CategoryModel.findOneAndDelete({ _id: catid });
        return res.status(204).json({ message: "category deleted." });
    } catch (error) {
        res.status(404).json({ message: error.stack });
    }

})

router.post('/product', async function (req, res) {
    const { name, image, type, description, originalPrice, sellingPrice, trendingProduct, weight, dimension } = req.body;
    const newProduct = new AllProductModel({ name, image, type, description, originalPrice, sellingPrice, trendingProduct, weight, dimension })
    await newProduct.save();
    return res.status(201).json({ message: "Product added successfully" });
})

router.get('/getProduct', async function (req, res) {
    const data = await AllProductModel.find().collation({ locale: 'en', strength: 2 }).sort({ name: 1 });
    res.send(data);
})

router.get('/getProductByCategory/:catName', async function (req, res) {
    const catName = req.params;
    // console.log(catName.catName);
    const data = await AllProductModel.find({ type: catName.catName }).collation({ locale: 'en', strength: 2 }).sort({ name: 1 });
    res.send(data);
})

router.post('/deleteProduct', async function (req, res) {
    const catid = req.body.prodid;
    try {
        await AllProductModel.findOneAndDelete({ _id: catid });
        return res.status(204).json({ message: "Product deleted." });
    } catch (error) {
        res.status(404).json({ message: error.stack });
    }

})

router.get('/getSingleProduct/:id', async function (req, res) {
    const { id } = req.params;
    const data = await AllProductModel.findById(id);
    res.send(data);
})

router.post('/productUpdate/:id', async function (req, res) {
    const { id } = req.params;
    var data = {
        name: req.body.name,
        image: req.body.image,
        type: req.body.type,
        description: req.body.description,
        originalPrice: req.body.originalPrice,
        sellingPrice: req.body.sellingPrice,
        trendingProduct: req.body.trendingProduct,
        weight: req.body.weight,
        dimension: req.body.dimension

    }
    AllProductModel.findByIdAndUpdate(id, { $set: data }, { new: true }, function (err, data) {
        if (err) {
            res.status(500);
            res.send(err);
        } else {
            res.status(200);
            res.send();
        }
    });
})

router.get('/getTrendingProduct', async function (req, res) {
    const data = await AllProductModel.find({ trendingProduct: true }).collation({ locale: 'en', strength: 2 }).sort({ name: 1 });
    res.send(data);
})

router.get('/getUsers', async function (req, res) {
    const data = await UserModal.find();
    res.send(data);
})

router.get('/getSingleUser/:id', async function (req, res) {
    const { id } = req.params;
    const data = await UserModal.findById(id);
    res.send(data);
})

router.post('/updateUser/:id', async function (req, res) {
    const { id } = req.params;
    const data = {
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        address: req.body.address
    }
    // try{
    //     const updateUser = await UserModal.findByIdAndUpdate(id,{$set:data})
    //     return res.status(200).json({ message:"Product added successfully"});
    // }
    // catch(err){
    //     console.log(err);
    // }


    UserModal.findByIdAndUpdate(id, { $set: data }, { new: true }, function (err, data) {
        if (err) {
            res.status(500);
            res.send(err);
        } else {
            res.status(200);
            res.send();
        }
    })
})

router.post('/deleteUser', async function (req, res) {
    const userid = req.body.userId;
    try {
        await UserModal.findOneAndDelete({ _id: userid });
        return res.status(204).json({ message: "User deleted." });
    } catch (error) {
        res.status(404).json({ message: error.stack });
    }

})

router.post('/addingUserByAdmin', async function (req, res) {
    const { name, email, phone, address, password, cpassword } = req.body;

    try {
        let userExist = await UserModal.findOne({ email: email });

        if (userExist) {
            return res.status(422).json({ error: "Email already exist" });
        } else if (password != cpassword) {
            res.status(422).json({ message: 'password and cpassword does not match' });
        } else {
            const user = await new UserModal({ name, email, phone, address, password, cpassword }).save();


            res.status(201).json({ message: "User registered successfully!" });
        }
    } catch (error) {
        console.log(error);
    }
})

export default router;