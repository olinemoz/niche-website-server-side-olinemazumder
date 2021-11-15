const express = require('express');
const app = express();
require('dotenv').config();
const {MongoClient} = require('mongodb');
const cors = require('cors')
const admin = require("firebase-admin");
const ObjectId = require('mongodb').ObjectId


const PORT = process.env.PORT || 5000

const serviceAccount = require("./car-sales-firebase-adminsdk.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

// Middlewares
app.use(cors())
app.use(express.json())

//Database Integration
const url = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@mern-practice.upqpe.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`
const client = new MongoClient(url, {useNewUrlParser: true, useUnifiedTopology: true});

async function verifyToken(req, res, next) {
    if (req.headers.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1];
        console.log("Token: ", token)
        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedemail = decodedUser.email;
        } catch {

        }
    }
    next();
}


// Database Operations
async function run() {
    try {
        await client.connect();
        // console.log("Database Connected Successfully!")
        const database = client.db("car_sales");
        const carCollections = database.collection("cars");
        const usersCollections = database.collection("users");
        const orderCollections = database.collection("orders");
        const reviewCollections = database.collection("reviews");

        // Api Operations
        app.get('/users/:email',verifyToken, async (req, res) => {
            const email = req.params.email;
            const query = {email: email};
            const user = await usersCollections.findOne(query);
            let isAdmin = false;
            if (user?.role === 'admin') {
                isAdmin = true;
            }
            res.json({admin: isAdmin});
        })

        //Adding User into Database
        app.post('/users', async (req, res) => {
            const user = req.body
            const result = await usersCollections.insertOne(user);
            res.json(result)
        })

        // Updating User Details in Database
        app.put('/users', async (req, res) => {
                const user = req.body
                const filter = {email: user.email}
                const options = {upsert: true}
                const updateDoc = {$set: user}
                const result = await usersCollections.updateOne(filter, updateDoc, options)
                res.json(result)
            }
        )

        // Making New Admin Here
        app.put('/users/admin', verifyToken, async (req, res) => {
            const user = req.body
            const requester = req.decodedemail
            if (requester) {
                const requesterAccount = await usersCollections.findOne({email: requester})
                if (requesterAccount.role === 'admin') {
                    const filter = {email: user.email}
                    const updateDoc = {$set: {role: 'admin'}};
                    const result = await usersCollections.updateOne(filter, updateDoc)
                    res.json(result)
                }
            } else {
                res.status(403).json({message: 'Unauthorized'})
            }
        })

        //Getting All Cars
        app.get('/cars',verifyToken, async (req, res) => {
            const cars = await carCollections.find().toArray();
            res.json(cars);
        })

        app.delete('/cars/:deleteOrder', async (req, res) => {
            const deleteOrder = req.params.deleteOrder
            const query = {_id: ObjectId(deleteOrder)}
            const result = await carCollections.deleteOne(query);
            res.json(result)
        })

        //Getting Specific Cars

        app.get('/cars/:carProducts',verifyToken, async (req, res) => {
            const id = req.params.carProducts
            const query = {_id: ObjectId(id)};
            const result = await carCollections.findOne(query)
            res.json(result)
        })
        // User Based Order
        app.get('/orders/:email',verifyToken, async (req, res) => {
            const email = req.params.email
            const query = {email: email}
            const cursor = orderCollections.find(query);
            const result = await cursor.toArray()
            res.send(result)
        })
        // New Order
        app.post('/orders', async (req, res) => {
            const newOrder = req.body
            const result = await orderCollections.insertOne(newOrder);
            res.json(result)
        })

        // Deleting Order
        app.delete('/orders/:deleteOrder', async (req, res) => {
            const deleteOrder = req.params.deleteOrder
            const query = {_id: ObjectId(deleteOrder)}
            const result = await orderCollections.deleteOne(query);
            res.json(result)
        })

        // Admin Finding All Orders
        app.get('/orders',verifyToken, async (req, res) => {
            const cursor = orderCollections.find({});
            const result = await cursor.toArray()
            res.send(result)
        })

        // Updating Order Status
        app.put('/orders/:updateOrder', async (req, res) => {
            const updateOrder = req.params.updateOrder
            const {orderStatus} = req.body
            const filter = {_id: ObjectId(updateOrder)}
            const options = {upsert: true};
            const updateDoc = {
                $set: {
                    orderStatus: orderStatus
                },
            }
            const result = await orderCollections.updateOne(filter, updateDoc, options);
            res.json(result)
        })

        // Adding New Product Here

        app.post('/cars', async (req, res) => {
            const newProduct = req.body
            const result = await carCollections.insertOne(newProduct)
            res.json(result)
        })

        // Posting User Reviews
        app.post('/reviews', async (req, res) => {
            const newReview = req.body
            const result = await reviewCollections.insertOne(newReview)
            res.json(result)
        })
        // Getting User Review
        app.get('/reviews',verifyToken, async (req, res) => {
            const cursor = reviewCollections.find({});
            const result = await cursor.toArray()
            res.send(result)
        })

    } finally {
        // await client.close();
    }
}

run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(PORT, () => {
    console.log('Server Started Successfully on ', PORT);
})