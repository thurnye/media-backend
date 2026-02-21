import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost/GraphQ';

mongoose
  .connect(MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err: Error) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });
