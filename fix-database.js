const mongoose = require('mongoose');
const { mongoURL } = require('./config.json'); // 👈 Make sure this points to your config

// Connect to Database
mongoose.connect(mongoURL)
    .then(async () => {
        console.log('✅ Connected to MongoDB.');
        
        try {
            // 1. Access the collection directly
            const collection = mongoose.connection.collection('trackedservers');
            
            // 2. Drop ALL indexes (This removes the "ghost" rules)
            await collection.dropIndexes();
            console.log('🗑️  Old indexes dropped successfully!');
            
            // 3. Re-apply the correct indexes from your Schema
            // (Mongoose does this automatically when you restart the bot)
            console.log('🔄 Please RESTART your bot now to apply the clean schema.');
            
        } catch (e) {
            console.error('❌ Error dropping indexes:', e.message);
        }
        
        process.exit();
    })
    .catch(err => {
        console.error('❌ Connection failed:', err);
    });
