require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGO_URI;

async function resetDB() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(uri);
        console.log('Connected to MongoDB.');

        console.log('Wiping all data to make it fresh...');
        // Drop the entire database to wipe all collections
        await mongoose.connection.db.dropDatabase();

        console.log('✅ Database wiped successfully! It is now completely fresh.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error wiping database:', err);
        process.exit(1);
    }
}

resetDB();
