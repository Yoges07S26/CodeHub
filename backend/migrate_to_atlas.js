/**
 * Automated Migration Script: Local MongoDB -> MongoDB Atlas
 * Usage: node migrate_to_atlas.js "<YOUR_ATLAS_CONNECTION_STRING>"
 */

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const LOCAL_URI = process.env.LOCAL_MONGODB_URI || 'mongodb://127.0.0.1:27017/codehub';
const ATLAS_URI = process.argv[2] || process.env.ATLAS_MONGODB_URI;

if (!ATLAS_URI) {
  console.error('\x1b[31mError: Please provide your MongoDB Atlas connection string.\x1b[0m');
  console.log('\nUsage:');
  console.log('  node migrate_to_atlas.js "mongodb+srv://<user>:<password>@cluster0.xxxx.mongodb.net/codehub?retryWrites=true&w=majority"\n');
  process.exit(1);
}

async function migrate() {
  console.log('\x1b[36m====================================================\x1b[0m');
  console.log('\x1b[36m   CodeHub: Local MongoDB to MongoDB Atlas Migration   \x1b[0m');
  console.log('\x1b[36m====================================================\x1b[0m\n');

  let localClient, atlasClient;

  try {
    console.log('[1/4] Connecting to Local MongoDB (Compass)...');
    localClient = new MongoClient(LOCAL_URI);
    await localClient.connect();
    const localDb = localClient.db('codehub');
    console.log('  -> Connected to local database: codehub');

    console.log('\n[2/4] Connecting to MongoDB Atlas...');
    atlasClient = new MongoClient(ATLAS_URI);
    await atlasClient.connect();
    
    // Extract DB name from Atlas URI or default to 'codehub'
    const targetDbName = 'codehub';
    const atlasDb = atlasClient.db(targetDbName);
    console.log(`  -> Connected to MongoDB Atlas (target: ${targetDbName})`);

    console.log('\n[3/4] Copying collections & documents to Atlas...');
    const collections = await localDb.listCollections().toArray();

    if (collections.length === 0) {
      console.log('  No collections found in local database codehub.');
    }

    for (const colInfo of collections) {
      const colName = colInfo.name;
      if (colName.startsWith('system.')) continue;

      const localCol = localDb.collection(colName);
      const atlasCol = atlasDb.collection(colName);

      const docs = await localCol.find({}).toArray();
      const count = docs.length;

      if (count > 0) {
        // Clear destination collection first to avoid duplicates
        await atlasCol.deleteMany({});
        await atlasCol.insertMany(docs);
        console.log(`  [OK] Migrated ${count.toString().padStart(4)} documents -> ${colName}`);
      } else {
        console.log(`  [--] Collection '${colName}' is empty (created on Atlas)`);
        await atlasDb.createCollection(colName).catch(() => {});
      }
    }

    console.log('\n[4/4] Updating backend/.env configuration...');
    const envPath = path.resolve(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf8');
      if (envContent.includes('MONGODB_URI=')) {
        envContent = envContent.replace(/MONGODB_URI=.*/, `MONGODB_URI=${ATLAS_URI}`);
      } else {
        envContent += `\nMONGODB_URI=${ATLAS_URI}\n`;
      }
      fs.writeFileSync(envPath, envContent, 'utf8');
      console.log('  -> Updated MONGODB_URI in backend/.env to MongoDB Atlas!');
    }

    console.log('\n\x1b[32m SUCCESS: Database migration to MongoDB Atlas is complete!\x1b[0m');
    console.log('You can now run `npm start` in backend to use Atlas.\n');

  } catch (err) {
    console.error('\n\x1b[31mMigration failed:\x1b[0m', err.message);
    process.exit(1);
  } finally {
    if (localClient) await localClient.close();
    if (atlasClient) await atlasClient.close();
  }
}

migrate();
