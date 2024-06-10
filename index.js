const express = require('express');
require('dotenv').config();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_USER_PASS}@cluster0.ayx4dej.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Connect to MongoDB
client.connect().then(() => {
  console.log("Successfully connected to MongoDB!");

  // Database collections
  const ContestCollections = client.db("ContestCreationDb").collection("contests");
  const UserCollections = client.db("ContestCreationDb").collection("users");
  const PaymentCollections = client.db("ContestCreationDb").collection("payments");
  const SubmissionCollections = client.db("ContestCreationDb").collection("submissions");


  // JWT token generation endpoint
  app.post("/jwt", async (req, res) => {
    const user = req.body;
    const token = jwt.sign(user, process.env.JWT_ACCESS_TOKEN, {
      expiresIn: "7d",
    });
    res.send({ token });
  });

  // Token verification middleware
  const verifyToken = (req, res, next) => {
    // console.log();
    const token = req.headers.authorization;
    console.log(token);
    if (!token) {
      return res.status(401).send({ message: "Unauthorized Access denied" });
    }
    jwt.verify(token, process.env.JWT_ACCESS_TOKEN, (err, decoded) => {
      if (err) {
        return res.status(401).send({ message: "Unauthorized Access denied" });
      }
      req.decoded = decoded;
      next();
    });
  };
  // verify admin
  const verifyAdmin = async (req, res, next) => {
    const email = req.decoded.email;  // Extract email from req.decoded
    // console.log(email);
    const query = { email: email };
    const user = await UserCollections.findOne(query);

    if ( user?.role === "admin") {
        next();
    } else {
        return res.status(401).send({ message: "Unauthorized Access denied" });
    }
};


  // Stripe payment related API
  app.post("/create-payment-intent", async (req, res) => {
    // console.log(res);
    const { price } = req.body;
    const amount = parseInt(price * 100); // Convert to cents

    const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
    });

    res.send({
        clientSecret: paymentIntent.client_secret,
    });
});

// add payment transaction
 app.post("/payment", async (req, res) => {
  const newPayment = req.body;
  const result = await PaymentCollections.insertOne(newPayment);
  res.send(result);
 })
//  get payment transaction
 app.get("/payment", async (req, res) => {
  const allPayment = await PaymentCollections.find().toArray();
  res.send(allPayment);
 })
 // Get payment transactions by user email
app.get("/payment/:email", async (req, res) => {
  const email = req.params.email;
  const payments = await PaymentCollections.find({ email }).toArray();
  res.send(payments);
});


  // Post a contest
  app.post("/contests", async (req, res) => {
    const newContest = req.body;
    const result = await ContestCollections.insertOne(newContest)
    res.send(result);
  });

  // Ensure verifyToken is used before verifyAdmin
app.get("/contests", async (req, res) => {
  console.log(res);
  const result = await ContestCollections.find({ status: "approved" }).toArray();
  res.send(result);
});

app.get("/my-contests/:email", async (req, res) => {
  const email = req.params.email; 
  const query = { userEmail: email }; 
  const result = await ContestCollections.find(query).toArray();
  res.send(result);
});

  // Delete a contest
  app.delete("/contests/:id", async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await ContestCollections.deleteOne(query)
    res.send(result);
  });

  // Update a contest
  app.put("/contests/:id", async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const options = { upsert: true };
    const contestData = req.body;
    const post = {
      $set: {
        contestName: contestData.contestName,
        image: contestData.image,
        contestDescription: contestData.contestDescription,
        contestPrice: contestData.contestPrice,
        prizeMoney: contestData.prizeMoney,
        taskSubmissionInstructions: contestData.taskSubmissionInstructions,
        contestTags: contestData.contestTags,
        contestDeadline: contestData.contestDeadline,
      }
    };
    const result = await ContestCollections.updateOne(filter, post, options)
    res.send(result);
  });

  // Get a contest by contest name
  app.get("/contests/:contestName", async (req, res) => {
    const contestName = req.params.contestName;
    const query = { contestName };
    const result = await ContestCollections.findOne(query)
    res.send(result);
  });

  // Get a contest by id
  app.get("/contest/:id", async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await ContestCollections.findOne(query)
    res.send(result);
  }); 

  // ------------ users related data --------------------
  // Post a user
  app.post("/users", async (req, res) => {
    const newUser = req.body;
    const result = await UserCollections.insertOne(newUser)
    res.send(result);
  });

  // Get all users
  app.get("/users", async (req, res) => {
    const result = await UserCollections.find().toArray()
    res.send(result);
  });

  // Make a user admin
  app.patch("/users/admin/:id", async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const updatedDoc = {
      $set: {
        role: "admin"
      }
    };
    const result = await UserCollections.updateOne(filter, updatedDoc)
    res.send(result);
  });

  // Make a user contest creator
  app.patch("/users/creator/:id", async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const updatedDoc = {
      $set: {
        role: "creator"
      }
    };
    const result = await UserCollections.updateOne(filter, updatedDoc)
    res.send(result);
  });

  // Make a user regular user
  app.patch("/users/user/:id", async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const updatedDoc = {
      $set: {
        role: "user"
      }
    };
    const result = await UserCollections.updateOne(filter, updatedDoc)
    res.send(result);
  });
  // get accepted contest
  // app.get("/acceptedContests", async (req, res) => {
  //   const result = await ContestCollections.find({ status: "accepted" }).toArray()
  //   res.send(result);
  // });
  // get rejected contest
  app.get("/pending-rejected-contests", async (req, res) => {
    const result = await ContestCollections.find({ status: { $in: ["pending", "rejected"] } }).toArray();
    res.send(result);
  })
    // update accepted status
    app.patch("/approve-contests/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: "approved"
        }
      };
      const result = await ContestCollections.updateOne(filter, updatedDoc)
      res.send(result);
    })
  // update rejected status
  app.patch("/rejected-contests/:id", async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const updatedDoc = {
      $set: {
        status: "rejected"
      }
    };
    const result = await ContestCollections.updateOne(filter, updatedDoc)
    res.send(result);
  })

  // post submitted contest 
  app.post("/submission", async (req, res) => {
    const newContest = req.body;
    const result = await SubmissionCollections.insertOne(newContest)
    res.send(result);
  });
  // get submitted contest
  app.get("/submission", async(req, res) => {
    const result = await SubmissionCollections.find().toArray()
    res.send(result);
  });
  // Get submissions by user email and contest ID
app.get("/submission/:userEmail/:contestId", async (req, res) => {
  const { userEmail, contestId } = req.params;
  const query = { userEmail, contestId };
  const submission = await SubmissionCollections.findOne(query);
  res.send(submission);
});
// get submission contest by id
app.get("/submission/:userEmail", async (req, res) => {
  const { userEmail } = req.params;
  const query = { userEmail };
  const result = await SubmissionCollections.find(query).toArray();
  res.send(result);
});



// -------------------------------------
app.patch("/make-winner/:submissionId", async (req, res) => {
  const { submissionId } = req.params;
  
  // Find the submission by ID
  const submission = await SubmissionCollections.findOne({ _id: new ObjectId(submissionId) });
  
  if (!submission) {
    return res.status(404).send({ message: "Submission not found" });
  }

  // Check if a winner has already been chosen for this contest
  const existingWinner = await SubmissionCollections.findOne({ contestId: submission.contestId, isWinner: true });
  if (existingWinner) {
    return res.status(400).send({ message: "A winner has already been chosen for this contest" });
  }

  // Mark the submission as winner
  const filter = { _id: new ObjectId(submissionId) };
  const updateDoc = {
    $set: {
      isWinner: true,
    }
  };

  const result = await SubmissionCollections.updateOne(filter, updateDoc);
  res.send(result);
});
// -------------------------------------
  // Get user points by email
  app.get("/user-points/:userEmail", async (req, res) => {
    const userEmail = req.params.userEmail;
    const winningSubmissions = await SubmissionCollections.find({ userEmail, isWinner: true }).toArray();
    
    const points = winningSubmissions.length * 10;
    res.send({ points });
  });
// --------------------------------

  // Ping to confirm a successful connection
  client.db("admin").command({ ping: 1 })
    .then(() => {
      console.log("Pinged MongoDB successfully!");
    })
    .catch(err => {
      console.error("Error pinging MongoDB:", err);
      process.exit(1);
    });
}).catch(err => {
  console.error("Error connecting to MongoDB:", err);
  process.exit(1);
});

app.get('/', (req, res) => {
  res.send('Contest Creation Platform Server Is Running');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
