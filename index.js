const express = require('express');
require('dotenv').config();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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

  // JWT token generation endpoint
  app.post("/jwt", async (req, res) => {
    const user = req.body;
    const token = jwt.sign(user, process.env.JWT_SECRET, {
        expiresIn: "7d",
    });
    res.send({ token });
  });

  // Token verification middleware
  const verifyToken = (req, res, next) => {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).send({ message: "Unauthorized Access denied" });
    }
    jwt.verify(token.split(' ')[1], process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).send({ message: "Unauthorized Access denied" });
      }
      req.decoded = decoded;
      next();
    });
  }

  // Post a contest
  app.post("/contests", verifyToken, async (req, res) => {
    const newContest = req.body;
    const result = await ContestCollections.insertOne(newContest);
    res.send(result);
  });

  // Get all contests
  app.get("/contests", async (req, res) => {
    const allContests = await ContestCollections.find().toArray();
    res.send(allContests);
  });

  // Get a contest by contest name
  app.get("/contests/:contestName", verifyToken, async (req, res) => {
    const contestName = req.params.contestName;
    const query = { contestName };
    const result = await ContestCollections.findOne(query);
    res.send(result);
  });

  // Ping to confirm a successful connection
  client.db("admin").command({ ping: 1 }).then(() => {
    console.log("Pinged MongoDB successfully!");
  }).catch(err => {
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
