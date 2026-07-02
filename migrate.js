require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const DB = require('./database');

const DATA_DIR = path.join(__dirname, 'data');
const HOSTELS_FILE = path.join(DATA_DIR, 'hostels.json');
const STUDENTS_FILE = path.join(DATA_DIR, 'students.json');
const TENANTS_DIR = path.join(DATA_DIR, 'tenants');

async function migrate() {
  console.log('🔄 Starting Data Migration to MongoDB...');

  // Connect to MongoDB
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hostel-db';
  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB.');

  const { Hostel, Admin, Student, Tenant } = DB.Models;

  // Clear existing MongoDB data to prevent duplicates on rerun
  console.log('🧹 Clearing existing collections...');
  await Hostel.deleteMany({});
  await Admin.deleteMany({});
  await Student.deleteMany({});
  await Tenant.deleteMany({});

  // Migrate Hostels and Admins
  if (fs.existsSync(HOSTELS_FILE)) {
    const hostelsData = JSON.parse(fs.readFileSync(HOSTELS_FILE, 'utf8'));
    
    if (hostelsData.list && hostelsData.list.length > 0) {
      await Hostel.insertMany(hostelsData.list);
      console.log(`✅ Migrated ${hostelsData.list.length} Hostels.`);
    }

    if (hostelsData.admins && hostelsData.admins.length > 0) {
      await Admin.insertMany(hostelsData.admins);
      console.log(`✅ Migrated ${hostelsData.admins.length} Admins.`);
    }
  }

  // Migrate Global Students
  if (fs.existsSync(STUDENTS_FILE)) {
    const studentsData = JSON.parse(fs.readFileSync(STUDENTS_FILE, 'utf8'));
    if (studentsData.length > 0) {
      await Student.insertMany(studentsData);
      console.log(`✅ Migrated ${studentsData.length} Students.`);
    }
  }

  // Migrate Tenants
  if (fs.existsSync(TENANTS_DIR)) {
    const files = fs.readdirSync(TENANTS_DIR);
    let count = 0;
    for (const file of files) {
      if (file.endsWith('.json')) {
        const tenantData = JSON.parse(fs.readFileSync(path.join(TENANTS_DIR, file), 'utf8'));
        
        // Ensure hostelId exists in the document
        if (!tenantData.hostelId) {
            // infer hostelId from filename e.g. "hostel_123.json" -> "hostel_123"
            tenantData.hostelId = file.replace('.json', '');
        }

        await Tenant.create(tenantData);
        count++;
      }
    }
    console.log(`✅ Migrated ${count} Tenant files.`);
  }

  console.log('🎉 Migration Completed Successfully!');
  process.exit(0);
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
