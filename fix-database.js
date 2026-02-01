require('dotenv').config(); // 👈 Loads your .env file
const mongoose = require('mongoose');

// ⚠️ Make sure 'MONGO_URI' matches the name inside your .env file!
// It might be MONGO_URL, DATABASE_URL, or MONGODB_URI. check your file.
const mongoURL = process.env.MONGO_TOKEN || process.env.MONGO_URL;

if (!mongoURL) {
    console.error("❌ Error: Could not find the Mongo URI in your .env file.");
    process.exit(1);
}

mongoose.connect(mongoURL)
    .then(async () => {
        console.log('✅ Connected to MongoDB.');
        
        try {
            // 1. Access the collection
            const collection = mongoose.connection.collection('trackedservers');
            
            // 2. Drop ALL indexes (This fixes the "unique: true" ghost rule)
            await collection.dropIndexes();
            console.log('🗑️  Old indexes dropped successfully!');
            console.log('🔄 Please RESTART your bot now to apply the clean schema.');
            
        } catch (e) {
            // If the collection doesn't exist yet, that's fine too
            if (e.code === 26) {
                console.log('⚠️ Collection not found (Database is empty), nothing to fix.');
            } else {
                console.error('❌ Error dropping indexes:', e.message);
            }
        }
        
        process.exit();
    })
    .catch(err => {
        console.error('❌ Connection failed:', err);
    });
