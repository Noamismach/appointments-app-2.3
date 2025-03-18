const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://NoamIS:Noam2008@cluster0.6zzfe.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

console.log("התחלת בדיקת חיבור ל-MongoDB");

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    console.log("מנסה להתחבר לשרת...");
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    console.log("התחברות הצליחה, שולח פינג...");
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("פינג הצליח! החיבור ל-MongoDB פעיל!");
  } catch (error) {
    console.error("שגיאה בהתחברות ל-MongoDB:", error);
  } finally {
    // Ensures that the client will close when you finish/error
    console.log("סוגר חיבור...");
    await client.close();
    console.log("החיבור נסגר");
  }
}

console.log("מריץ פונקציית בדיקה...");
run().catch(err => {
  console.error("שגיאה כללית:", err);
}); 