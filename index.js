const express = require('express');
require('dotenv').config();
const cors = require('cors');
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

// Connect the client to the server
client.connect().then(() => {
  console.log("Successfully connected to MongoDB!");

  // Database collections
  const ContestCollections = client.db("ContestCreationDb").collection("contests");

  // Post a contest
  app.post("/contests", async (req, res) => {
    const newContest = req.body;
    const baseName = newContest.contestName
    let contestName = baseName;
    let counter = 1;
    while (await ContestCollections.findOne({ contestName })) {
      contestName = `${baseName}-${counter}`;
      counter++;
    }

    newContest.contestName = contestName;
    const result = await ContestCollections.insertOne(newContest);
    res.send(result);
  });

  // Get all contests
  app.get("/contests", async (req, res) => {
    const allContests = await ContestCollections.find().toArray();
    res.send(allContests);
  });

  // Get a contest by name
  app.get("/contests/:contestName", async (req, res) => {
    const contestName = req.params.contestName;
    const query = { contestName };
    const result = await ContestCollections.findOne(query);
    res.send(result);
  });

  // Send a ping to confirm a successful connection
  client.db("admin").command({ ping: 1 }).then(() => {
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  }).catch(console.dir);
}).catch(console.dir);

app.get('/', (req, res) => {
  res.send('Contest Creation Platform Server Is Running');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
