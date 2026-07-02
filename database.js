require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Define Schemas
const HostelSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: String,
  address: String,
  accessCode: String,
  wardenName: String,
  wardenTitle: String,
  totalRooms: Number,
  calculatedRooms: Number,
  roomSeater: Number,
  acType: String,
  blocks: String
});

const AdminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  passwordHash: String,
  hostelId: String,
  name: String,
  title: String,
  isActive: { type: Boolean, default: true }
});

const OwnerSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  passwordHash: String,
  name: String
});

const StudentSchema = new mongoose.Schema({
  enrollment: { type: String, required: true, unique: true },
  password: String, // Kept for frontend plain-text compatibility (legacy support)
  passwordHash: String,
  hostelId: String,
  name: String,
  email: String,
  phone: String,
  parentPhone: String,
  course: String,
  academicYear: String,
  bloodGroup: String,
  aadhaar: String,
  address: String,
  status: String,
  roomNo: String
});

const TenantSchema = new mongoose.Schema({
  hostelId: { type: String, required: true, unique: true },
  food_menu: {
    type: Object, default: {
      Monday: { breakfast: "", lunch: "", eveningSnack: "", dinner: "" },
      Tuesday: { breakfast: "", lunch: "", eveningSnack: "", dinner: "" },
      Wednesday: { breakfast: "", lunch: "", eveningSnack: "", dinner: "" },
      Thursday: { breakfast: "", lunch: "", eveningSnack: "", dinner: "" },
      Friday: { breakfast: "", lunch: "", eveningSnack: "", dinner: "" },
      Saturday: { breakfast: "", lunch: "", eveningSnack: "", dinner: "" },
      Sunday: { breakfast: "", lunch: "", eveningSnack: "", dinner: "" }
    }
  },
  rooms: { type: Array, default: [] },
  attendance: { type: Array, default: [] },
  notices: { type: Array, default: [] },
  complaints: { type: Array, default: [] },
  fines: { type: Array, default: [] },
  leave_applications: { type: Array, default: [] },
  visitor_register: { type: Array, default: [] },
  settings: { type: Object, default: { darkMode: false, language: "en", notifications: { foodMenu: true, complaints: true, leaves: true, fines: true } } },
  emergency_contacts: { type: Array, default: [] },
  events: { type: Array, default: [] },
  feedback: { type: Array, default: [] },
  registration_applications: { type: Array, default: [] },
  hostel_info: { type: Object, default: {} },
  hostel_rules: { type: Array, default: [] },
  students: { type: Array, default: [] }
}, { strict: false });

const Hostel = mongoose.model('Hostel', HostelSchema);
const Admin = mongoose.model('Admin', AdminSchema);
const Student = mongoose.model('Student', StudentSchema);
const Tenant = mongoose.model('Tenant', TenantSchema);
const Owner = mongoose.model('Owner', OwnerSchema);

