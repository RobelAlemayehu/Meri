import mongoose from "mongoose";

export async function connectDB() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("Missing MONGO_URI in environment (.env)");
    process.exit(1);
  }

  const dbName = process.env.MONGO_DB_NAME || "hospitality";
  await mongoose.connect(mongoUri, { dbName });
  console.log(`MongoDB connected (database: ${dbName})`);
}
