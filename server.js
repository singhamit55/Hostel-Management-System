require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./database');

// Initialize Database connection
db.init();

const app = express();
const PORT = process.env.PORT || 3002;
const JWT_SECRET = process.env.JWT_SECRET || 'hms_secret_key_2026';

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Support base64 image uploads

// Serve Static Files
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/index.html', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));

// Middleware to authenticate JWT tokens
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'No authentication token provided.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token.' });
    req.user = user;
    next();
  });
}

// ── API ROUTES ──────────────────────────────────────────────────────────────

// 1. Get List of Hostels
app.get('/api/hostels', async (req, res) => {
  try {
    const hostels = await db.getHostels();
    const sanitized = hostels.map(h => ({
      id: h.id,
      name: h.name,
      address: h.address,
      accessCode: h.accessCode,
      wardenName: h.wardenName,
      wardenTitle: h.wardenTitle
    }));
    res.json(sanitized);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2. Register a New Hostel & Warden
app.post('/api/auth/register-hostel', async (req, res) => {
  try {
    const {
      wardenName, wardenTitle, adminUsername, adminPassword,
      hostelName, hostelAddress, totalRooms, roomConfig,
      acType, blocks, accessCode
    } = req.body;

    if (!adminUsername || !adminPassword || !hostelName || !accessCode) {
      return res.status(400).json({ error: 'Missing required registration details.' });
    }

    const existingAdmin = await db.findAdmin(adminUsername);
    if (existingAdmin) {
      return res.status(400).json({ error: 'Admin username is already taken.' });
    }

    const existingHostel = await db.getHostelByCode(accessCode);
    if (existingHostel) {
      return res.status(400).json({ error: 'Hostel access code is already registered.' });
    }

    const hostelId = 'hostel_' + Date.now();
    const totalRoomsVal = parseInt(totalRooms) || 120;
    const seaterVal = parseInt(roomSeater) || 2;
    const blocksList = blocks ? blocks.split(',').map(b => b.trim().toUpperCase()).filter(b => b.length > 0) : ["Main"];
    
    // Fallback if no roomConfig provided
    const config = roomConfig || { "2": totalRoomsVal };
    
    const hostelObj = {
      id: hostelId,
      name: hostelName,
      address: hostelAddress,
      accessCode: accessCode.trim().toUpperCase(),
      wardenName: wardenName,
      wardenTitle: wardenTitle,
      totalRooms: totalRoomsVal,
      calculatedRooms: totalRoomsVal, // Calculated is now just totalRooms
      roomConfig: config,
      acType: acType,
      blocks: blocksList.join(', ')
    };

    const newRooms = [];
    const floorCapacity = 10;
    
    Object.keys(config).forEach(seaterType => {
      const count = parseInt(config[seaterType]) || 0;
      if (count > 0) {
        const roomsPerBlock = Math.ceil(count / blocksList.length);
        blocksList.forEach(block => {
          const limit = roomsPerBlock;
          for (let r = 1; r <= limit; r++) {
            // Stop generating if we hit the global count for this seater type
            if (newRooms.filter(rm => rm.capacity === parseInt(seaterType)).length >= count) break;
            
            const floor = Math.floor((r - 1) / floorCapacity) + 1;
            const roomNoVal = `${parseInt(seaterType)}${floor * 100 + ((r - 1) % floorCapacity) + 1}`;
            newRooms.push({
              roomNo: roomNoVal,
              block: block,
              floor: `${floor}${floor === 1 ? 'st' : floor === 2 ? 'nd' : floor === 3 ? 'rd' : 'th'} Floor`,
              capacity: parseInt(seaterType),
              type: acType,
              occupied: 0,
              status: "Vacant"
            });
          }
        });
      }
    });

    const emergencyContacts = [
      { name: "Warden Office", number: "+91 98765 99999", role: "Primary Warden" },
      { name: "Emergency Hospital", number: "+91 98765 88888", role: "Ambulance/Medical" },
      { name: "Campus Security", number: "+91 98765 77777", role: "24/7 Security" }
    ];
    const hostelRules = [
      "Curfew timing is strictly 10:00 PM. Late entries are subject to fine penalties.",
      "Mess timings must be followed. Food will not be served after closing.",
      "Cleanliness of rooms and common washrooms is a shared responsibility."
    ];

    await db.createHostel(hostelObj, newRooms, emergencyContacts, hostelRules);

    const adminObj = {
      username: adminUsername,
      password: adminPassword,
      hostelId: hostelId,
      name: wardenName,
      title: wardenTitle
    };
    await db.createAdmin(adminObj);

    res.json({ success: true, message: 'Hostel and Admin account registered successfully!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 3. User Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { role, username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required.' });

    if (role === 'owner') {
      const owner = await db.findOwner(username);
      if (!owner) return res.status(401).json({ error: 'Owner account not found.' });

      const matches = bcrypt.compareSync(password, owner.passwordHash);
      if (!matches) return res.status(401).json({ error: 'Invalid owner credentials.' });

      const token = jwt.sign(
        { role: 'owner', username: owner.username },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.json({ success: true, token, role: 'owner', name: owner.name });
    } else if (role === 'admin') {
      const admin = await db.findAdmin(username);
      if (!admin) return res.status(401).json({ error: 'Admin account not found.' });

      if (admin.isActive === false) {
        return res.status(403).json({ error: 'Admin account has been disabled by the Owner.' });
      }

      const matches = bcrypt.compareSync(password, admin.passwordHash);
      if (!matches) return res.status(401).json({ error: 'Invalid admin credentials.' });

      const token = jwt.sign(
        { role: 'admin', username: admin.username, hostelId: admin.hostelId },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.json({ success: true, token, role: 'admin', hostelId: admin.hostelId, name: admin.name, paymentStatus: admin.paymentStatus || 'Pending' });
    } else {
      const student = await db.findStudent(username);

      if (student) {
        let matches = false;
        if (student.passwordHash) {
          matches = bcrypt.compareSync(password, student.passwordHash);
        } else if (student.password) {
          matches = (student.password === password);
        }
        if (!matches) return res.status(401).json({ error: 'Invalid student password.' });

        if (student.status !== 'Approved') {
          return res.status(403).json({
            error: `Your registration application is currently ${student.status.toUpperCase()}.`,
            status: student.status
          });
        }

        const token = jwt.sign(
          { role: 'student', enrollment: student.enrollment, hostelId: student.hostelId },
          JWT_SECRET,
          { expiresIn: '7d' }
        );

        return res.json({ success: true, token, role: 'student', enrollment: student.enrollment, hostelId: student.hostelId, name: student.name });
      } else {
        const hostels = await db.getHostels();
        let foundApp = null;
        for (const h of hostels) {
          const tenantData = await db.getTenantData(h.id);
          const apps = tenantData.registration_applications || [];
          const app = apps.find(a => a.enrollment.toLowerCase() === username.toLowerCase());
          if (app) { foundApp = app; break; }
        }

        if (foundApp) {
          return res.status(403).json({
            error: `Your application status is: ${foundApp.status.toUpperCase()}`,
            status: foundApp.status,
            appliedDate: foundApp.appliedDate,
            id: foundApp.id
          });
        }
        return res.status(404).json({ error: 'Account not registered. Please register first.' });
      }
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 3b. Forgot Password
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { role, identifier, email, wardenName } = req.body;

    if (role === 'admin') {
      if (!identifier || !wardenName) return res.status(400).json({ error: 'Username and Warden Name are required.' });
      const admin = await db.findAdmin(identifier);
      if (!admin || admin.name.toLowerCase() !== wardenName.toLowerCase()) {
        return res.status(404).json({ error: 'Admin account not found or details mismatch.' });
      }

      const tempPassword = 'Admin@' + Math.floor(1000 + Math.random() * 9000);
      const newHash = bcrypt.hashSync(tempPassword, 10);
      await db.updateAdminPassword(admin.username, newHash);

      return res.json({ success: true, message: `Simulated Email Sent! Your temporary password is: ${tempPassword}` });
    } else {
      if (!identifier || !email) return res.status(400).json({ error: 'Enrollment Number and Email are required.' });
      const student = await db.findStudent(identifier);
      if (!student || student.email.toLowerCase() !== email.toLowerCase()) {
        return res.status(404).json({ error: 'Student account not found or email mismatch.' });
      }

      const tempPassword = 'Student@' + Math.floor(1000 + Math.random() * 9000);
      const newHash = bcrypt.hashSync(tempPassword, 10);

      await db.updateStudentInGlobalList({
        enrollment: student.enrollment,
        passwordHash: newHash,
        password: tempPassword
      });

      if (student.hostelId && student.status === 'Approved') {
        const tenantData = await db.getTenantData(student.hostelId);
        const students = tenantData.students || [];
        const tenantStudIdx = students.findIndex(s => s.enrollment.toLowerCase() === student.enrollment.toLowerCase());
        if (tenantStudIdx !== -1) {
          students[tenantStudIdx].password = tempPassword;
          await db.saveTenantData(student.hostelId, 'students', students);
        }
      } else {
        const hostels = await db.getHostels();
        for (const h of hostels) {
          const tenantData = await db.getTenantData(h.id);
          const apps = tenantData.registration_applications || [];
          const appIdx = apps.findIndex(a => a.enrollment.toLowerCase() === student.enrollment.toLowerCase());
          if (appIdx !== -1) {
            apps[appIdx].password = tempPassword;
            await db.saveTenantData(h.id, 'registration_applications', apps);
            break;
          }
        }
      }
      return res.json({ success: true, message: `Simulated Email Sent to ${email}! Your temporary password is: ${tempPassword}` });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 3c. Owner Endpoints
app.get('/api/owner/admins', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'owner') return res.status(403).json({ error: 'Owner access required.' });
    const admins = await db.getAdmins();
    const sanitized = admins.map(a => ({
      username: a.username,
      name: a.name,
      title: a.title,
      hostelId: a.hostelId,
      isActive: a.isActive !== false
    }));
    res.json(sanitized);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/owner/toggle-admin', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'owner') return res.status(403).json({ error: 'Owner access required.' });
    const { username, isActive } = req.body;
    if (!username) return res.status(400).json({ error: 'Username is required.' });

    await db.toggleAdminStatus(username, isActive);
    res.json({ success: true, message: `Admin ${username} is now ${isActive ? 'enabled' : 'disabled'}.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 4. Student Registration Application
app.post('/api/auth/register-student', async (req, res) => {
  try {
    const studentData = req.body;
    const accessCode = (studentData.accessCode || '').trim().toUpperCase();

    if (!accessCode) return res.status(400).json({ error: 'Hostel access code is required.' });

    const hostel = await db.getHostelByCode(accessCode);
    if (!hostel) return res.status(400).json({ error: 'Invalid Hostel Access Code. Verification failed.' });

    const existingStudent = await db.findStudent(studentData.enrollment);
    if (existingStudent) return res.status(400).json({ error: 'This enrollment number is already registered.' });

    const newStudent = {
      enrollment: studentData.enrollment,
      password: studentData.password,
      passwordHash: bcrypt.hashSync(studentData.password, 10),
      hostelId: hostel.id,
      name: studentData.name,
      email: studentData.email,
      phone: studentData.phone,
      parentPhone: studentData.parentPhone,
      course: studentData.course,
      academicYear: studentData.academicYear,
      bloodGroup: studentData.bloodGroup,
      aadhaar: studentData.aadhaar,
      address: studentData.address,
      status: 'Pending'
    };
    await db.createStudent(newStudent);

    const tenantData = await db.getTenantData(hostel.id);
    const apps = tenantData.registration_applications || [];

    const newApp = {
      id: 'APP-' + (1000 + apps.length + 1),
      enrollment: studentData.enrollment,
      name: studentData.name,
      email: studentData.email,
      phone: studentData.phone,
      parentPhone: studentData.parentPhone,
      course: studentData.course,
      academicYear: studentData.academicYear,
      bloodGroup: studentData.bloodGroup,
      aadhaar: studentData.aadhaar,
      address: studentData.address,
      password: studentData.password,
      status: 'Pending',
      appliedDate: new Date().toISOString().split('T')[0]
    };

    apps.push(newApp);
    await db.saveTenantData(hostel.id, 'registration_applications', apps);

    res.json({ success: true, message: 'Registration application submitted successfully!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 5. Fetch Full Tenant Data
app.get('/api/hostel/data', authenticateToken, async (req, res) => {
  try {
    const { hostelId } = req.user;
    const raw = await db.getTenantData(hostelId);

    const defaults = {
      food_menu: { breakfast: "", lunch: "", eveningSnack: "", dinner: "" },
      rooms: [], attendance: [], notices: [], complaints: [], fines: [],
      leave_applications: [], visitor_register: [],
      settings: { darkMode: false, language: "en", notifications: { foodMenu: true, complaints: true, leaves: true, fines: true } },
      emergency_contacts: [], events: [], feedback: [], registration_applications: [], hostel_rules: [], students: []
    };
    const data = Object.assign({}, defaults, raw);

    const hostel = await db.getHostelById(hostelId);
    if (hostel) {
      data.hostel_info = {
        id: hostel.id, name: hostel.name, address: hostel.address,
        wardenName: hostel.wardenName, wardenTitle: hostel.wardenTitle,
        accessCode: hostel.accessCode, totalRooms: hostel.totalRooms,
        roomSeater: hostel.roomSeater, acType: hostel.acType, blocks: hostel.blocks
      };
    }
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 6. Save a Tenant Key
app.post('/api/hostel/save-key', authenticateToken, async (req, res) => {
  try {
    const { hostelId } = req.user;
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ error: 'Database key is required.' });

    await db.saveTenantData(hostelId, key, value);
    res.json({ success: true, message: `Key '${key}' updated successfully on server.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 7a. Approve Application
app.post('/api/hostel/approve-application', authenticateToken, async (req, res) => {
  try {
    const { hostelId, role } = req.user;
    if (role !== 'admin') return res.status(403).json({ error: 'Admin access required.' });

    const { appId } = req.body;
    if (!appId) return res.status(400).json({ error: 'Application ID is required.' });

    const tenantData = await db.getTenantData(hostelId);
    const apps = tenantData.registration_applications || [];
    const appIdx = apps.findIndex(a => a.id === appId);
    if (appIdx === -1) return res.status(404).json({ error: 'Application not found.' });

    const app = apps[appIdx];
    apps[appIdx].status = 'Approved';
    await db.saveTenantData(hostelId, 'registration_applications', apps);

    const rooms = tenantData.rooms || [];
    let allocatedRoom = rooms.find(r => r.occupied < r.capacity);
    if (!allocatedRoom) {
      allocatedRoom = { roomNo: '103', block: 'A', floor: '1st Floor' };
    } else {
      allocatedRoom.occupied++;
      allocatedRoom.status = allocatedRoom.occupied >= allocatedRoom.capacity ? 'Fully Occupied' : 'Partially Occupied';
      await db.saveTenantData(hostelId, 'rooms', rooms);
    }

    const students = tenantData.students || [];
    const existingStudIdx = students.findIndex(s => s.enrollment.toLowerCase() === app.enrollment.toLowerCase());
    const globalStudent = await db.findStudent(app.enrollment);

    const studentObj = {
      enrollment: app.enrollment,
      name: app.name, email: app.email, phone: app.phone, parentPhone: app.parentPhone,
      course: app.course, academicYear: app.academicYear || app.year || '',
      year: app.academicYear || app.year || '', bloodGroup: app.bloodGroup,
      aadhaar: app.aadhaar, address: app.address, photo: app.photo || '',
      roomNo: allocatedRoom.roomNo, block: allocatedRoom.block, hostelId: hostelId,
      password: app.password || (globalStudent ? globalStudent.password : ''),
      status: 'Approved'
    };

    if (existingStudIdx !== -1) {
      students[existingStudIdx] = { ...students[existingStudIdx], ...studentObj };
    } else {
      students.push(studentObj);
    }
    await db.saveTenantData(hostelId, 'students', students);
    await db.updateStudentInGlobalList({ enrollment: app.enrollment, status: 'Approved', roomNo: allocatedRoom.roomNo });

    res.json({
      success: true,
      message: `Application approved. ${app.name} admitted to Room ${allocatedRoom.block}-${allocatedRoom.roomNo}.`,
      roomNo: allocatedRoom.roomNo,
      block: allocatedRoom.block
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 7b. Reject Application
app.post('/api/hostel/reject-application', authenticateToken, async (req, res) => {
  try {
    const { hostelId, role } = req.user;
    if (role !== 'admin') return res.status(403).json({ error: 'Admin access required.' });

    const { appId, transferTo, transferReason } = req.body;
    if (!appId) return res.status(400).json({ error: 'Application ID is required.' });

    const tenantData = await db.getTenantData(hostelId);
    const apps = tenantData.registration_applications || [];
    const appIdx = apps.findIndex(a => a.id === appId);
    if (appIdx === -1) return res.status(404).json({ error: 'Application not found.' });

    const app = apps[appIdx];
    apps[appIdx].status = 'Rejected';
    if (transferTo) {
      apps[appIdx].transferTo = transferTo;
      apps[appIdx].transferReason = transferReason || 'Redirected to another hostel.';
    }
    await db.saveTenantData(hostelId, 'registration_applications', apps);
    await db.updateStudentInGlobalList({ enrollment: app.enrollment, status: 'Rejected' });

    res.json({ success: true, message: `Application for ${app.name} has been rejected.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 7. Change Password
app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { role, username, enrollment, hostelId } = req.user;

    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both current and new passwords are required.' });

    if (role === 'admin') {
      const admin = await db.findAdmin(username);
      if (!admin) return res.status(404).json({ error: 'Admin account not found.' });

      const matches = bcrypt.compareSync(currentPassword, admin.passwordHash);
      if (!matches) return res.status(400).json({ error: 'Incorrect current password.' });

      const newHash = bcrypt.hashSync(newPassword, 10);
      await db.updateAdminPassword(username, newHash);

      return res.json({ success: true, message: 'Admin password changed successfully!' });
    } else {
      const student = await db.findStudent(enrollment);
      if (!student) return res.status(404).json({ error: 'Student account not found.' });

      const matches = bcrypt.compareSync(currentPassword, student.passwordHash);
      if (!matches) return res.status(400).json({ error: 'Incorrect current password.' });

      const newHash = bcrypt.hashSync(newPassword, 10);
      await db.updateStudentInGlobalList({
        enrollment: student.enrollment,
        passwordHash: newHash,
        password: newPassword
      });

      const tenantData = await db.getTenantData(hostelId);
      const students = tenantData.students || [];
      const tenantStudIdx = students.findIndex(s => s.enrollment.toLowerCase() === enrollment.toLowerCase());
      if (tenantStudIdx !== -1) {
        students[tenantStudIdx].password = newPassword;
        await db.saveTenantData(hostelId, 'students', students);
      }

      return res.json({ success: true, message: 'Student password changed successfully!' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(` Hostel Management System Multi-Tenant Server`);
  console.log(` Running on: http://localhost:${PORT}`);
  console.log(`==================================================`);
});