const DB = {
  // Expose models if needed for migration scripts
  Models: { Hostel, Admin, Student, Tenant, Owner },

  async init() {
    try {
      const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hostel-db';
      await mongoose.connect(uri);
      console.log('✅ Connected to MongoDB successfully.');

      // Seed default Owner if not exists
      const ownerCount = await Owner.countDocuments({});
      if (ownerCount === 0 || !(await Owner.findOne({ username: 'singh321' }))) {
        await Owner.deleteMany({}); // remove any previous default owners
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync('password', salt);
        await Owner.create({
          username: 'singh321',
          passwordHash: hash,
          name: 'System Owner'
        });
        console.log('✅ Seeded Owner account (singh321 / password).');
      }
    } catch (err) {
      console.error('❌ Failed to connect to MongoDB:', err);
    }
  },

  async getHostels() {
    return await Hostel.find({}).lean();
  },

  async getHostelByCode(code) {
    if (!code) return null;
    return await Hostel.findOne({ accessCode: { $regex: new RegExp(`^${code}$`, 'i') } }).lean();
  },

  async getHostelById(id) {
    if (!id) return null;
    return await Hostel.findOne({ id }).lean();
  },

  async createHostel(hostelObj, initialRooms = [], initialContacts = [], initialRules = []) {
    await Hostel.create(hostelObj);

    const initialTenantData = {
      hostelId: hostelObj.id,
      food_menu: {
        Monday: { breakfast: "", lunch: "", eveningSnack: "", dinner: "" },
        Tuesday: { breakfast: "", lunch: "", eveningSnack: "", dinner: "" },
        Wednesday: { breakfast: "", lunch: "", eveningSnack: "", dinner: "" },
        Thursday: { breakfast: "", lunch: "", eveningSnack: "", dinner: "" },
        Friday: { breakfast: "", lunch: "", eveningSnack: "", dinner: "" },
        Saturday: { breakfast: "", lunch: "", eveningSnack: "", dinner: "" },
        Sunday: { breakfast: "", lunch: "", eveningSnack: "", dinner: "" }
      },
      rooms: initialRooms,
      attendance: [],
      notices: [],
      complaints: [],
      fines: [],
      leave_applications: [],
      visitor_register: [],
      settings: { darkMode: false, language: "en", notifications: { foodMenu: true, complaints: true, leaves: true, fines: true } },
      emergency_contacts: initialContacts,
      events: [],
      feedback: [],
      registration_applications: [],
      hostel_info: hostelObj,
      hostel_rules: initialRules,
      students: []
    };
    await Tenant.create(initialTenantData);
  },

  async getAdmins() {
    return await Admin.find({}).lean();
  },

  async createAdmin(adminObj) {
    if (adminObj.password) {
      adminObj.passwordHash = bcrypt.hashSync(adminObj.password, 10);
      delete adminObj.password;
    }
    await Admin.create(adminObj);
  },

  async findAdmin(username) {
    if (!username) return null;
    return await Admin.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } }).lean();
  },

  async updateAdminPassword(username, newHash) {
    await Admin.updateOne(
      { username: { $regex: new RegExp(`^${username}$`, 'i') } },
      { $set: { passwordHash: newHash } }
    );
  },

  async toggleAdminStatus(username, status) {
    await Admin.updateOne(
      { username: { $regex: new RegExp(`^${username}$`, 'i') } },
      { $set: { isActive: status } }
    );
  },

  async findOwner(username) {
    if (!username) return null;
    return await Owner.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } }).lean();
  },

  async getStudents() {
    return await Student.find({}).lean();
  },

  async findStudent(enrollment) {
    if (!enrollment) return null;
    return await Student.findOne({ enrollment: { $regex: new RegExp(`^${enrollment}$`, 'i') } }).lean();
  },

  async createStudent(studentObj) {
    if (studentObj.password) {
      studentObj.passwordHash = bcrypt.hashSync(studentObj.password, 10);
    }
    await Student.create(studentObj);
  },

  async updateStudentInGlobalList(studentObj) {
    const { enrollment, ...updateFields } = studentObj;
    await Student.updateOne(
      { enrollment: { $regex: new RegExp(`^${enrollment}$`, 'i') } },
      { $set: updateFields }
    );
  },

  async getTenantData(hostelId) {
    const tenant = await Tenant.findOne({ hostelId }).lean();
    return tenant || {};
  },

  async saveTenantData(hostelId, key, value) {
    const update = {};
    update[key] = value;
    await Tenant.updateOne(
      { hostelId },
      { $set: update },
      { upsert: true }
    );

    // Sync students and registration applications (similar to old logic)
    if (key === 'students' && Array.isArray(value)) {
      for (const s of value) {
        const globalStudent = await this.findStudent(s.enrollment);
        if (globalStudent) {
          await this.updateStudentInGlobalList({
            enrollment: s.enrollment,
            roomNo: s.roomNo,
            status: s.status,
            name: s.name,
            email: s.email,
            phone: s.phone,
            parentPhone: s.parentPhone,
            course: s.course,
            academicYear: s.academicYear,
            bloodGroup: s.bloodGroup,
            aadhaar: s.aadhaar,
            address: s.address
          });
        }
      }
    }
  },
  async toggleAdminStatus(username, isActive) {
    await Admin.updateOne(
      { username: { $regex: new RegExp(`^${username}$`, 'i') } },
      { $set: { isActive } }
    );
  },

  async deleteHostelData(hostelId) {
    await Hostel.deleteOne({ id: hostelId });
    await Admin.deleteMany({ hostelId });
    await Student.deleteMany({ hostelId });
    await Tenant.deleteOne({ hostelId });
  }
};

module.exports = DB;
