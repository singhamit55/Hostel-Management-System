/**
 * app.js - Single Page Application Core Controller
 * Manages view routing, themes, user roles, state mutations, and component rendering.
 */

// Redirect API calls to backend port 3000. If backend is offline, switch to Local Autopilot Mode using LocalStorage.
(function () {
  const originalFetch = window.fetch;
  window.fetch = async function (input, init) {
    if (typeof input === "string" && input.startsWith("/api/")) {
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const isBackendOrigin = window.location.port === "3000" || !isLocalhost;
      const apiBase = isBackendOrigin ? "" : "http://localhost:3000";
      const targetUrl = apiBase + input;

      try {
        const response = await originalFetch(targetUrl, init);
        return response;
      } catch (networkError) {
        console.warn("⚠️ Backend server connection failed. Switching to Local Autopilot (Offline Mock Mode).", networkError);

        const urlObj = new URL(targetUrl, window.location.origin);
        const path = urlObj.pathname;
        const method = (init && init.method ? init.method : "GET").toUpperCase();
        let body = {};
        if (init && init.body) {
          try { body = JSON.parse(init.body); } catch (e) { }
        }

        const mockResponse = (status, data) => {
          return new Response(JSON.stringify(data), {
            status: status,
            headers: { "Content-Type": "application/json" }
          });
        };

        // --- Mock Routes ---
        if (path === "/api/auth/register-hostel" && method === "POST") {
          const { wardenName, wardenTitle, adminUsername, adminPassword, hostelName, hostelAddress, totalRooms, roomSeater, acType, blocks, roomsPerBlock, accessCode } = body;

          const hostelObj = {
            id: 'hostel_demo',
            name: hostelName,
            address: hostelAddress,
            accessCode: accessCode.trim().toUpperCase(),
            wardenName: wardenName,
            wardenTitle: wardenTitle,
            totalRooms: parseInt(totalRooms) || 120,
            roomSeater: parseInt(roomSeater) || 2,
            acType: acType || 'AC',
            blocks: blocks || 'A, B, C',
            calculatedRooms: parseInt(totalRooms) || 120
          };
          localStorage.setItem("hms_hostel_info", JSON.stringify(hostelObj));

          const admins = JSON.parse(localStorage.getItem("hms_admins") || "[]");
          if (!admins.some(a => a.username.toLowerCase() === adminUsername.toLowerCase())) {
            admins.push({ username: adminUsername, password: adminPassword, hostelId: 'hostel_demo', name: wardenName, title: wardenTitle });
            localStorage.setItem("hms_admins", JSON.stringify(admins));
          }

          // Generate rooms
          const blocksList = blocks ? blocks.split(',').map(b => b.trim().toUpperCase()).filter(b => b.length > 0) : ["A", "B", "C"];
          const rooms = [];
          blocksList.forEach(block => {
            const floorCapacity = 10;
            const limit = roomsPerBlock ? parseInt(roomsPerBlock) : 40;
            for (let r = 1; r <= limit; r++) {
              const floor = Math.floor((r - 1) / floorCapacity) + 1;
              const roomNoVal = `${floor * 100 + ((r - 1) % floorCapacity) + 1}`;
              rooms.push({
                roomNo: roomNoVal,
                block: block,
                floor: `${floor}${floor === 1 ? 'st' : floor === 2 ? 'nd' : floor === 3 ? 'rd' : 'th'} Floor`,
                capacity: parseInt(roomSeater) || 2,
                occupied: 0,
                status: "Vacant",
                type: acType || 'AC'
              });
            }
          });
          localStorage.setItem("hms_rooms", JSON.stringify(rooms));

          // Seed default collections
          localStorage.setItem("hms_emergency_contacts", JSON.stringify([
            { name: "Warden Office", number: "+91 98765 99999", role: "Primary Warden" },
            { name: "Emergency Hospital", number: "+91 98765 88888", role: "Ambulance/Medical" },
            { name: "Campus Security", number: "+91 98765 77777", role: "24/7 Security" }
          ]));
          localStorage.setItem("hms_hostel_rules", JSON.stringify([
            "Curfew timing is strictly 10:00 PM. Late entries are subject to fine penalties.",
            "Mess timings must be followed. Food will not be served after closing.",
            "Cleanliness of rooms and common washrooms is a shared responsibility."
          ]));
          localStorage.setItem("hms_food_menu", JSON.stringify({
            Monday: { breakfast: "Poha, Milk, Sprouts", lunch: "Rice, Dal, Seasonal Sabji, Roti, Salad", eveningSnack: "Tea, Veg Sandwich, Biscuits", dinner: "Roti, Paneer Butter Masala, Dal Tadka, Sweet" },
            Tuesday: { breakfast: "Idli Sambar", lunch: "Rajma Chawal", eveningSnack: "Coffee, Cookies", dinner: "Aloo Paratha, Curd" },
            Wednesday: { breakfast: "Aloo Puri", lunch: "Chole Bhature", eveningSnack: "Tea, Samosa", dinner: "Paneer Bhurji, Roti" },
            Thursday: { breakfast: "Upma", lunch: "Kadhi Pakora, Rice", eveningSnack: "Tea, Rusks", dinner: "Mix Veg, Roti, Dal" },
            Friday: { breakfast: "Poha", lunch: "Dal Makhani, Jeera Rice", eveningSnack: "Juice, Chips", dinner: "Egg Curry / Malai Kofta, Roti" },
            Saturday: { breakfast: "Uttapam", lunch: "Aloo Gobi, Roti, Dal", eveningSnack: "Tea, Kachori", dinner: "Chicken Curry / Shahi Paneer, Roti" },
            Sunday: { breakfast: "Masala Dosa", lunch: "Veg Biryani, Raita", eveningSnack: "Tea, Cake", dinner: "Puri Sabji, Halwa" }
          }));
          localStorage.setItem("hms_attendance", JSON.stringify([]));
          localStorage.setItem("hms_notices", JSON.stringify([]));
          localStorage.setItem("hms_complaints", JSON.stringify([]));
          localStorage.setItem("hms_fines", JSON.stringify([]));
          localStorage.setItem("hms_leave_applications", JSON.stringify([]));
          localStorage.setItem("hms_visitor_register", JSON.stringify([]));
          localStorage.setItem("hms_registration_applications", JSON.stringify([]));
          localStorage.setItem("hms_students", JSON.stringify([]));

          return mockResponse(200, { success: true, message: "Hostel and Admin account registered successfully!" });
        }

        if (path === "/api/auth/register-student" && method === "POST") {
          const { accessCode, enrollment, name, email, phone, parentPhone, course, academicYear, bloodGroup, idType, aadhaar, address, photo, aadhaarDoc, password } = body;

          const hostelInfo = JSON.parse(localStorage.getItem("hms_hostel_info") || "{}");
          if (!hostelInfo.accessCode || hostelInfo.accessCode.toUpperCase() !== accessCode.toUpperCase()) {
            return mockResponse(400, { error: "Invalid Hostel Access Code. Verification failed." });
          }

          const students = JSON.parse(localStorage.getItem("hms_students") || "[]");
          if (students.some(s => s.enrollment.toUpperCase() === enrollment.toUpperCase())) {
            return mockResponse(400, { error: "This enrollment number is already registered." });
          }

          const apps = JSON.parse(localStorage.getItem("hms_registration_applications") || "[]");
          const newApp = {
            id: 'APP-' + (1000 + apps.length + 1),
            enrollment, name, email, phone, parentPhone, course, academicYear, bloodGroup, idType, aadhaar, address, photo, aadhaarDoc, password,
            status: 'Pending',
            appliedDate: new Date().toISOString().split('T')[0]
          };
          apps.push(newApp);
          localStorage.setItem("hms_registration_applications", JSON.stringify(apps));

          return mockResponse(200, { success: true, message: "Registration application submitted successfully!" });
        }

        if (path === "/api/auth/login" && method === "POST") {
          const { role, username, password } = body;
          if (role === 'admin') {
            const admins = JSON.parse(localStorage.getItem("hms_admins") || "[]");
            const admin = admins.find(a => a.username.toLowerCase() === username.toLowerCase() && a.password === password);
            if (admin) {
              if (admin.isActive === false) {
                return mockResponse(403, { error: "Admin account has been disabled by the Owner." });
              }
              return mockResponse(200, { success: true, role: 'admin', token: 'mock_token_admin', hostelId: 'hostel_demo', name: admin.name, paymentStatus: admin.paymentStatus || 'Pending' });
            }
            return mockResponse(401, { error: "Invalid admin credentials. Please register your hostel first." });
          } else if (role === 'owner') {
            if (username === 'singh321' && password === 'password') {
              return mockResponse(200, { success: true, role: 'owner', token: 'mock_token_owner', name: 'System Owner' });
            }
            return mockResponse(401, { error: "Invalid owner credentials." });
          } else {
            const students = JSON.parse(localStorage.getItem("hms_students") || "[]");
            const student = students.find(s => s.enrollment.toLowerCase() === username.toLowerCase() && s.password === password);
            if (student) {
              if (student.status !== 'Approved') {
                return mockResponse(403, { error: "Your registration application is pending or rejected.", status: student.status });
              }
              return mockResponse(200, { success: true, role: 'student', token: 'mock_token_student', enrollment: student.enrollment, hostelId: 'hostel_demo', name: student.name });
            }

            const apps = JSON.parse(localStorage.getItem("hms_registration_applications") || "[]");
            const app = apps.find(a => a.enrollment.toLowerCase() === username.toLowerCase());
            if (app) {
              return mockResponse(403, { error: `Your application status is: ${app.status.toUpperCase()}`, status: app.status });
            }

            return mockResponse(404, { error: "Account not registered. Please register first." });
          }
        }

        if (path === "/api/hostel/data" && method === "GET") {
          const data = {
            food_menu: JSON.parse(localStorage.getItem("hms_food_menu") || "{}"),
            rooms: JSON.parse(localStorage.getItem("hms_rooms") || "[]"),
            attendance: JSON.parse(localStorage.getItem("hms_attendance") || "[]"),
            notices: JSON.parse(localStorage.getItem("hms_notices") || "[]"),
            complaints: JSON.parse(localStorage.getItem("hms_complaints") || "[]"),
            fines: JSON.parse(localStorage.getItem("hms_fines") || "[]"),
            leave_applications: JSON.parse(localStorage.getItem("hms_leave_applications") || "[]"),
            visitor_register: JSON.parse(localStorage.getItem("hms_visitor_register") || "[]"),
            settings: JSON.parse(localStorage.getItem("hms_settings") || "{}"),
            emergency_contacts: JSON.parse(localStorage.getItem("hms_emergency_contacts") || "[]"),
            events: JSON.parse(localStorage.getItem("hms_events") || "[]"),
            feedback: JSON.parse(localStorage.getItem("hms_feedback") || "[]"),
            registration_applications: JSON.parse(localStorage.getItem("hms_registration_applications") || "[]"),
            hostel_rules: JSON.parse(localStorage.getItem("hms_hostel_rules") || "[]"),
            students: JSON.parse(localStorage.getItem("hms_students") || "[]")
          };
          const hostelInfo = JSON.parse(localStorage.getItem("hms_hostel_info"));
          if (hostelInfo) { data.hostel_info = hostelInfo; }
          return mockResponse(200, data);
        }

        if (path === "/api/hostel/save-key" && method === "POST") {
          const { key, value } = body;
          localStorage.setItem("hms_" + key, JSON.stringify(value));
          return mockResponse(200, { success: true, message: `Key ${key} saved locally.` });
        }

        if (path === "/api/hostel/approve-application" && method === "POST") {
          const { appId } = body;
          const apps = JSON.parse(localStorage.getItem("hms_registration_applications") || "[]");
          const appIdx = apps.findIndex(a => a.id === appId);
          if (appIdx === -1) return mockResponse(404, { error: "Application not found." });

          apps[appIdx].status = 'Approved';
          localStorage.setItem("hms_registration_applications", JSON.stringify(apps));

          const app = apps[appIdx];
          const rooms = JSON.parse(localStorage.getItem("hms_rooms") || "[]");
          let allocatedRoom = rooms.find(r => r.occupied < r.capacity);
          if (!allocatedRoom) {
            allocatedRoom = { roomNo: '103', block: 'A', floor: '1st Floor' };
          } else {
            allocatedRoom.occupied++;
            allocatedRoom.status = allocatedRoom.occupied >= allocatedRoom.capacity ? 'Fully Occupied' : 'Partially Occupied';
            localStorage.setItem("hms_rooms", JSON.stringify(rooms));
          }

          const students = JSON.parse(localStorage.getItem("hms_students") || "[]");
          const studentObj = {
            enrollment: app.enrollment,
            name: app.name,
            email: app.email,
            phone: app.phone,
            parentPhone: app.parentPhone,
            course: app.course,
            year: app.academicYear || app.year,
            bloodGroup: app.bloodGroup,
            aadhaar: app.aadhaar,
            address: app.address,
            roomNo: allocatedRoom.roomNo,
            block: allocatedRoom.block,
            hostelId: 'hostel_demo',
            password: app.password,
            status: 'Approved'
          };
          students.push(studentObj);
          localStorage.setItem("hms_students", JSON.stringify(students));

          return mockResponse(200, { success: true, message: "Application approved successfully.", roomNo: allocatedRoom.roomNo, block: allocatedRoom.block });
        }

        if (path === "/api/hostel/reject-application" && method === "POST") {
          const { appId } = body;
          const apps = JSON.parse(localStorage.getItem("hms_registration_applications") || "[]");
          const appIdx = apps.findIndex(a => a.id === appId);
          if (appIdx === -1) return mockResponse(404, { error: "Application not found." });

          apps[appIdx].status = 'Rejected';
          localStorage.setItem("hms_registration_applications", JSON.stringify(apps));

          return mockResponse(200, { success: true, message: "Application rejected." });
        }

        if (path === "/api/auth/change-password" && method === "POST") {
          const { newPassword } = body;
          const session = JSON.parse(sessionStorage.getItem("hms_session") || "{}");
          if (session.role === 'admin') {
            const admins = JSON.parse(localStorage.getItem("hms_admins") || "[]");
            admins.forEach(a => a.password = newPassword);
            localStorage.setItem("hms_admins", JSON.stringify(admins));
          } else {
            const students = JSON.parse(localStorage.getItem("hms_students") || "[]");
            const student = students.find(s => s.enrollment === session.enrollment);
            if (student) {
              student.password = newPassword;
              localStorage.setItem("hms_students", JSON.stringify(students));
            }
          }
          return mockResponse(200, { success: true, message: "Password changed successfully locally!" });
        }

        if (path === "/api/owner/admins" && method === "GET") {
          const admins = JSON.parse(localStorage.getItem("hms_admins") || "[]");
          const sanitized = admins.map(a => ({
            username: a.username,
            name: a.name,
            hostelId: a.hostelId || 'hostel_demo',
            isActive: a.isActive !== false,
            paymentStatus: a.paymentStatus || 'Pending'
          }));
          return mockResponse(200, sanitized);
        }

        if (path === "/api/owner/toggle-admin" && method === "POST") {
          const { username, isActive } = body;
          const admins = JSON.parse(localStorage.getItem("hms_admins") || "[]");
          const adminIdx = admins.findIndex(a => a.username === username);
          if (adminIdx !== -1) {
            admins[adminIdx].isActive = isActive;
            localStorage.setItem("hms_admins", JSON.stringify(admins));
            return mockResponse(200, { success: true, message: `Admin ${username} is now ${isActive ? 'enabled' : 'disabled'}.` });
          }
          return mockResponse(404, { error: "Admin not found." });
        }

        if (path === "/api/owner/hostels" && method === "GET") {
          const hStr = localStorage.getItem("hms_hostel_info");
          const hostels = hStr ? [JSON.parse(hStr)] : [];
          const students = JSON.parse(localStorage.getItem("hms_students") || "[]");
          const enriched = hostels.map(h => ({
            ...h,
            totalStudents: students.filter(s => s.hostelId === h.id || !s.hostelId).length
          }));
          return mockResponse(200, enriched);
        }

        if (path.startsWith("/api/owner/hostels/") && method === "DELETE") {
          return mockResponse(200, { success: true, message: 'Hostel and associated data deleted successfully.' });
        }

        if (path === "/api/owner/update-payment" && method === "POST") {
          const { username, paymentStatus } = body;
          const admins = JSON.parse(localStorage.getItem("hms_admins") || "[]");
          const adminIdx = admins.findIndex(a => a.username === username);
          if (adminIdx !== -1) {
            admins[adminIdx].paymentStatus = paymentStatus;
            localStorage.setItem("hms_admins", JSON.stringify(admins));
            return mockResponse(200, { success: true, message: `Payment status updated to ${paymentStatus}.` });
          }
          return mockResponse(404, { error: 'Admin not found.' });
        }

        if (path === "/api/owner/bank-details" && method === "POST") {
          localStorage.setItem("hms_owner_bank_details", JSON.stringify(body.bankDetails));
          return mockResponse(200, { success: true, message: 'Bank details updated successfully.' });
        }

        if (path === "/api/owner/bank-details" && method === "GET") {
          const details = JSON.parse(localStorage.getItem("hms_owner_bank_details") || "{}");
          return mockResponse(200, details);
        }

        if (path === "/api/owner/global-notice" && method === "POST") {
          const notices = JSON.parse(localStorage.getItem("hms_global_notices") || "[]");
          notices.push({
            id: 'GN-' + Date.now(),
            title: body.title,
            message: body.message,
            date: new Date().toISOString().split('T')[0]
          });
          localStorage.setItem("hms_global_notices", JSON.stringify(notices));
          return mockResponse(200, { success: true, message: 'Global notice sent successfully.' });
        }

        if (path === "/api/global-notices" && method === "GET") {
          const notices = JSON.parse(localStorage.getItem("hms_global_notices") || "[]");
          return mockResponse(200, notices.reverse());
        }

        return mockResponse(404, { error: "Mock Route not found." });
      }
    }
    return originalFetch(input, init);
  };
})();

// Current Session Info
let currentStudentEnrollment = "";
let currentRole = "";
let attendanceChartInstance = null;

let listenersInitialized = false;
let currentLoginRole = "student"; // default login role state

// Global Event Listeners & Bootstrapping
document.addEventListener("DOMContentLoaded", () => {
  initApp();
});

// Update ID label/placeholder when student switches ID type
window.updateIdPlaceholder = function () {
  const idType = document.getElementById("reg-id-type")?.value;
  const label = document.getElementById("reg-id-label");
  const input = document.getElementById("reg-aadhaar");
  if (!label || !input) return;

  const config = {
    "Aadhaar": { label: "Aadhaar Number", placeholder: "e.g. 1234-5678-9012" },
    "Passport": { label: "Passport Number", placeholder: "e.g. A1234567" },
    "Citizenship": { label: "Citizenship Number", placeholder: "e.g. 123456-78901" },
    "VoterID": { label: "Voter ID Number", placeholder: "e.g. ABC1234567" },
    "DrivingLicense": { label: "Driving License Number", placeholder: "e.g. DL-0420110012345" }
  };
  const c = config[idType] || { label: "ID Number", placeholder: "Enter ID number" };
  label.textContent = c.label;
  input.placeholder = c.placeholder;
};


function initApp() {
  syncTheme();
  setupLoginHandlers();

  // Dynamic brand name and background updates
  const hostelInfo = DB.get("hostel_info");
  const sidebarBrand = document.getElementById("sidebar-brand-name");
  const loginTitle = document.getElementById("login-title-text");
  const loginContainer = document.getElementById("login-container");

  if (sidebarBrand && hostelInfo && hostelInfo.name) {
    sidebarBrand.textContent = hostelInfo.name;
    document.title = `${hostelInfo.name} - HMS`;
  } else if (sidebarBrand) {
    sidebarBrand.textContent = "Hostel Management System";
    document.title = "Hostel Management System";
  }

  if (loginTitle && hostelInfo && hostelInfo.name) {
    loginTitle.textContent = `${hostelInfo.name} Portal`;
  } else if (loginTitle) {
    loginTitle.textContent = "Hostel Management System";
  }

  if (checkSession()) {
    // Show App layout, hide login
    document.getElementById("login-container").style.display = "none";
    document.getElementById("app-container").style.display = "flex";

    renderHeader();
    renderSidebarForRole();
    routeTo("dashboard");

    if (!listenersInitialized) {
      setupNavigation();
      setupRoleSwitcher();
      setupFormSubmissions();
      setupModalHandlers();
      setupThemeToggle();
      setupQuickActions();
      initNotificationSystem();
      listenersInitialized = true;
    }

    renderAllViews();
    fetchAndRenderGlobalNotices();
    checkAdminBillingStatus();
  } else {
    // Show Login layout, hide app
    document.getElementById("login-container").style.display = "flex";
    document.getElementById("app-container").style.display = "none";

    // Set custom backside background of login page
    if (loginContainer && hostelInfo && hostelInfo.bgImage) {
      loginContainer.style.backgroundImage = `linear-gradient(rgba(15, 23, 42, 0.45), rgba(15, 23, 42, 0.45)), url(${hostelInfo.bgImage})`;
      loginContainer.style.backgroundSize = "cover";
      loginContainer.style.backgroundPosition = "center";
      loginContainer.style.backgroundAttachment = "fixed";
    } else if (loginContainer) {
      loginContainer.style.backgroundImage = "";
    }
  }
}

function checkSession() {
  try {
    const sessionStr = sessionStorage.getItem("hms_session");
    if (sessionStr) {
      const session = JSON.parse(sessionStr);
      currentRole = session.role;
      currentStudentEnrollment = session.enrollment || "";
      return true;
    }
  } catch (e) {
    console.error("Session reading error:", e);
  }
  return false;
}

function setupLoginHandlers() {
  const btnStudent = document.getElementById("login-role-student");
  const btnAdmin = document.getElementById("login-role-admin");
  const btnOwner = document.getElementById("login-role-owner");
  const usernameLabel = document.getElementById("login-username-label");
  const usernameInput = document.getElementById("login-username");
  const helpText = document.getElementById("login-help-text");
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const adminRegisterForm = document.getElementById("admin-register-form");
  const toggleWrap = document.getElementById("login-toggle-wrap");

  const reconfigCheckbox = document.getElementById("admin-reg-reconfig");
  const configFields = document.getElementById("admin-reg-config-fields");
  const configInputs = configFields ? configFields.querySelectorAll("input, select") : [];

  function updateConfigFieldsState() {
    if (!reconfigCheckbox || !configFields) return;
    if (reconfigCheckbox.checked) {
      configFields.style.display = "block";
      configInputs.forEach(i => i.required = true);
    } else {
      configFields.style.display = "none";
      configInputs.forEach(i => i.required = false);
    }
  }

  if (reconfigCheckbox) {
    reconfigCheckbox.addEventListener("change", updateConfigFieldsState);
  }

  // Form switching toggle binds
  document.addEventListener("click", (e) => {
    if (e.target.id === "btn-show-register") {
      // Switch to Register Form view
      loginForm.style.display = "none";
      document.getElementById("login-role-selector").style.display = "none";
      helpText.style.display = "none";

      if (currentLoginRole === "student") {
        registerForm.style.display = "block";
        adminRegisterForm.style.display = "none";
        document.getElementById("login-title-text").textContent = "Register Account";
        document.getElementById("login-subtitle-text").textContent = "Create your student resident profile";
      } else {
        adminRegisterForm.style.display = "block";
        registerForm.style.display = "none";
        document.getElementById("login-title-text").textContent = "Register Admin & Configure Hostel";
        document.getElementById("login-subtitle-text").textContent = "Configure Warden account and institutional hostel space";

        const existingRooms = DB.get("rooms") || [];
        if (existingRooms.length > 0) {
          if (reconfigCheckbox) {
            reconfigCheckbox.checked = false;
            reconfigCheckbox.disabled = false;
          }
        } else {
          if (reconfigCheckbox) {
            reconfigCheckbox.checked = true;
            reconfigCheckbox.disabled = true; // First run must configure
          }
        }
        updateConfigFieldsState();
      }

      toggleWrap.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-secondary);">Already have an account? <span id="btn-show-login" style="color: var(--accent-primary); font-weight: 600; cursor: pointer; text-decoration: underline;">Login Now</span></p>`;
    } else if (e.target.id === "btn-show-login") {
      // Switch back to Login Form view
      registerForm.style.display = "none";
      adminRegisterForm.style.display = "none";
      document.getElementById("login-role-selector").style.display = "flex";
      loginForm.style.display = "block";
      document.getElementById("login-title-text").textContent = "HMS Portal";
      document.getElementById("login-subtitle-text").textContent = "Hostel Management System Login";
      helpText.style.display = "block";

      const regText = currentLoginRole === "student" ? "Register Now" : "Register Warden/Hostel";
      toggleWrap.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-secondary);">Don't have an account? <span id="btn-show-register" style="color: var(--accent-primary); font-weight: 600; cursor: pointer; text-decoration: underline;">${regText}</span></p>`;
    } else if (e.target.id === "btn-show-forgot") {
      // Switch to Forgot Password view
      loginForm.style.display = "none";
      registerForm.style.display = "none";
      adminRegisterForm.style.display = "none";
      document.getElementById("login-role-selector").style.display = "none";
      helpText.style.display = "none";
      
      const forgotForm = document.getElementById("forgot-password-form");
      if (forgotForm) forgotForm.style.display = "block";
      
      document.getElementById("login-title-text").textContent = "Forgot Password";
      document.getElementById("login-subtitle-text").textContent = "Recover your account access";
      toggleWrap.innerHTML = "";
    } else if (e.target.id === "btn-back-to-login") {
      // Switch back to Login view
      const forgotForm = document.getElementById("forgot-password-form");
      if (forgotForm) forgotForm.style.display = "none";
      
      loginForm.style.display = "block";
      document.getElementById("login-role-selector").style.display = "flex";
      document.getElementById("login-title-text").textContent = "HMS Portal";
      document.getElementById("login-subtitle-text").textContent = "Hostel Management System Login";
      helpText.style.display = "block";
      
      const regText = currentLoginRole === "student" ? "Register Now" : "Register Warden/Hostel";
      toggleWrap.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-secondary);">Don't have an account? <span id="btn-show-register" style="color: var(--accent-primary); font-weight: 600; cursor: pointer; text-decoration: underline;">${regText}</span></p>`;
    }
  });

  // Login Role Tabs (Student <-> Admin <-> Owner)
  if (btnStudent && btnAdmin) {
    btnStudent.onclick = () => {
      currentLoginRole = "student";
      btnStudent.classList.add("active");
      btnAdmin.classList.remove("active");
      if (btnOwner) btnOwner.classList.remove("active");
      if (usernameLabel) usernameLabel.textContent = "Enrollment Number";
      if (usernameInput) usernameInput.placeholder = "e.g. ENR20240921";
      if (helpText) helpText.style.display = "none";
      if (toggleWrap) {
        toggleWrap.style.display = "block";
        toggleWrap.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-secondary);">Don't have an account? <span id="btn-show-register" style="color: var(--accent-primary); font-weight: 600; cursor: pointer; text-decoration: underline;">Register Now</span></p>`;
      }
    };

    btnAdmin.onclick = () => {
      currentLoginRole = "admin";
      btnAdmin.classList.add("active");
      btnStudent.classList.remove("active");
      if (btnOwner) btnOwner.classList.remove("active");
      if (usernameLabel) usernameLabel.textContent = "Admin Username";
      if (usernameInput) usernameInput.placeholder = "e.g. admin";
      if (helpText) helpText.style.display = "none";
      if (toggleWrap) {
        toggleWrap.style.display = "block";
        toggleWrap.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-secondary);">Don't have an account? <span id="btn-show-register" style="color: var(--accent-primary); font-weight: 600; cursor: pointer; text-decoration: underline;">Register Warden/Hostel</span></p>`;
      }
    };

    if (btnOwner) {
      btnOwner.onclick = () => {
        currentLoginRole = "owner";
        btnOwner.classList.add("active");
        btnStudent.classList.remove("active");
        btnAdmin.classList.remove("active");
        if (usernameLabel) usernameLabel.textContent = "Owner Username";
        if (usernameInput) usernameInput.placeholder = "e.g. owner";
        if (helpText) helpText.style.display = "none";
        if (toggleWrap) toggleWrap.style.display = "none"; // Hide registration for owners
      };
    }
  }

  // Handle Login form submit
  if (loginForm) {
    loginForm.onsubmit = (e) => {
      e.preventDefault();
      const username = usernameInput.value.trim();
      const password = document.getElementById("login-password").value;

      fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: currentLoginRole, username, password })
      })
        .then(async res => {
          const text = await res.text();
          let data = {};
          try {
            data = text ? JSON.parse(text) : {};
          } catch (e) {
            throw new Error(res.ok ? "Invalid server response" : "Server returned an error (" + res.status + ")");
          }
          if (!res.ok) {
            throw new Error(data.error || "Login failed");
          }
          return data;
        })
        .then(async (data) => {
          if (data.success) {
            const session = { role: data.role, enrollment: data.enrollment };
            sessionStorage.setItem("hms_session", JSON.stringify(session));
            sessionStorage.setItem("hms_token", data.token);

            // Pull latest tenant database from server
            const syncOk = await DB.syncFromServer();
            if (syncOk) {
              loginForm.reset();
              initApp();
            } else {
              alert("Error: Failed to sync hostel database from server. Contact admin.");
            }
          }
        })
        .catch(err => {
          alert("❌ Login Error: " + err.message);
        });
    };
  }

  // Handle Forgot Password form submit
  const forgotForm = document.getElementById("forgot-password-form");
  const forgotRole = document.getElementById("forgot-role");
  
  if (forgotRole) {
    forgotRole.addEventListener("change", (e) => {
      const isStudent = e.target.value === "student";
      document.getElementById("forgot-identifier-label").textContent = isStudent ? "Enrollment Number" : "Admin Username";
      document.getElementById("forgot-identifier").placeholder = isStudent ? "e.g. ENR20240921" : "e.g. admin";
      document.getElementById("forgot-email-label").textContent = isStudent ? "Registered Email" : "Warden Name";
      document.getElementById("forgot-email").placeholder = isStudent ? "e.g. rahul@hostel.com" : "e.g. Dr. Sanjay Kumar";
    });
  }

  if (forgotForm) {
    forgotForm.onsubmit = (e) => {
      e.preventDefault();
      const role = document.getElementById("forgot-role").value;
      const identifier = document.getElementById("forgot-identifier").value.trim();
      const emailVal = document.getElementById("forgot-email").value.trim();

      const payload = { role, identifier };
      if (role === "admin") {
        payload.wardenName = emailVal;
      } else {
        payload.email = emailVal;
      }

      fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      .then(async res => {
        const text = await res.text();
        let data = {};
        try {
          data = text ? JSON.parse(text) : {};
        } catch (err) {}
        if (!res.ok) throw new Error(data.error || "Password reset failed");
        return data;
      })
      .then(data => {
        alert("✅ " + data.message);
        document.getElementById("btn-back-to-login").click();
      })
      .catch(err => {
        alert("❌ Error: " + err.message);
      });
    };
  }

  // Helper Promise to read uploaded files as Base64 strings
  function readFileAsDataURL(file) {
    return new Promise((resolve) => {
      if (!file) resolve("");
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  }

  // Handle Register Form submit
  if (registerForm) {
    registerForm.onsubmit = (e) => {
      e.preventDefault();

      const enteredCode = (document.getElementById("reg-access-code")?.value || "").trim().toUpperCase();
      if (!enteredCode) {
        alert("🔑 Please enter the Hostel Access Code provided by your Warden.");
        return;
      }

      const name = document.getElementById("reg-name").value.trim();
      const enrollment = document.getElementById("reg-enrollment").value.trim().toUpperCase();
      const email = document.getElementById("reg-email").value.trim();
      const phone = document.getElementById("reg-phone").value.trim();
      const parent = document.getElementById("reg-parent").value.trim();
      const course = document.getElementById("reg-course").value.trim();
      const year = document.getElementById("reg-year").value;
      const bloodGroup = document.getElementById("reg-blood").value;
      const idType = document.getElementById("reg-id-type")?.value || "Aadhaar";
      const aadhaar = document.getElementById("reg-aadhaar").value.trim();
      const address = document.getElementById("reg-address").value.trim();
      const pwd = document.getElementById("reg-password").value;
      const photoInput = document.getElementById("reg-photo");
      const docInput = document.getElementById("reg-aadhaar-doc");

      if (!idType) {
        alert("Please select your Government ID type.");
        return;
      }

      // Read Profile image and document
      const photoFile = photoInput.files ? photoInput.files[0] : null;
      const docFile = docInput.files ? docInput.files[0] : null;

      Promise.all([readFileAsDataURL(photoFile), readFileAsDataURL(docFile)])
        .then(([photoBase64, docBase64]) => {
          const newApp = {
            accessCode: enteredCode,
            enrollment: enrollment,
            name: name,
            email: email,
            phone: phone,
            parentPhone: parent,
            course: course,
            academicYear: year,
            bloodGroup: bloodGroup,
            idType: idType,
            aadhaar: `${idType}: ${aadhaar}`,
            address: address,
            photo: photoBase64,
            aadhaarDoc: docBase64,
            password: pwd
          };

          fetch("/api/auth/register-student", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newApp)
          })
            .then(async res => {
              const text = await res.text();
              let data = {};
              try {
                data = text ? JSON.parse(text) : {};
              } catch (e) {
                throw new Error(res.ok ? "Invalid server response" : "Server returned an error (" + res.status + ")");
              }
              if (!res.ok) {
                throw new Error(data.error || "Registration failed");
              }
              return data;
            })
            .then(data => {
              alert(`Registration application submitted successfully!\nStatus: Pending Warden Review.`);

              // Switch back to Login view
              registerForm.reset();
              registerForm.style.display = "none";
              document.getElementById("login-role-selector").style.display = "flex";
              loginForm.style.display = "block";
              document.getElementById("login-title-text").textContent = "HMS Portal";
              document.getElementById("login-subtitle-text").textContent = "Hostel Management System Login";
              helpText.style.display = "block";
              toggleWrap.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-secondary);">Don't have an account? <span id="btn-show-register" style="color: var(--accent-primary); font-weight: 600; cursor: pointer; text-decoration: underline;">Register Now</span></p>`;

              initApp();
            })
            .catch(err => {
              alert("❌ Registration Error: " + err.message);
            });
        })
        .catch(err => {
          console.error("Error reading registration files:", err);
          alert("Error processing uploaded documents. Please try again.");
        });
    };
  }

  // Handle Admin Register Form submit
  if (adminRegisterForm) {
    adminRegisterForm.onsubmit = (e) => {
      e.preventDefault();
      const wardenName = document.getElementById("admin-reg-name").value.trim();
      const wardenTitle = document.getElementById("admin-reg-title").value.trim();
      const adminUsername = document.getElementById("admin-reg-username").value.trim();
      const adminPassword = document.getElementById("admin-reg-password").value;

      const hostelName = document.getElementById("admin-reg-hostel-name").value.trim();
      const hostelAddress = document.getElementById("admin-reg-hostel-address").value.trim();
      const accessCode = (document.getElementById("admin-reg-access-code")?.value || "").trim().toUpperCase();

      if (!accessCode) {
        alert("🔑 Please set a Hostel Access Code. Students will need this to register.");
        return;
      }

      const totalRoomsVal = parseInt(document.getElementById("admin-reg-total-rooms").value);
      const seaterVal = parseInt(document.getElementById("admin-reg-seater").value);
      const acVal = document.getElementById("admin-reg-ac").value;
      const blocksInput = document.getElementById("admin-reg-blocks").value.trim();
      const roomsPerBlockRaw = document.getElementById("admin-reg-rooms-per-block").value;
      const roomsPerBlockVal = roomsPerBlockRaw ? parseInt(roomsPerBlockRaw) : totalRoomsVal;

      const registerPayload = {
        wardenName,
        wardenTitle,
        adminUsername,
        adminPassword,
        hostelName,
        hostelAddress,
        totalRooms: totalRoomsVal,
        roomSeater: seaterVal,
        acType: acVal,
        blocks: blocksInput,
        roomsPerBlock: roomsPerBlockVal,
        accessCode
      };

      fetch("/api/auth/register-hostel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerPayload)
      })
        .then(async res => {
          const text = await res.text();
          let data = {};
          try {
            data = text ? JSON.parse(text) : {};
          } catch (e) {
            throw new Error(res.ok ? "Invalid server response" : "Server returned an error (" + res.status + ")");
          }
          if (!res.ok) {
            throw new Error(data.error || "Setup failed");
          }
          return data;
        })
        .then(data => {
          alert(`Warden registered successfully!\nHostel "${hostelName}" configured.\nYou can now log in with your Admin credentials!`);

          // Switch back to Login view
          adminRegisterForm.reset();
          adminRegisterForm.style.display = "none";
          document.getElementById("login-role-selector").style.display = "flex";
          loginForm.style.display = "block";
          document.getElementById("login-title-text").textContent = "HMS Portal";
          document.getElementById("login-subtitle-text").textContent = "Hostel Management System Login";
          helpText.style.display = "block";

          const regText = currentLoginRole === "student" ? "Register Now" : "Register Warden/Hostel";
          toggleWrap.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-secondary);">Don't have an account? <span id="btn-show-register" style="color: var(--accent-primary); font-weight: 600; cursor: pointer; text-decoration: underline;">${regText}</span></p>`;

          initApp();
        })
        .catch(err => {
          alert("❌ Setup Error: " + err.message);
        });
    };
  }
}

function approveStudentApplication(app) {
  // 1. Allocate Room dynamically
  const rooms = DB.get("rooms") || [];
  let allocatedRoom = rooms.find(r => r.occupied < r.capacity);
  if (!allocatedRoom) {
    allocatedRoom = { roomNo: "103", block: "A", floor: "1st Floor" };
  } else {
    allocatedRoom.occupied++;
    allocatedRoom.status = allocatedRoom.occupied === allocatedRoom.capacity ? "Fully Occupied" : "Partially Occupied";
    DB.set("rooms", rooms);
  }

  // 2. Insert student
  const students = DB.get("students") || [];
  const newStudent = {
    enrollment: app.enrollment,
    name: app.name,
    photo: app.photo || "",
    email: app.email,
    phone: app.phone,
    parentPhone: app.parentPhone,
    course: app.course,
    academicYear: app.academicYear || app.year || "",
    year: app.academicYear || app.year || "",
    bloodGroup: app.bloodGroup,
    aadhaar: app.aadhaar,
    address: app.address,
    password: app.password,
    roomNo: allocatedRoom.roomNo,
    block: allocatedRoom.block,
    hostelId: 'hostel_demo',
    status: 'Approved'
  };

  // Remove any existing entry with same enrollment (in case of re-approval)
  const existingIdx = students.findIndex(s => s.enrollment.toLowerCase() === app.enrollment.toLowerCase());
  if (existingIdx !== -1) {
    students[existingIdx] = newStudent;
  } else {
    students.push(newStudent);
  }
  DB.set("students", students);

  // 3. Seed Mock Attendance logs
  const attendance = DB.get("attendance") || [];
  for (let i = 1; i <= 24; i++) {
    const status = i <= 22 ? "Present" : "Absent";
    attendance.push({
      enrollment: app.enrollment,
      date: `2026-06-${String(i).padStart(2, "0")}`,
      status: status
    });
  }
  DB.set("attendance", attendance);

  // 4. Update status in applications DB
  const apps = DB.get("registration_applications") || [];
  const dbApp = apps.find(a => a.id === app.id);
  if (dbApp) {
    dbApp.status = "Approved";
    DB.set("registration_applications", apps);
  }
  return newStudent;
}

// ==========================================
// THEME & VIEW ROUTING
// ==========================================

function syncTheme() {
  const settings = DB.get("settings");
  if (settings && settings.darkMode) {
    document.documentElement.setAttribute("data-theme", "dark");
    const darkCheckbox = document.getElementById("settings-darkmode");
    if (darkCheckbox) darkCheckbox.checked = true;
  } else {
    document.documentElement.removeAttribute("data-theme");
    const darkCheckbox = document.getElementById("settings-darkmode");
    if (darkCheckbox) darkCheckbox.checked = false;
  }
}

function setupThemeToggle() {
  const darkCheckbox = document.getElementById("settings-darkmode");
  if (darkCheckbox) {
    darkCheckbox.addEventListener("change", (e) => {
      const settings = DB.get("settings") || {};
      settings.darkMode = e.target.checked;
      DB.set("settings", settings);
      syncTheme();
    });
  }
}

function renderHeader() {
  const students = DB.get("students") || [];
  const currentStudent = students.find(s => s.enrollment === currentStudentEnrollment);

  const headerAvatar = document.getElementById("header-avatar");
  const headerUsername = document.getElementById("header-username");
  const headerUserrole = document.getElementById("header-userrole");

  if (currentRole === "student" && currentStudent) {
    if (currentStudent.photo && currentStudent.photo.startsWith("data:image/")) {
      headerAvatar.innerHTML = `<img src="${currentStudent.photo}" style="width:100%; height:100%; border-radius:50%; object-fit:cover; display:block;">`;
    } else {
      headerAvatar.innerHTML = getInitials(currentStudent.name);
    }
    headerUsername.textContent = currentStudent.name;
    headerUserrole.textContent = `Room ${currentStudent.roomNo} | Block ${currentStudent.block}`;
  } else {
    const info = DB.get("hostel_info") || {
      wardenName: "Dr. Sanjay Kumar",
      wardenTitle: "Chief Warden | Room A-12 Office"
    };
    headerAvatar.textContent = getInitials(info.wardenName);
    headerUsername.textContent = info.wardenName;
    headerUserrole.textContent = info.wardenTitle;
  }

  // Render notifications dropdown and update alert dot
  renderNotifications();

}

function renderSidebarForRole() {
  const menuItems = document.querySelectorAll("#sidebar-menu .menu-item");
  menuItems.forEach(item => {
    const itemRole = item.getAttribute("data-role");
    if (!itemRole) {
      // Shared items
      item.style.display = "flex";
    } else if (itemRole === currentRole) {
      item.style.display = "flex";
    } else {
      item.style.display = "none";
    }
  });

  // Dynamic Registration Applications pending count badge
  const adminAppsBadge = document.getElementById("admin-apps-badge");
  if (adminAppsBadge) {
    if (currentRole === "admin") {
      const apps = DB.get("registration_applications") || [];
      const pendingAppsCount = apps.filter(a => a.status === "Pending").length;
      if (pendingAppsCount > 0) {
        adminAppsBadge.textContent = pendingAppsCount;
        adminAppsBadge.style.display = "inline-block";
      } else {
        adminAppsBadge.style.display = "none";
      }
    } else {
      adminAppsBadge.style.display = "none";
    }
  }
}

function routeTo(target) {
  // If Target is role-dependent dashboard, map it properly
  if (target === "dashboard") {
    if (currentRole === "admin") target = "admin-dashboard";
    else if (currentRole === "owner") target = "owner-dashboard";
  }

  // Update Sidebar Active state
  const menuItems = document.querySelectorAll("#sidebar-menu .menu-item");
  menuItems.forEach(item => {
    const itemTarget = item.getAttribute("data-target");
    if (itemTarget === target || (target === "admin-dashboard" && itemTarget === "dashboard")) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });

  // Switch visible views
  const views = document.querySelectorAll(".page-content");
  views.forEach(view => {
    view.classList.remove("active");
  });

  const activeView = document.getElementById(`view-${target}`);
  if (activeView) {
    activeView.classList.add("active");
    // Update header title
    document.getElementById("page-title").textContent = getPageTitle(target);
    // Refresh content for this page
    renderViewData(target);
  }
}

function getPageTitle(target) {
  const titles = {
    "dashboard": "Student Dashboard",
    "profile": "My Profile",
    "room": "My Room Details",
    "food": "Daily Mess Menu",
    "attendance": "My Attendance Tracker",
    "notices": "Notice Board",
    "complaints": "Raise & Track Complaints",
    "fines": "Fines & Payment Portal",
    "leaves": "Leave Application",
    "admin-dashboard": "Welcome to Dashboard",
    "admin-menu": "Mess Menu Management",
    "admin-notices": "Broadcast Notices Board",
    "admin-complaints": "Complaints Management Panel",
    "admin-leaves": "Student Leave Requests",
    "admin-students": "Student Database Directory",
    "admin-allocation": "Room Allocator & Floor Map",
    "admin-visitors": "Hostel Visitor Register",
    "admin-applications": "Student Registration Applications",
    "admin-hostel": "Manage Hostel & Rules",
    "settings": "System Settings",
    "about": "About Hostel",
    "owner-dashboard": "Owner Control Panel"
  };
  return titles[target] || "Hostel Management";
}

function setupNavigation() {
  const menuItems = document.querySelectorAll("#sidebar-menu .menu-item");
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebar-overlay");

  menuItems.forEach(item => {
    item.addEventListener("click", () => {
      const target = item.getAttribute("data-target");
      routeTo(target);
      // Close sidebar & overlay in mobile view
      if (sidebar && sidebar.classList.contains("active")) {
        sidebar.classList.remove("active");
        if (overlay) overlay.classList.remove("active");
      }
    });
  });

  // Mobile menu toggle
  const menuToggle = document.getElementById("menu-toggle");
  if (menuToggle && sidebar) {
    menuToggle.addEventListener("click", () => {
      sidebar.classList.toggle("active");
      if (overlay) overlay.classList.toggle("active");
    });
  }

  // Backdrop overlay click to close
  if (overlay && sidebar) {
    overlay.addEventListener("click", () => {
      sidebar.classList.remove("active");
      overlay.classList.remove("active");
    });
  }

  // Logout button simulation
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      sessionStorage.removeItem("hms_session");
      sessionStorage.removeItem("hms_token");

      // Clear session keys in localStorage, keeping hostel_info and clean key
      const keysToKeep = ["hms_hostel_info", "hms_clean_v5"];
      const keys = Object.keys(localStorage);
      keys.forEach(k => {
        if (!keysToKeep.includes(k)) {
          localStorage.removeItem(k);
        }
      });

      alert("Logged out successfully!");
      window.location.reload();
    });
  }

  // Inline dashboard navigation links
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("view-all-link")) {
      const link = e.target.getAttribute("data-link");
      if (link) routeTo(link);
    }
  });
}

function setupRoleSwitcher() {
  const btnStudent = document.getElementById("role-btn-student");
  const btnAdmin = document.getElementById("role-btn-admin");

  const btnOwner = document.getElementById("role-btn-owner");

  if (btnStudent && btnAdmin) {
    btnStudent.addEventListener("click", () => {
      if (currentRole !== "student") {
        currentRole = "student";
        btnStudent.classList.add("active");
        btnAdmin.classList.remove("active");
        if (btnOwner) btnOwner.classList.remove("active");
        renderHeader();
        renderSidebarForRole();
        routeTo("dashboard");
        renderAllViews();
      }
    });

    btnAdmin.addEventListener("click", () => {
      if (currentRole !== "admin") {
        currentRole = "admin";
        btnAdmin.classList.add("active");
        btnStudent.classList.remove("active");
        if (btnOwner) btnOwner.classList.remove("active");
        renderHeader();
        renderSidebarForRole();
        routeTo("admin-dashboard");
        renderAllViews();
      }
    });

    if (btnOwner) {
      btnOwner.addEventListener("click", () => {
        if (currentRole !== "owner") {
          currentRole = "owner";
          btnOwner.classList.add("active");
          btnStudent.classList.remove("active");
          btnAdmin.classList.remove("active");
          renderHeader();
          renderSidebarForRole();
          routeTo("owner-dashboard");
          renderAllViews();
        }
      });
    }
  }
}

// ==========================================
// CORE RENDER FLOW
// ==========================================

function renderAllViews() {
  // Pre-render shared modules
  renderFoodMenu();
  renderNotices();
  renderAboutSection();
}

function renderViewData(viewId) {
  switch (viewId) {
    case "dashboard":
      renderStudentDashboard();
      break;
    case "profile":
      renderStudentProfile();
      break;
    case "room":
      renderRoomDetails();
      break;
    case "food":
      renderFoodMenu();
      break;
    case "attendance":
      renderAttendancePage();
      break;
    case "notices":
      renderNotices();
      break;
    case "complaints":
      renderComplaintsPage();
      break;
    case "fines":
      renderFinesPage();
      break;
    case "leaves":
      renderLeavesPage();
      break;
    case "admin-dashboard":
      renderAdminDashboard();
      break;
    case "admin-menu":
      loadAdminMenuForm();
      break;
    case "admin-notices":
      renderAdminNotices();
      break;
    case "admin-complaints":
      renderAdminComplaints();
      break;
    case "admin-leaves":
      renderAdminLeaves();
      break;
    case "admin-students":
      renderAdminStudents();
      break;
    case "admin-allocation":
      renderRoomAllocation();
      break;
    case "admin-visitors":
      renderVisitorRegister();
      break;
    case "admin-applications":
      renderAdminApplications();
      break;
    case "settings":
      renderSettingsPage();
      break;
    case "about":
      renderAboutSection();
      break;
    case "owner-dashboard":
      renderOwnerDashboard();
      break;
  }
}

// ==========================================
// STUDENT & OWNER DYNAMIC VIEWS RENDERERS
// ==========================================

async function renderOwnerDashboard() {
  const token = sessionStorage.getItem("hms_token");
  const headers = { "Authorization": "Bearer " + token, "Content-Type": "application/json" };
  
  // 1. Fetch Hostels & Stats
  const hostelsBody = document.getElementById("owner-hostels-list");
  if (hostelsBody) {
    hostelsBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Loading...</td></tr>`;
    try {
      const res = await fetch("/api/owner/hostels", { headers });
      const hostels = await res.json();
      let totalStudents = 0;
      if (!hostels.error && hostels.length > 0) {
        hostelsBody.innerHTML = hostels.map(h => {
          totalStudents += h.totalStudents || 0;
          return `
          <tr>
            <td>${h.name}</td>
            <td>${h.id}</td>
            <td>${h.wardenName}</td>
            <td>${h.totalRooms}</td>
            <td>${h.totalStudents || 0}</td>
            <td style="text-align: right;">
              <button class="action-btn" onclick="deleteHostel('${h.id}')" style="background: var(--danger-color); color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">Delete</button>
            </td>
          </tr>
        `}).join("");
        document.getElementById("owner-stat-hostels").textContent = hostels.length;
        document.getElementById("owner-stat-students").textContent = totalStudents;
      } else {
        hostelsBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No hostels registered yet.</td></tr>`;
      }
    } catch (e) {
      hostelsBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--danger-color);">Failed to load hostels.</td></tr>`;
    }
  }

  // 2. Fetch Admins & Billing Status
  const adminsBody = document.getElementById("owner-admins-list");
  if (adminsBody) {
    adminsBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Loading...</td></tr>`;
    try {
      const res = await fetch("/api/owner/admins", { headers });
      const admins = await res.json();
      if (!admins.error && admins.length > 0) {
        adminsBody.innerHTML = admins.map(a => `
          <tr>
            <td>${a.name}</td>
            <td>${a.username}</td>
            <td>${a.hostelId}</td>
            <td>
              <select onchange="updatePaymentStatus('${a.username}', this.value)" style="padding: 4px; border-radius: 4px; border: 1px solid var(--glass-border); background: var(--bg-color); color: var(--text-primary);">
                <option value="Pending" ${a.paymentStatus === 'Pending' ? 'selected' : ''}>Pending</option>
                <option value="Paid" ${a.paymentStatus === 'Paid' ? 'selected' : ''}>Paid</option>
              </select>
            </td>
            <td>
              <span class="badge ${a.isActive ? 'resolved' : 'unresolved'}" style="background: ${a.isActive ? 'var(--success-color)' : 'var(--danger-color)'}; color: white;">
                ${a.isActive ? 'Active' : 'Disabled'}
              </span>
            </td>
            <td style="text-align: right;">
              <button class="action-btn" onclick="toggleAdminStatus('${a.username}', ${!a.isActive})" style="padding: 6px 12px; font-size: 0.8rem; border-radius: 4px; border: 1px solid var(--glass-border); background: ${a.isActive ? 'var(--danger-color)' : 'var(--success-color)'}; color: white; cursor: pointer;">
                ${a.isActive ? 'Disable' : 'Enable'}
              </button>
            </td>
          </tr>
        `).join("");
      } else {
        adminsBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No admins found.</td></tr>`;
      }
    } catch (e) {
      adminsBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--danger-color);">Failed to load admins.</td></tr>`;
    }
  }

  // 3. Fetch Bank Details
  try {
    const res = await fetch("/api/owner/bank-details", { headers });
    const bank = await res.json();
    if (bank && !bank.error) {
      document.getElementById("owner-bank-name").value = bank.bankName || '';
      document.getElementById("owner-bank-accname").value = bank.accountName || '';
      document.getElementById("owner-bank-accnum").value = bank.accountNumber || '';
      document.getElementById("owner-bank-ifsc").value = bank.ifsc || '';
    }
  } catch (e) {}

  const btnRefresh = document.getElementById("btn-owner-refresh");
  if (btnRefresh) btnRefresh.onclick = renderOwnerDashboard;
}

window.deleteHostel = async function(id) {
  if (!confirm(`Are you SURE you want to delete Hostel ID ${id} and ALL its data? This cannot be undone.`)) return;
  const token = sessionStorage.getItem("hms_token");
  try {
    const res = await fetch(`/api/owner/hostels/${id}`, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } });
    const data = await res.json();
    if (data.success) {
      alert(data.message);
      renderOwnerDashboard();
    } else {
      alert("Error: " + data.error);
    }
  } catch (e) { alert("Failed to delete hostel."); }
};

window.updatePaymentStatus = async function(username, status) {
  const token = sessionStorage.getItem("hms_token");
  try {
    const res = await fetch("/api/owner/update-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify({ username, paymentStatus: status })
    });
    const data = await res.json();
    if (data.success) alert(data.message);
    else alert("Error: " + data.error);
  } catch (e) { alert("Failed to update status."); }
};

window.toggleAdminStatus = function(username, newStatus) {
  if (!confirm(`Are you sure you want to ${newStatus ? 'enable' : 'disable'} access for admin: ${username}?`)) return;

  fetch("/api/owner/toggle-admin", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + sessionStorage.getItem("hms_token")
    },
    body: JSON.stringify({ username, isActive: newStatus })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        alert(data.message);
        renderOwnerDashboard();
      } else {
        alert("Error: " + data.error);
      }
    })
    .catch(err => alert("Error toggling admin: " + err));
}

// Global Notice and Admin Billing Logic
document.addEventListener("DOMContentLoaded", () => {
  const noticeForm = document.getElementById("owner-notice-form");
  if (noticeForm) {
    noticeForm.onsubmit = async (e) => {
      e.preventDefault();
      const title = document.getElementById("owner-notice-title").value;
      const message = document.getElementById("owner-notice-msg").value;
      const token = sessionStorage.getItem("hms_token");
      try {
        const res = await fetch("/api/owner/global-notice", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
          body: JSON.stringify({ title, message })
        });
        const data = await res.json();
        if (data.success) {
          alert(data.message);
          noticeForm.reset();
        } else alert("Error: " + data.error);
      } catch (err) {}
    };
  }

  const bankForm = document.getElementById("owner-bank-form");
  if (bankForm) {
    bankForm.onsubmit = async (e) => {
      e.preventDefault();
      const bankDetails = {
        bankName: document.getElementById("owner-bank-name").value,
        accountName: document.getElementById("owner-bank-accname").value,
        accountNumber: document.getElementById("owner-bank-accnum").value,
        ifsc: document.getElementById("owner-bank-ifsc").value
      };
      const token = sessionStorage.getItem("hms_token");
      try {
        const res = await fetch("/api/owner/bank-details", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
          body: JSON.stringify({ bankDetails })
        });
        const data = await res.json();
        if (data.success) alert(data.message);
        else alert("Error: " + data.error);
      } catch (err) {}
    };
  }
  
  fetchAndRenderGlobalNotices();
  checkAdminBillingStatus();
});

async function fetchAndRenderGlobalNotices() {
  try {
    const res = await fetch("/api/global-notices");
    const notices = await res.json();
    const banner = document.getElementById("global-announcement-banner");
    if (banner && notices && notices.length > 0) {
      const latest = notices[0];
      document.getElementById("global-notice-title").textContent = latest.title;
      document.getElementById("global-notice-msg").textContent = latest.message;
      document.getElementById("global-notice-date").textContent = latest.date;
      banner.style.display = "flex";
    } else if (banner) {
      banner.style.display = "none";
    }
  } catch (err) {}
}

async function checkAdminBillingStatus() {
  const sessionStr = sessionStorage.getItem("hms_session");
  if (!sessionStr) return;
  const session = JSON.parse(sessionStr);
  const billingBanner = document.getElementById("admin-billing-banner");
  if (!billingBanner) return;
  
  if (session.role === 'admin' && session.paymentStatus === 'Pending') {
    billingBanner.style.display = "block";
    try {
      const res = await fetch("/api/owner/bank-details", {
        headers: { 'Authorization': 'Bearer ' + sessionStorage.getItem('hms_token') }
      });
      const bank = await res.json();
      const bDetails = document.getElementById("billing-bank-details");
      if (bDetails && bank && bank.accountNumber) {
        bDetails.innerHTML = `${bank.bankName} - ${bank.accountName}<br>A/C: ${bank.accountNumber} | IFSC: ${bank.ifsc}`;
      } else if (bDetails) {
        bDetails.innerHTML = "Owner has not updated bank details yet. Contact Owner directly.";
      }
    } catch (err) {}
  } else {
    billingBanner.style.display = "none";
  }
}

function renderStudentDashboard() {
  const students = DB.get("students") || [];
  const currentStudent = students.find(s => s.enrollment === currentStudentEnrollment) || { name: "Rahul Patel", roomNo: "203", block: "B" };

  // Update Welcome Banner Content
  const welcomeText = document.getElementById("dash-welcome-text");
  const welcomeRoom = document.getElementById("dash-welcome-room");
  const welcomeHostel = document.getElementById("dash-welcome-hostel");
  if (welcomeText) welcomeText.textContent = `👋 Welcome, ${currentStudent.name}`;
  if (welcomeRoom) welcomeRoom.textContent = `Room No: ${currentStudent.roomNo} | Block ${currentStudent.block}`;

  const hostelInfo = DB.get("hostel_info") || { name: "Grand Heritage Boys Hostel" };
  if (welcomeHostel) welcomeHostel.innerHTML = `<i class="fa-solid fa-hotel"></i> ${hostelInfo.name}`;

  // Removed dashboard background image logic

  // Update Dashboard Summary Stats from DB
  const rooms = DB.get("rooms") || [];
  const totalRooms = rooms.length;
  const vacantRoomsCount = rooms.filter(r => r.occupied === 0).length;

  const statRooms = document.getElementById("student-stat-rooms");
  const statStudents = document.getElementById("student-stat-students");
  const statVacant = document.getElementById("student-stat-vacant");

  if (statRooms) statRooms.textContent = totalRooms;
  if (statStudents) statStudents.textContent = students.length;
  if (statVacant) statVacant.textContent = vacantRoomsCount;

  // Update page header title
  const pageTitle = document.getElementById("page-title");
  if (pageTitle) pageTitle.textContent = `${currentStudent.name}'s Dashboard`;

  // Update Food Menu strip
  const fullMenu = DB.get("food_menu") || {};
  const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const menu = fullMenu[currentDay] || {};
  const dashMenuGrid = document.getElementById("dash-menu-grid");
  if (dashMenuGrid) {
    dashMenuGrid.innerHTML = `
      <div class="menu-time-block">
        <div class="menu-header breakfast-color"><i class="fa-solid fa-mug-saucer"></i> Breakfast</div>
        <div class="menu-items-list">${menu.breakfast || "N/A"}</div>
      </div>
      <div class="menu-time-block">
        <div class="menu-header lunch-color"><i class="fa-solid fa-bowl-food"></i> Lunch</div>
        <div class="menu-items-list">${menu.lunch || "N/A"}</div>
      </div>
      <div class="menu-time-block">
        <div class="menu-header snack-color"><i class="fa-solid fa-cookie"></i> Evening Snack</div>
        <div class="menu-items-list">${menu.eveningSnack || "N/A"}</div>
      </div>
      <div class="menu-time-block">
        <div class="menu-header dinner-color"><i class="fa-solid fa-utensils"></i> Dinner</div>
        <div class="menu-items-list">${menu.dinner || "N/A"}</div>
      </div>
    `;
  }

  // Update Latest Notice Card
  const notices = DB.get("notices") || [];
  const latestNotice = notices[0];
  const dashLatestNotice = document.getElementById("dash-latest-notice");
  if (dashLatestNotice) {
    if (latestNotice) {
      dashLatestNotice.innerHTML = `
        <div class="notice-item ${latestNotice.type === "important" ? "important" : ""}">
          <div class="notice-item-header">
            <span class="notice-title">• ${latestNotice.title}</span>
            <span class="notice-date">${formatDate(latestNotice.date)}</span>
          </div>
          <p class="notice-body" style="margin-top: 6px;">${latestNotice.content}</p>
        </div>
      `;
    } else {
      dashLatestNotice.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-muted);">No notices posted.</p>`;
    }
  }

  // Update Pending Fine block
  const fines = DB.get("fines") || [];
  const rahulFine = fines.find(f => f.enrollment === currentStudentEnrollment && f.status === "Unpaid");
  const dashFineAlert = document.getElementById("dash-fine-alert");
  const btnPayFine = document.getElementById("dash-btn-pay-fine");
  const dashQuickFineBtn = document.getElementById("dash-quick-fine");

  if (rahulFine) {
    if (dashFineAlert) dashFineAlert.style.display = "flex";
    document.getElementById("dash-fine-val").textContent = `₹${rahulFine.amount}`;
    if (dashQuickFineBtn) {
      dashQuickFineBtn.disabled = false;
      dashQuickFineBtn.style.opacity = "1";
    }
  } else {
    if (dashFineAlert) dashFineAlert.style.display = "none";
    if (dashQuickFineBtn) {
      dashQuickFineBtn.disabled = true;
      dashQuickFineBtn.style.opacity = "0.5";
    }
  }

  // Update Complaint Status Widget
  const complaints = DB.get("complaints") || [];
  const rahulComplaints = complaints.filter(c => c.enrollment === currentStudentEnrollment);
  const dashComplaintTitle = document.getElementById("dash-complaint-title");
  const dashComplaintDesc = document.getElementById("dash-complaint-desc");
  const dashComplaintBadge = document.getElementById("dash-complaint-badge");

  if (rahulComplaints.length > 0) {
    const latest = rahulComplaints[rahulComplaints.length - 1];
    dashComplaintTitle.textContent = truncateString(latest.title, 25);
    dashComplaintDesc.textContent = `${rahulComplaints.length} Complaint${rahulComplaints.length > 1 ? "s" : ""} logged`;
    dashComplaintBadge.style.display = "inline-block";
    dashComplaintBadge.textContent = latest.status;
    dashComplaintBadge.className = `badge ${latest.status.toLowerCase().replace(" ", "")}`;
  } else {
    dashComplaintTitle.textContent = "No complaints logged";
    dashComplaintDesc.textContent = "Submit a complaint to request repair/maintenance.";
    dashComplaintBadge.style.display = "none";
  }
}

function renderStudentProfile() {
  const students = DB.get("students") || [];
  const currentStudent = students.find(s => s.enrollment === currentStudentEnrollment);
  if (!currentStudent) return;

  const profileAvatar = document.getElementById("profile-avatar");
  if (currentStudent.photo && currentStudent.photo.startsWith("data:image/")) {
    profileAvatar.innerHTML = `<img src="${currentStudent.photo}" style="width:100%; height:100%; border-radius:50%; object-fit:cover; display:block;">`;
  } else {
    profileAvatar.innerHTML = getInitials(currentStudent.name);
  }
  document.getElementById("profile-name").textContent = currentStudent.name;
  document.getElementById("profile-enrollment").textContent = `Enrollment No: ${currentStudent.enrollment}`;
  document.getElementById("profile-mobile").textContent = currentStudent.phone;
  document.getElementById("profile-email").textContent = currentStudent.email;
  document.getElementById("profile-parent").textContent = currentStudent.parentPhone;
  document.getElementById("profile-course").textContent = currentStudent.course;
  document.getElementById("profile-year").textContent = currentStudent.year;
  document.getElementById("profile-room").textContent = `Room ${currentStudent.roomNo} (Block ${currentStudent.block})`;
}

function renderRoomDetails() {
  const students = DB.get("students") || [];
  const currentStudent = students.find(s => s.enrollment === currentStudentEnrollment);
  if (!currentStudent) return;

  const rooms = DB.get("rooms") || [];
  const currentRoom = rooms.find(r => r.roomNo === currentStudent.roomNo && r.block === currentStudent.block);

  document.getElementById("room-number-val").textContent = currentStudent.roomNo;
  document.getElementById("room-block-val").textContent = `Block ${currentStudent.block}`;

  if (currentRoom) {
    document.getElementById("room-floor-val").textContent = currentRoom.floor;
    const badge = document.getElementById("room-status-badge");
    badge.textContent = currentRoom.status;
    badge.className = `badge ${currentRoom.status.toLowerCase().replace(" ", "")}`;
  }

  // Find Roommates
  const roommates = students.filter(s => s.roomNo === currentStudent.roomNo && s.block === currentStudent.block && s.enrollment !== currentStudentEnrollment);
  const container = document.getElementById("roommates-container");

  if (roommates.length > 0) {
    container.innerHTML = roommates.map(rm => `
      <div class="roommate-card">
        <div class="roommate-avatar">${getInitials(rm.name)}</div>
        <div>
          <h4 style="font-size: 0.9rem;">${rm.name}</h4>
          <p style="font-size: 0.75rem; color: var(--text-muted);">${rm.course}</p>
        </div>
      </div>
    `).join("");
  } else {
    container.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-secondary);">No roommates allocated yet.</p>`;
  }
}

function renderFoodMenu(selectedDayOverride) {
  const fullMenu = DB.get("food_menu") || {};
  let currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  
  const studentDaySelector = document.getElementById("student-menu-day");
  if (studentDaySelector && !selectedDayOverride) {
      if (!studentDaySelector.dataset.initialized) {
          studentDaySelector.value = currentDay;
          studentDaySelector.dataset.initialized = "true";
      }
      currentDay = studentDaySelector.value;
  } else if (selectedDayOverride) {
      currentDay = selectedDayOverride;
  }

  const menu = fullMenu[currentDay] || {};
  document.getElementById("menu-txt-breakfast").textContent = menu.breakfast || "N/A";
  document.getElementById("menu-txt-lunch").textContent = menu.lunch || "N/A";
  document.getElementById("menu-txt-eveningSnack").textContent = menu.eveningSnack || "N/A";
  document.getElementById("menu-txt-dinner").textContent = menu.dinner || "N/A";

  // Bind individual tabs in Food Menu page
  const tabBtns = document.querySelectorAll("#view-food .tab-btn");
  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      tabBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const targetTab = btn.getAttribute("data-tab");

      const contents = document.querySelectorAll("#view-food .tab-content");
      contents.forEach(content => {
        content.classList.remove("active");
      });
      document.getElementById(`tab-${targetTab}`).classList.add("active");
    });
  });
}

function renderAttendancePage() {
  const attendance = DB.get("attendance") || [];
  const rahulLogs = attendance.filter(a => a.enrollment === currentStudentEnrollment);

  const presentDays = rahulLogs.filter(a => a.status === "Present").length;
  const absentDays = rahulLogs.filter(a => a.status === "Absent").length;

  document.getElementById("attend-present-val").textContent = presentDays;
  document.getElementById("attend-absent-val").textContent = absentDays;

  // Initialize/Refresh Attendance Chart
  setTimeout(() => {
    const ctx = document.getElementById("attendanceChart");
    if (!ctx) return;

    if (attendanceChartInstance) {
      attendanceChartInstance.destroy();
    }

    // Prepare chart data (grouped by week or day)
    // For simplicity, we seed a 4-week history
    attendanceChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        datasets: [
          {
            label: 'Present Days',
            data: [6, 5, 6, presentDays - 17 > 0 ? presentDays - 17 : 5],
            backgroundColor: 'rgba(16, 185, 129, 0.6)',
            borderColor: '#10b981',
            borderWidth: 1,
            borderRadius: 6
          },
          {
            label: 'Absent Days',
            data: [1, 0, 1, absentDays - 2 >= 0 ? absentDays - 2 : 0],
            backgroundColor: 'rgba(239, 68, 68, 0.6)',
            borderColor: '#ef4444',
            borderWidth: 1,
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim() }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 7,
            ticks: {
              color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim(),
              stepSize: 1
            },
            grid: { color: getComputedStyle(document.documentElement).getPropertyValue('--glass-border').trim() }
          },
          x: {
            ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() },
            grid: { display: false }
          }
        }
      }
    });
  }, 100);
}

function renderNotices() {
  const notices = DB.get("notices") || [];
  const container = document.getElementById("notices-list-container");
  if (!container) return;

  if (notices.length > 0) {
    container.innerHTML = notices.map(n => `
      <div class="notice-item ${n.type === "important" ? "important" : ""}">
        <div class="notice-item-header">
          <span class="notice-title">• ${n.title}</span>
          <span class="notice-date">${formatDate(n.date)}</span>
        </div>
        <p class="notice-body" style="margin-top: 8px;">${n.content}</p>
      </div>
    `).join("");
  } else {
    container.innerHTML = `<p style="font-size: 0.9rem; color: var(--text-secondary); text-align: center;">Notice board is clear.</p>`;
  }
}

function renderComplaintsPage() {
  const complaints = DB.get("complaints") || [];
  const rahulComplaints = complaints.filter(c => c.enrollment === currentStudentEnrollment);
  const container = document.getElementById("complaints-tracker-list");

  if (rahulComplaints.length > 0) {
    // Show newest first
    container.innerHTML = rahulComplaints.slice().reverse().map(c => `
      <div style="background: rgba(148, 163, 184, 0.08); border: 1px solid var(--glass-border); border-radius: 12px; padding: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <h4 style="font-size: 0.95rem; color: var(--text-primary);">${c.title}</h4>
            <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500;">Logged: ${formatDate(c.date)} | Category: ${c.type}</span>
          </div>
          <span class="badge ${c.status.toLowerCase().replace(" ", "")}">${c.status}</span>
        </div>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 10px; line-height: 1.4;">${c.description}</p>
        ${c.adminComment ? `
          <div style="margin-top: 12px; padding: 10px; background: rgba(37, 99, 235, 0.05); border-left: 3px solid var(--accent-primary); border-radius: 0 8px 8px 0; font-size: 0.8rem; color: var(--text-secondary);">
            <strong>Warden Response:</strong> ${c.adminComment}
          </div>
        ` : ""}
      </div>
    `).join("");
  } else {
    container.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-secondary); text-align: center;">No complaints logged.</p>`;
  }
}

function renderFinesPage() {
  const fines = DB.get("fines") || [];
  const rahulFines = fines.filter(f => f.enrollment === currentStudentEnrollment);
  const tbody = document.getElementById("fines-table-body");

  if (rahulFines.length > 0) {
    tbody.innerHTML = rahulFines.map(f => `
      <tr>
        <td style="font-weight: 600;">${f.reason}</td>
        <td>₹${f.amount}</td>
        <td>${formatDate(f.dueDate)}</td>
        <td><span class="badge ${f.status.toLowerCase()}">${f.status}</span></td>
        <td>
          ${f.status === "Unpaid" ? `
            <button class="submit-btn" style="padding: 6px 14px; font-size: 0.8rem; border-radius: 50px;" onclick="openPaymentModal('${f.id}', ${f.amount})">Pay Online</button>
          ` : `<span style="color: var(--success); font-weight: 700; font-size: 0.85rem;"><i class="fa-solid fa-circle-check"></i> Paid</span>`}
        </td>
      </tr>
    `).join("");
  } else {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 24px;">No logged fines found. Check-in records are clean.</td></tr>`;
  }
}

// Global modal hook helper
window.openPaymentModal = function (fineId, amount) {
  const modal = document.getElementById("modal-payment");
  if (modal) {
    modal.classList.add("active");
    document.getElementById("payment-amount-label").textContent = `₹${amount}`;
    modal.setAttribute("data-fine-id", fineId);
  }
};

function renderLeavesPage() {
  const leaves = DB.get("leave_applications") || [];
  const rahulLeaves = leaves.filter(l => l.enrollment === currentStudentEnrollment);
  const container = document.getElementById("leaves-history-list");

  if (rahulLeaves.length > 0) {
    container.innerHTML = rahulLeaves.slice().reverse().map(l => `
      <div style="background: rgba(148, 163, 184, 0.08); border: 1px solid var(--glass-border); border-radius: 12px; padding: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 700; font-size: 0.9rem; color: var(--text-primary);"><i class="fa-regular fa-calendar"></i> ${formatDate(l.fromDate)} to ${formatDate(l.toDate)}</span>
          <span class="badge ${l.status.toLowerCase()}">${l.status}</span>
        </div>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 8px; line-height: 1.4;">${l.reason}</p>
        <span style="font-size: 0.7rem; color: var(--text-muted); display: block; margin-top: 8px;">Submitted on: ${formatDate(l.submittedDate || "2026-06-25")}</span>
      </div>
    `).join("");
  } else {
    container.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-secondary); text-align: center;">No leave application history found.</p>`;
  }
}

// ==========================================
// ADMIN DASHBOARD & PANELS RENDERERS
// ==========================================

function renderAdminDashboard() {
  const students = DB.get("students") || [];
  const rooms = DB.get("rooms") || [];
  const complaints = DB.get("complaints") || [];
  const leaves = DB.get("leave_applications") || [];
  const attendance = DB.get("attendance") || [];

  // Update Welcome Banner dynamic hostel subtitle
  const adminWelcomeHostel = document.getElementById("admin-dash-welcome-hostel");
  const hostelInfo = DB.get("hostel_info") || { name: "Grand Heritage Boys Hostel" };
  if (adminWelcomeHostel) adminWelcomeHostel.innerHTML = `<i class="fa-solid fa-hotel"></i> ${hostelInfo.name}`;

  // Removed dashboard background image logic

  // 1. Dashboard summary cards
  const totalStudents = students.length;
  const occupiedRooms = rooms.filter(r => r.occupied > 0).length;
  const vacantRooms = rooms.filter(r => r.occupied === 0).length;
  const pendingComplaints = complaints.filter(c => c.status === "Pending" || c.status === "In Progress").length;
  const pendingApps = (DB.get("registration_applications") || []).filter(a => a.status === "Pending").length;

  document.getElementById("admin-stat-students").textContent = totalStudents;
  document.getElementById("admin-stat-occupied").textContent = occupiedRooms;
  document.getElementById("admin-stat-vacant").textContent = vacantRooms;
  document.getElementById("admin-stat-complaints").textContent = pendingComplaints;

  // Update sidebar badge for pending applications
  const sidebarBadge = document.getElementById("admin-apps-badge");
  if (sidebarBadge) {
    sidebarBadge.textContent = pendingApps;
    sidebarBadge.style.display = pendingApps > 0 ? "inline-block" : "none";
  }

  // Pending applications quick alert card on dashboard
  const existingAppAlert = document.getElementById("admin-dash-apps-alert");
  const welcomeCardParent = document.getElementById("admin-welcome-banner-card")?.parentNode;
  if (welcomeCardParent && !existingAppAlert) {
    const alertDiv = document.createElement("div");
    alertDiv.id = "admin-dash-apps-alert";
    alertDiv.className = "info-card";
    alertDiv.style.cssText = "margin-bottom:16px; padding:14px 20px; display:flex; align-items:center; justify-content:space-between; cursor:pointer; border-left: 4px solid var(--warning);";
    alertDiv.onclick = () => routeTo("admin-applications");
    alertDiv.innerHTML = `
      <div style="display:flex; align-items:center; gap:12px;">
        <i class="fa-solid fa-inbox" style="font-size:1.4rem; color:var(--warning);"></i>
        <div>
          <div style="font-weight:700; font-size:0.95rem;" id="admin-dash-apps-alert-text">0 Pending Registration Applications</div>
          <div style="font-size:0.78rem; color:var(--text-muted);">Click to review and approve/reject student applications</div>
        </div>
      </div>
      <i class="fa-solid fa-chevron-right" style="color:var(--text-muted);"></i>
    `;
    welcomeCardParent.insertBefore(alertDiv, document.getElementById("admin-welcome-banner-card").nextSibling);
  }
  const alertText = document.getElementById("admin-dash-apps-alert-text");
  if (alertText) {
    alertText.textContent = `${pendingApps} Pending Registration Application${pendingApps !== 1 ? "s" : ""}`;
    const alertCard = document.getElementById("admin-dash-apps-alert");
    if (alertCard) alertCard.style.background = pendingApps > 0 ? "rgba(245, 158, 11, 0.08)" : "var(--glass-bg)";
  }

  // 2. Attendance Overview
  // Compute today's counts (June 27, 2026)
  const todayLogs = attendance.filter(a => a.date === "2026-06-27");
  const presentCnt = todayLogs.filter(a => a.status === "Present").length;
  const absentCnt = todayLogs.filter(a => a.status === "Absent").length;
  const totalLogs = todayLogs.length || 1;
  const presentPct = Math.round((presentCnt / totalLogs) * 100);

  document.getElementById("admin-attendance-pct").textContent = `${presentPct}% Present Today`;
  document.getElementById("admin-attend-present-cnt").textContent = presentCnt;
  document.getElementById("admin-attend-absent-cnt").textContent = absentCnt;

  // 3. Render visitors sub-table (Limit to 3 entries)
  const visitors = DB.get("visitor_register") || [];
  const visitorBody = document.getElementById("admin-dash-visitors-body");
  if (visitorBody) {
    if (visitors.length > 0) {
      visitorBody.innerHTML = visitors.slice(-3).reverse().map(v => `
        <tr>
          <td><strong>${v.visitorName}</strong></td>
          <td>${v.studentName}</td>
          <td>Block ${v.block} - ${v.roomNo}</td>
          <td>${v.checkIn.split(" ")[1] + " " + v.checkIn.split(" ")[2]}</td>
          <td><span class="badge ${v.status === "Checked Out" ? "resolved" : "pending"}">${v.status}</span></td>
        </tr>
      `).join("");
    } else {
      visitorBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No recent logs.</td></tr>`;
    }
  }

  // 4. Render leave applications sub-list (Limit to 3 pending)
  const pendingLeaves = leaves.filter(l => l.status === "Pending");
  const leavesList = document.getElementById("admin-dash-leaves-list");
  if (leavesList) {
    if (pendingLeaves.length > 0) {
      leavesList.innerHTML = pendingLeaves.slice(0, 3).map(l => {
        const student = students.find(s => s.enrollment === l.enrollment) || { name: "Student", roomNo: "N/A" };
        return `
          <div style="background: rgba(148,163,184,0.06); padding: 12px; border-radius: 12px; border: 1px solid var(--glass-border);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <h4 style="font-size: 0.85rem; color: var(--text-primary);">${student.name} (Room ${student.roomNo})</h4>
                <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">Dates: ${formatDate(l.fromDate)} - ${formatDate(l.toDate)}</p>
              </div>
            </div>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 8px; font-style: italic;">Reason: "${l.reason}"</p>
            <div style="display: flex; gap: 8px; margin-top: 10px;">
              <button class="submit-btn" style="padding: 4px 10px; font-size: 0.75rem; border-radius: 4px;" onclick="updateLeaveStatus('${l.id}', 'Approved')">Approve</button>
              <button class="submit-btn btn-secondary" style="padding: 4px 10px; font-size: 0.75rem; border-radius: 4px; color: var(--danger); border-color: rgba(239,68,68,0.2);" onclick="updateLeaveStatus('${l.id}', 'Rejected')">Reject</button>
            </div>
          </div>
        `;
      }).join("");
    } else {
      leavesList.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-secondary); text-align: center; padding: 16px;">Inbox clean. No pending leave requests.</p>`;
    }
  }
}

// Global hook for leave approvals from dashboard/page
window.updateLeaveStatus = function (leaveId, status) {
  const leaves = DB.get("leave_applications") || [];
  const idx = leaves.findIndex(l => l.id === leaveId);
  if (idx !== -1) {
    leaves[idx].status = status;
    DB.set("leave_applications", leaves);
    
    // Notify Student
    const leaveApp = leaves[idx];
    addNotification(leaveApp.enrollment, `Leave Application ${status}`, `Your leave request from ${formatDate(leaveApp.fromDate)} to ${formatDate(leaveApp.toDate)} has been ${status.toLowerCase()}`, "leaves", "leave");

    renderViewData(currentRole === "admin" ? "admin-dashboard" : "leaves");
    // Also re-render dedicated leave page table
    const tableBody = document.getElementById("admin-leaves-table-body");
    if (tableBody) renderAdminLeaves();
    renderHeader();
  }
};

function loadAdminMenuForm() {
  const fullMenu = DB.get("food_menu") || {};
  const tbody = document.getElementById("admin-menu-tbody");
  if (!tbody) return;
  
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  let html = "";
  days.forEach(day => {
    const menu = fullMenu[day] || { breakfast: "", lunch: "", eveningSnack: "", dinner: "" };
    html += `
      <tr data-day="${day}">
        <td style="font-weight: 600; padding: 12px 16px;">${day}</td>
        <td style="padding: 6px 12px;"><input type="text" class="form-control" name="breakfast" value="${menu.breakfast}" required style="min-width: 150px;"></td>
        <td style="padding: 6px 12px;"><input type="text" class="form-control" name="lunch" value="${menu.lunch}" required style="min-width: 150px;"></td>
        <td style="padding: 6px 12px;"><input type="text" class="form-control" name="eveningSnack" value="${menu.eveningSnack}" required style="min-width: 150px;"></td>
        <td style="padding: 6px 12px;"><input type="text" class="form-control" name="dinner" value="${menu.dinner}" required style="min-width: 150px;"></td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

function renderAdminNotices() {
  const notices = DB.get("notices") || [];
  const container = document.getElementById("admin-notices-list");
  if (!container) return;

  if (notices.length > 0) {
    container.innerHTML = notices.map(n => `
      <div class="notice-item ${n.type === "important" ? "important" : ""}">
        <div class="notice-item-header">
          <span class="notice-title">• ${n.title}</span>
          <span style="display: flex; gap: 10px; align-items: center;">
            <span class="notice-date">${formatDate(n.date)}</span>
            <button style="border: none; background: none; color: var(--danger); cursor: pointer;" onclick="deleteNotice('${n.id}')"><i class="fa-solid fa-trash-can"></i></button>
          </span>
        </div>
        <p class="notice-body" style="margin-top: 8px;">${n.content}</p>
      </div>
    `).join("");
  } else {
    container.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-secondary); text-align: center;">No broadcasted notices.</p>`;
  }
}

window.deleteNotice = function (noticeId) {
  let notices = DB.get("notices") || [];
  notices = notices.filter(n => n.id !== noticeId);
  DB.set("notices", notices);
  renderAdminNotices();
};

function renderAdminComplaints() {
  const complaints = DB.get("complaints") || [];
  const students = DB.get("students") || [];
  const tbody = document.getElementById("admin-complaints-table-body");
  if (!tbody) return;

  if (complaints.length > 0) {
    tbody.innerHTML = complaints.map(c => {
      const student = students.find(s => s.enrollment === c.enrollment) || { name: "Rahul Patel", roomNo: "203", block: "B" };
      return `
        <tr>
          <td><strong>${c.id}</strong></td>
          <td>
            <div style="font-weight:600;">${student.name}</div>
            <div style="font-size:0.75rem; color:var(--text-muted);">Room ${student.roomNo} | Block ${student.block}</div>
          </td>
          <td>
            <div style="font-weight:600;">${c.title}</div>
            <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:4px;">${c.description}</div>
            ${c.adminComment ? `<div style="font-size:0.75rem; color:var(--accent-primary); margin-top:4px;">Comment: "${c.adminComment}"</div>` : ""}
          </td>
          <td><span class="badge inprogress" style="background:rgba(148,163,184,0.1); color:var(--text-secondary);">${c.type}</span></td>
          <td><span class="badge ${c.status.toLowerCase().replace(" ", "")}">${c.status}</span></td>
          <td>
            <div style="display:flex; gap:6px;">
              ${c.status !== "Resolved" ? `
                <button class="submit-btn" style="padding: 4px 8px; font-size: 0.75rem; border-radius: 4px;" onclick="resolveComplaintPrompt('${c.id}')">Resolve</button>
              ` : `<span style="color: var(--success); font-weight:700; font-size:0.8rem;"><i class="fa-solid fa-check"></i> Closed</span>`}
            </div>
          </td>
        </tr>
      `;
    }).join("");
  } else {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:24px; color:var(--text-muted);">No student complaints filed.</td></tr>`;
  }
}

window.resolveComplaintPrompt = function (complaintId) {
  const comment = prompt("Enter resolution comment (e.g. 'Plumbing repairs finished successfully'):");
  if (comment !== null) {
    const complaints = DB.get("complaints") || [];
    const idx = complaints.findIndex(c => c.id === complaintId);
    if (idx !== -1) {
      complaints[idx].status = "Resolved";
      complaints[idx].adminComment = comment || "Resolved by Warden Office.";
      DB.set("complaints", complaints);
      
      // Notify Student
      const cmp = complaints[idx];
      addNotification(cmp.enrollment, "Complaint Resolved", `Your complaint "${cmp.title}" has been resolved. Comment: "${complaints[idx].adminComment}"`, "complaints", "complaint");

      renderAdminComplaints();
      renderHeader();
    }
  }
};

function renderAdminLeaves() {
  const leaves = DB.get("leave_applications") || [];
  const students = DB.get("students") || [];
  const tbody = document.getElementById("admin-leaves-table-body");
  if (!tbody) return;

  if (leaves.length > 0) {
    tbody.innerHTML = leaves.slice().reverse().map(l => {
      const student = students.find(s => s.enrollment === l.enrollment) || { name: "Rahul Patel", roomNo: "203", block: "B" };
      return `
        <tr>
          <td>
            <div style="font-weight:600;">${student.name}</div>
            <div style="font-size:0.75rem; color:var(--text-muted);">${student.enrollment} | Room ${student.roomNo}</div>
          </td>
          <td>${formatDate(l.fromDate)} to ${formatDate(l.toDate)}</td>
          <td>${l.reason}</td>
          <td><span class="badge ${l.status.toLowerCase()}">${l.status}</span></td>
          <td>
            ${l.status === "Pending" ? `
              <div style="display:flex; gap:6px;">
                <button class="submit-btn" style="padding: 4px 8px; font-size: 0.75rem; border-radius: 4px;" onclick="updateLeaveStatus('${l.id}', 'Approved')">Approve</button>
                <button class="submit-btn btn-secondary" style="padding: 4px 8px; font-size: 0.75rem; border-radius: 4px; color:var(--danger);" onclick="updateLeaveStatus('${l.id}', 'Rejected')">Reject</button>
              </div>
            ` : `<span style="font-weight:700; font-size:0.8rem; color:${l.status === "Approved" ? "var(--success)" : "var(--danger)"};">${l.status}</span>`}
          </td>
        </tr>
      `;
    }).join("");
  } else {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:24px; color:var(--text-muted);">Inbox is empty. No leave applications.</td></tr>`;
  }
}

function renderAdminStudents() {
  const students = DB.get("students") || [];
  const query = document.getElementById("admin-student-search-input").value.toLowerCase();
  const tbody = document.getElementById("admin-students-table-body");

  const filtered = students.filter(s =>
    (s.name || "").toLowerCase().includes(query) ||
    (s.enrollment || "").toLowerCase().includes(query) ||
    (s.roomNo || "").toString().toLowerCase().includes(query)
  );

  if (filtered.length > 0) {
    // Show top 30 to prevent massive rendering delays
    tbody.innerHTML = filtered.slice(0, 30).map(s => `
      <tr>
        <td><strong>${s.enrollment}</strong></td>
        <td>${s.name}</td>
        <td>${s.course || "N/A"} (${s.academicYear || s.year || "N/A"})</td>
        <td>Block ${s.block || "N/A"} - Room ${s.roomNo || "N/A"}</td>
        <td>${s.phone || "N/A"}</td>
        <td>
          <button class="submit-btn btn-secondary" style="padding:4px 8px; font-size:0.75rem;" onclick="allocateStudentDialog('${s.enrollment}')">Re-allocate</button>
        </td>
      </tr>
    `).join("");
  } else {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:24px; color:var(--text-muted);">No matching students found in system.</td></tr>`;
  }

}

// Bind real-time input search for students
const searchInput = document.getElementById("admin-student-search-input");
if (searchInput) {
  searchInput.addEventListener("input", renderAdminStudents);
}

window.allocateStudentDialog = function (enrollment) {
  routeTo("admin-allocation");
  const selector = document.getElementById("alloc-student-select");
  if (selector) {
    selector.value = enrollment;
  }
};

let currentAppsFilter = "Pending";

function renderAdminApplications(filter) {
  if (filter) currentAppsFilter = filter;
  const apps = DB.get("registration_applications") || [];
  const tbody = document.getElementById("admin-applications-table-body");
  const badge = document.getElementById("apps-pending-count-badge");
  const sidebarBadge = document.getElementById("admin-apps-badge");

  const pending = apps.filter(a => a.status === "Pending");

  if (badge) badge.textContent = `${pending.length} Pending`;
  if (sidebarBadge) {
    sidebarBadge.textContent = pending.length;
    sidebarBadge.style.display = pending.length > 0 ? "inline-block" : "none";
  }

  // Update filter tab styles
  ["pending", "approved", "rejected", "all"].forEach(t => {
    const btn = document.getElementById(`apps-tab-${t}`);
    if (btn) {
      const isActive = (currentAppsFilter === "All" && t === "all") ||
        (currentAppsFilter === "Pending" && t === "pending") ||
        (currentAppsFilter === "Approved" && t === "approved") ||
        (currentAppsFilter === "Rejected" && t === "rejected");
      btn.className = isActive ? "submit-btn" : "submit-btn btn-secondary";
    }
  });

  let filtered = apps;
  if (currentAppsFilter !== "All") {
    filtered = apps.filter(a => a.status === currentAppsFilter);
  }

  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:32px; color:var(--text-muted);">No ${currentAppsFilter.toLowerCase()} applications found.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.slice().reverse().map(app => {
    const statusColor = app.status === "Approved" ? "var(--success)" : app.status === "Rejected" ? "var(--danger)" : "var(--warning)";
    const statusBadgeClass = app.status === "Approved" ? "resolved" : app.status === "Rejected" ? "pending" : "inprogress";

    const transferInfo = app.transferTo ? `
      <div style="margin-top:6px; font-size:0.75rem; color:var(--danger);">
        🔄 Transfer to: <strong>${app.transferTo}</strong><br>
        <span style="color:var(--text-muted);">${app.transferReason || ""}</span>
      </div>` : "";

    const actions = app.status === "Pending" ? `
      <div style="display:flex; gap:6px; flex-wrap:wrap;">
        <button class="submit-btn" style="padding:5px 10px; font-size:0.75rem; background:var(--success);" onclick="approveApplication('${app.id}')">
          ✅ Approve
        </button>
        <button class="submit-btn btn-secondary" style="padding:5px 10px; font-size:0.75rem; color:var(--danger);" onclick="rejectApplication('${app.id}')">
          ❌ Reject
        </button>
        <button class="submit-btn btn-secondary" style="padding:5px 10px; font-size:0.75rem;" onclick="openTransferModal('${app.id}', '${app.name}')">
          🔄 Transfer
        </button>
      </div>
    ` : `<span style="font-weight:700; font-size:0.8rem; color:${statusColor};">${app.status}</span>${transferInfo}`;

    const docLink = app.aadhaarDoc ? `<a href="${app.aadhaarDoc}" target="_blank" style="color:var(--accent-primary); font-size:0.8rem; font-weight:600;"><i class="fa-solid fa-file-pdf"></i> View Doc</a>` : `<span style="color:var(--text-muted); font-size:0.8rem;">Not uploaded</span>`;
    const photoThumb = app.photo ? `<img src="${app.photo}" style="width:36px; height:36px; border-radius:50%; object-fit:cover; margin-right:8px; vertical-align:middle; border:2px solid var(--glass-border);">` : `<span style="width:36px; height:36px; border-radius:50%; background:var(--accent-primary); display:inline-flex; align-items:center; justify-content:center; color:#fff; font-weight:700; font-size:0.85rem; margin-right:8px;">${app.name.charAt(0)}</span>`;

    return `
      <tr style="border-bottom: 1px solid var(--glass-border);">
        <td style="padding:14px 16px;">
          <strong style="font-size:0.8rem;">${app.id}</strong><br>
          <span style="font-size:0.72rem; color:var(--text-muted);">${app.appliedDate || "N/A"}</span>
        </td>
        <td style="padding:14px 16px;">
          <div style="display:flex; align-items:center;">
            ${photoThumb}
            <div>
              <div style="font-weight:600; font-size:0.9rem;">${app.name}</div>
              <div style="font-size:0.75rem; color:var(--text-muted);">${app.enrollment}</div>
              <div style="font-size:0.75rem; color:var(--text-muted);">${app.phone} • ${app.email}</div>
            </div>
          </div>
        </td>
        <td style="padding:14px 16px; font-size:0.85rem;">
          <div>${app.course || "N/A"}</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">Year ${app.year || "?"} • ${app.bloodGroup || "?"}</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">Aadhaar: ${app.aadhaar ? app.aadhaar.slice(0, 4) + "XXXX" + app.aadhaar.slice(-4) : "N/A"}</div>
        </td>
        <td style="padding:14px 16px;">${docLink}</td>
        <td style="padding:14px 16px; font-size:0.82rem; white-space:nowrap;">${app.appliedDate || "N/A"}</td>
        <td style="padding:14px 16px;"><span class="badge ${statusBadgeClass}">${app.status}</span></td>
        <td style="padding:14px 16px;">${actions}</td>
      </tr>
    `;
  }).join("");
}

window.filterAppsTab = function (filter) {
  renderAdminApplications(filter);
};

// ── In-page Confirm Modal (replaces browser confirm() which can be blocked) ──
function showConfirmModal(message, onYes) {
  // Remove existing modal if any
  const existing = document.getElementById("hms-confirm-modal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "hms-confirm-modal";
  modal.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:99999;display:flex;align-items:center;justify-content:center;`;
  modal.innerHTML = `
    <div style="background:var(--bg-secondary,#1e293b);border-radius:14px;padding:32px 28px;max-width:420px;width:90%;border:1px solid var(--glass-border,#334155);box-shadow:0 24px 60px rgba(0,0,0,0.5);">
      <div style="font-size:1.5rem;margin-bottom:12px;">⚠️</div>
      <p style="font-size:0.97rem;color:var(--text-primary,#f1f5f9);margin-bottom:24px;line-height:1.5;">${message}</p>
      <div style="display:flex;gap:12px;justify-content:flex-end;">
        <button id="hms-confirm-no" style="padding:9px 22px;border-radius:8px;border:1px solid var(--glass-border,#334155);background:transparent;color:var(--text-secondary,#94a3b8);font-size:0.9rem;cursor:pointer;font-weight:600;">Cancel</button>
        <button id="hms-confirm-yes" style="padding:9px 22px;border-radius:8px;border:none;background:var(--accent-primary,#3b82f6);color:#fff;font-size:0.9rem;cursor:pointer;font-weight:700;">Confirm</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById("hms-confirm-yes").onclick = () => { modal.remove(); onYes(); };
  document.getElementById("hms-confirm-no").onclick = () => modal.remove();
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.remove(); });
}

window.approveApplication = function (appId) {
  const apps = DB.get("registration_applications") || [];
  const app = apps.find(a => a.id === appId);
  if (!app) { alert("Application not found (ID: " + appId + ")"); return; }

  showConfirmModal(`Approve registration for <strong>${app.name}</strong> (${app.enrollment})?`, async () => {
    const token = sessionStorage.getItem("hms_token");
    if (!token) { alert("❌ Session expired. Please log in again."); return; }

    try {
      const res = await fetch("/api/hostel/approve-application", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ appId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Server error");

      // Update local cache
      const localApps = DB.get("registration_applications") || [];
      const localApp = localApps.find(a => a.id === appId);
      if (localApp) { localApp.status = "Approved"; DB.set("registration_applications", localApps); }

      // Sync full data from server
      await DB.syncFromServer();

      alert(`✅ Approved!\n${app.name} admitted.\nRoom: ${data.block}-${data.roomNo}`);
      renderAdminApplications();
      renderAdminDashboard();
      renderSidebarForRole();
    } catch (err) {
      alert("❌ Approval failed: " + err.message);
    }
  });
};

window.rejectApplication = function (appId) {
  const apps = DB.get("registration_applications") || [];
  const app = apps.find(a => a.id === appId);
  if (!app) { alert("Application not found."); return; }

  showConfirmModal(`Reject registration for <strong>${app.name}</strong>? They will be notified.`, async () => {
    const token = sessionStorage.getItem("hms_token");
    if (!token) { alert("❌ Session expired."); return; }

    try {
      const res = await fetch("/api/hostel/reject-application", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ appId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Server error");

      // Update local cache
      const localApps = DB.get("registration_applications") || [];
      const localApp = localApps.find(a => a.id === appId);
      if (localApp) { localApp.status = "Rejected"; DB.set("registration_applications", localApps); }

      alert(`❌ Application for ${app.name} has been rejected.`);
      renderAdminApplications();
      renderAdminDashboard();
      renderSidebarForRole();
    } catch (err) {
      alert("❌ Rejection failed: " + err.message);
    }
  });
};

window.openTransferModal = function (appId, name) {
  document.getElementById("transfer-app-id").value = appId;
  document.getElementById("transfer-app-name").textContent = name;
  document.getElementById("transfer-hostel-name").value = "";
  document.getElementById("transfer-reason").value = "";
  const modal = document.getElementById("transfer-modal");
  if (modal) modal.style.display = "flex";
};

window.closeTransferModal = function () {
  const modal = document.getElementById("transfer-modal");
  if (modal) modal.style.display = "none";
};

window.confirmTransfer = async function () {
  const appId = document.getElementById("transfer-app-id").value;
  const hostelName = document.getElementById("transfer-hostel-name").value.trim();
  const reason = document.getElementById("transfer-reason").value.trim();

  if (!hostelName) {
    alert("Please enter the recommended hostel name for transfer.");
    return;
  }

  const apps = DB.get("registration_applications") || [];
  const app = apps.find(a => a.id === appId);
  if (!app) return;

  const token = sessionStorage.getItem("hms_token");
  if (!token) { alert("❌ Session expired."); return; }

  try {
    const res = await fetch("/api/hostel/reject-application", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ appId, transferTo: hostelName, transferReason: reason || "Redirected to another hostel." })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Server error");

    // Update local cache
    const localApps = DB.get("registration_applications") || [];
    const localApp = localApps.find(a => a.id === appId);
    if (localApp) {
      localApp.status = "Rejected";
      localApp.transferTo = hostelName;
      localApp.transferReason = reason || "Redirected to another hostel.";
      DB.set("registration_applications", localApps);
    }

    closeTransferModal();
    alert(`🔄 Application for ${app.name} has been rejected.\nRecommended transfer to: ${hostelName}`);
    renderAdminApplications();
    renderAdminDashboard();
    renderSidebarForRole();
  } catch (err) {
    alert("❌ Transfer failed: " + err.message);
  }
};

function renderRoomAllocation() {

  const students = DB.get("students") || [];
  const rooms = DB.get("rooms") || [];

  // 1. Populate student selector dropdown (filter those without rooms or all for re-allocation)
  const selector = document.getElementById("alloc-student-select");
  if (selector) {
    selector.innerHTML = `<option value="">Choose Student...</option>` +
      students.slice(0, 40).map(s => `<option value="${s.enrollment}">${s.name} (${s.enrollment}) - Current: ${s.block}-${s.roomNo}</option>`).join("");
  }

  // 2. Render visual rooms map based on current filter block
  const filterBtns = document.querySelectorAll("[data-alloc-filter]");
  let activeBlock = "A";
  filterBtns.forEach(btn => {
    if (btn.classList.contains("active")) {
      activeBlock = btn.getAttribute("data-alloc-filter");
    }

    btn.onclick = () => {
      filterBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderRoomAllocation();
    };
  });

  const blockRooms = rooms.filter(r => r.block === activeBlock);
  const container = document.getElementById("room-grid-container");
  if (container) {
    container.innerHTML = blockRooms.map(r => {
      let stateClass = "vacant";
      if (r.occupied === r.capacity) stateClass = "full";
      else if (r.occupied > 0) stateClass = "partial";

      return `
        <div class="visual-room-node ${stateClass}" onclick="showRoomOccupants('${r.block}', '${r.roomNo}')">
          <div class="room-node-number">${r.roomNo}</div>
          <div class="room-node-status">${r.occupied}/${r.capacity} Beds</div>
        </div>
      `;
    }).join("");
  }
}

window.showRoomOccupants = function (block, roomNo) {
  const students = DB.get("students") || [];
  const roommates = students.filter(s => s.roomNo === roomNo && s.block === block);

  if (roommates.length > 0) {
    const list = roommates.map(r => `${r.name} (${r.enrollment}) - ${r.course}`).join("\n");
    alert(`Room ${block}-${roomNo} Occupants:\n\n${list}`);
  } else {
    alert(`Room ${block}-${roomNo} is vacant.`);
  }
};

function renderVisitorRegister() {
  const visitors = DB.get("visitor_register") || [];
  const tbody = document.getElementById("visitor-log-tbody");
  if (!tbody) return;

  if (visitors.length > 0) {
    tbody.innerHTML = visitors.slice().reverse().map(v => `
      <tr>
        <td>
          <div style="font-weight:600;">${v.visitorName}</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">${v.relation} | Phone: ${v.contact}</div>
        </td>
        <td>${v.studentName}</td>
        <td>Block ${v.block} - ${v.roomNo}</td>
        <td>${v.checkIn}</td>
        <td>${v.checkOut || `<span style="color:var(--warning); font-weight:600;"><i class="fa-solid fa-clock"></i> Active Visit</span>`}</td>
        <td>
          ${v.status === "Checked In" ? `
            <button class="submit-btn" style="padding: 4px 8px; font-size: 0.75rem; border-radius: 4px; background:var(--danger);" onclick="checkOutVisitor('${v.id}')">Check Out</button>
          ` : `<span style="font-weight:700; font-size:0.8rem; color:var(--success);"><i class="fa-solid fa-circle-check"></i> Out</span>`}
        </td>
      </tr>
    `).join("");
  } else {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:24px; color:var(--text-muted);">No entries logged today.</td></tr>`;
  }
}

window.checkOutVisitor = function (visitorId) {
  const visitors = DB.get("visitor_register") || [];
  const idx = visitors.findIndex(v => v.id === visitorId);
  if (idx !== -1) {
    const now = new Date();
    const timeStr = now.toLocaleDateString() + " " + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    visitors[idx].checkOut = timeStr;
    visitors[idx].status = "Checked Out";
    DB.set("visitor_register", visitors);
    renderVisitorRegister();
    renderViewData("admin-dashboard");
  }
};

// ==========================================
// ABOUT & MISCELLANEOUS PAGE
// ==========================================

function renderAboutSection() {
  // Emergency numbers rendering
  const contacts = DB.get("emergency_contacts") || [];
  const container = document.getElementById("about-emergency-contacts");
  if (container) {
    container.innerHTML = contacts.map(c => `
      <div class="contact-item-row">
        <div class="contact-name-role">
          <h4>${c.name}</h4>
          <p>${c.role}</p>
        </div>
        <a href="tel:${c.number}" class="call-anchor"><i class="fa-solid fa-phone"></i> Call Now</a>
      </div>
    `).join("");
  }

  // Events list rendering
  const events = DB.get("events") || [];
  const eventsBox = document.getElementById("about-events-list");
  if (eventsBox) {
    eventsBox.innerHTML = events.map(e => `
      <div style="background: rgba(148, 163, 184, 0.08); border-radius: 12px; border: 1px solid var(--glass-border); padding: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 700; font-size: 0.9rem; color: var(--accent-primary);">${e.title}</span>
          <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500;">${formatDate(e.date)}</span>
        </div>
        <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 6px; line-height: 1.4;">${e.description}</p>
        <span style="font-size: 0.7rem; color: var(--text-muted); display: block; margin-top: 6px;"><i class="fa-regular fa-clock"></i> Time: ${e.time} | Venue: ${e.venue}</span>
      </div>
    `).join("");
  }
}

// ==========================================
// FORM SUBMISSIONS & DATA MUTATIONS
// ==========================================

function setupFormSubmissions() {
  // 1. Student Complaint Submission
  const complaintForm = document.getElementById("complaint-form");
  if (complaintForm) {
    complaintForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const title = document.getElementById("complaint-title").value;
      const type = document.getElementById("complaint-type").value;
      const description = document.getElementById("complaint-desc").value;

      const complaints = DB.get("complaints") || [];
      const newId = `CMP-${String(complaints.length + 1).padStart(3, "0")}`;

      complaints.push({
        id: newId,
        enrollment: currentStudentEnrollment,
        title: title,
        type: type,
        description: description,
        date: getTodayDateString(),
        status: "Pending",
        adminComment: null,
        photo: null
      });

      DB.set("complaints", complaints);
      
      // Notify Admin
      const students = DB.get("students") || [];
      const currentStudent = students.find(s => s.enrollment === currentStudentEnrollment) || { name: "A Resident Student" };
      addNotification("admin", "New Complaint Filed", `${currentStudent.name} filed a complaint: "${title}"`, "admin-complaints", "complaint");

      complaintForm.reset();
      alert(`Complaint ${newId} logged successfully!`);
      renderComplaintsPage();
      renderStudentDashboard();
      renderHeader();
    });
  }

  // 2. Student Leave Request Submission
  const leaveForm = document.getElementById("leave-form");
  if (leaveForm) {
    leaveForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const from = document.getElementById("leave-from").value;
      const to = document.getElementById("leave-to").value;
      const reason = document.getElementById("leave-reason").value;

      const leaves = DB.get("leave_applications") || [];
      const newId = `LVE-${String(leaves.length + 1).padStart(3, "0")}`;

      leaves.push({
        id: newId,
        enrollment: currentStudentEnrollment,
        fromDate: from,
        toDate: to,
        reason: reason,
        status: "Pending",
        submittedDate: getTodayDateString()
      });

      DB.set("leave_applications", leaves);
      
      // Notify Admin
      const students = DB.get("students") || [];
      const currentStudent = students.find(s => s.enrollment === currentStudentEnrollment) || { name: "A Resident Student" };
      addNotification("admin", "New Leave Request", `${currentStudent.name} requested leave: "${reason}"`, "admin-leaves", "leave");

      leaveForm.reset();
      alert(`Leave Request ${newId} submitted. Warden approval pending.`);
      renderLeavesPage();
      renderHeader();
    });
  }

  // 3. Admin Mess Menu Update
  const adminMenuForm = document.getElementById("admin-menu-form");
  if (adminMenuForm) {
    adminMenuForm.addEventListener("submit", (e) => {
      e.preventDefault();
      
      const fullMenu = DB.get("food_menu") || {};
      const rows = document.querySelectorAll("#admin-menu-tbody tr");
      rows.forEach(row => {
        const day = row.getAttribute("data-day");
        if (day) {
          fullMenu[day] = {
            breakfast: row.querySelector('input[name="breakfast"]').value,
            lunch: row.querySelector('input[name="lunch"]').value,
            eveningSnack: row.querySelector('input[name="eveningSnack"]').value,
            dinner: row.querySelector('input[name="dinner"]').value
          };
        }
      });

      DB.set("food_menu", fullMenu);
      alert("Mess food menu updated successfully for all 7 days!");
      renderFoodMenu();
    });
  }

  // Student Menu Day Selector
  const studentMenuDay = document.getElementById("student-menu-day");
  if (studentMenuDay) {
    studentMenuDay.addEventListener("change", (e) => {
      renderFoodMenu(e.target.value);
    });
  }

  // 4. Admin Notices broadcast
  const adminNoticeForm = document.getElementById("admin-notice-form");
  if (adminNoticeForm) {
    adminNoticeForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const title = document.getElementById("notice-title-in").value;
      const type = document.getElementById("notice-type-in").value;
      const content = document.getElementById("notice-content-in").value;

      const notices = DB.get("notices") || [];
      const newId = `NTC-${String(notices.length + 1).padStart(3, "0")}`;

      notices.unshift({
        id: newId,
        date: getTodayDateString(),
        title: title,
        content: content,
        type: type
      });

      DB.set("notices", notices);
      adminNoticeForm.reset();
      alert("Notice broadcasted successfully!");
      renderAdminNotices();
      renderNotices();
    });
  }

  // 5. Admin Room Allocation
  const adminAllocationForm = document.getElementById("admin-allocation-form");
  if (adminAllocationForm) {
    adminAllocationForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const enrollment = document.getElementById("alloc-student-select").value;
      const block = document.getElementById("alloc-block").value;
      const roomNo = document.getElementById("alloc-room").value;

      if (!enrollment) {
        alert("Please choose a valid student.");
        return;
      }

      // Check if room has capacity
      const rooms = DB.get("rooms") || [];
      const roomIdx = rooms.findIndex(r => r.roomNo === roomNo && r.block === block);
      if (roomIdx === -1) {
        alert(`Room ${block}-${roomNo} not found in room directories.`);
        return;
      }

      const selectedRoom = rooms[roomIdx];
      if (selectedRoom.occupied >= selectedRoom.capacity) {
        alert(`Room ${block}-${roomNo} is fully occupied!`);
        return;
      }

      // Allocate: Update Student details
      const students = DB.get("students") || [];
      const stIdx = students.findIndex(s => s.enrollment === enrollment);
      if (stIdx !== -1) {
        // Decrease occupied count from old room
        const oldRoomNo = students[stIdx].roomNo;
        const oldBlock = students[stIdx].block;
        const oldRoomIdx = rooms.findIndex(r => r.roomNo === oldRoomNo && r.block === oldBlock);
        if (oldRoomIdx !== -1 && rooms[oldRoomIdx].occupied > 0) {
          rooms[oldRoomIdx].occupied--;
          rooms[oldRoomIdx].status = rooms[oldRoomIdx].occupied === 0 ? "Vacant" : "Partially Occupied";
        }

        // Assign new room
        students[stIdx].roomNo = roomNo;
        students[stIdx].block = block;
        DB.set("students", students);

        // Increase occupied count of new room
        rooms[roomIdx].occupied++;
        rooms[roomIdx].status = rooms[roomIdx].occupied === rooms[roomIdx].capacity ? "Fully Occupied" : "Partially Occupied";
        DB.set("rooms", rooms);

        alert(`Allocated Room ${block}-${roomNo} to student ${students[stIdx].name} successfully!`);
        renderRoomAllocation();
        renderAdminStudents();
        renderHeader();
      }
    });
  }

  // 6. Admin Visitor Check-In Log
  const adminVisitorForm = document.getElementById("admin-visitor-form");
  if (adminVisitorForm) {
    adminVisitorForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const vName = document.getElementById("visitor-name").value;
      const relation = document.getElementById("visitor-relation").value;
      const contact = document.getElementById("visitor-contact").value;
      const studentName = document.getElementById("visitor-student").value;
      const room = document.getElementById("visitor-room").value;
      const purpose = document.getElementById("visitor-purpose").value;

      const visitors = DB.get("visitor_register") || [];
      const newId = `VST-${String(visitors.length + 1).padStart(3, "0")}`;

      const now = new Date();
      const checkInTime = now.toLocaleDateString() + " " + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      visitors.push({
        id: newId,
        studentName: studentName,
        roomNo: room,
        block: "B", // default mock block
        visitorName: vName,
        relation: relation,
        contact: contact,
        purpose: purpose,
        checkIn: checkInTime,
        checkOut: null,
        status: "Checked In"
      });

      DB.set("visitor_register", visitors);
      adminVisitorForm.reset();
      alert(`Visitor Check-In Logged! ID: ${newId}`);
      renderVisitorRegister();
      renderViewData("admin-dashboard");
    });
  }

  // 7. Student Feedback Form Submission
  const feedbackForm = document.getElementById("feedback-form");
  if (feedbackForm) {
    feedbackForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const cat = document.getElementById("feedback-category").value;
      const comments = document.getElementById("feedback-comment").value;

      const feedback = DB.get("feedback") || [];
      const newId = `FDB-${String(feedback.length + 1).padStart(3, "0")}`;

      feedback.push({
        id: newId,
        enrollment: currentStudentEnrollment,
        category: cat,
        comment: comments,
        rating: 5,
        date: getTodayDateString()
      });

      DB.set("feedback", feedback);
      
      // Notify Admin
      const students = DB.get("students") || [];
      const currentStudent = students.find(s => s.enrollment === currentStudentEnrollment) || { name: "A Resident Student" };
      addNotification("admin", "New Feedback Submitted", `${currentStudent.name} submitted feedback on "${cat}"`, "settings-feedback", "feedback");

      feedbackForm.reset();
      alert("Thank you for your valuable feedback!");
    });
  }

  // 8. Settings change password simulation
  const pwdForm = document.getElementById("settings-pwd-form");
  if (pwdForm) {
    pwdForm.addEventListener("submit", (e) => {
      e.preventDefault();
      alert("Password changed successfully!");
      pwdForm.reset();
    });
  }
}

// ==========================================
// MODAL DIALOG CONTROLLER (PAYMENT, QR)
// ==========================================

function setupModalHandlers() {
  const closeBtns = document.querySelectorAll(".modal-close");
  closeBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const type = btn.getAttribute("data-close");
      closeModal(type);
    });
  });

  // Modal payment submission
  const paymentForm = document.getElementById("payment-form");
  if (paymentForm) {
    paymentForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const fineId = document.getElementById("modal-payment").getAttribute("data-fine-id");

      const btn = paymentForm.querySelector("button[type='submit']");
      btn.textContent = "Processing Payment...";
      btn.disabled = true;

      // Simulate network request delay
      setTimeout(() => {
        const fines = DB.get("fines") || [];
        const idx = fines.findIndex(f => f.id === fineId);
        if (idx !== -1) {
          fines[idx].status = "Paid";
          DB.set("fines", fines);
        }

        btn.textContent = "Pay Fine Securely";
        btn.disabled = false;
        closeModal("payment");
        paymentForm.reset();

        // Success micro-animations (Confetti)
        triggerConfettiAnimation();

        alert("Payment completed successfully!");

        // Refresh views
        renderFinesPage();
        renderStudentDashboard();
        renderHeader();
      }, 1500);
    });
  }

  // QR Simulator success trigger
  const btnSimulateQR = document.getElementById("btn-simulate-qr-scan");
  if (btnSimulateQR) {
    btnSimulateQR.addEventListener("click", () => {
      const attendance = DB.get("attendance") || [];
      const today = getTodayDateString();

      // Check if already checked in today
      const alreadyChecked = attendance.some(a => a.enrollment === currentStudentEnrollment && a.date === today);
      if (alreadyChecked) {
        alert("You have already logged present for today!");
        closeModal("qr-attendance");
        return;
      }

      // Add check in
      attendance.push({
        enrollment: currentStudentEnrollment,
        date: today,
        status: "Present"
      });

      DB.set("attendance", attendance);
      closeModal("qr-attendance");

      triggerConfettiAnimation();
      alert("QR Scan verified! Present status registered for today.");

      renderAttendancePage();
    });
  }
}

function closeModal(modalType) {
  const modal = document.getElementById(`modal-${modalType}`);
  if (modal) modal.classList.remove("active");
}

function setupQuickActions() {
  document.addEventListener("click", (e) => {
    const actionBtn = e.target.closest(".action-btn");
    if (!actionBtn) return;
    const action = actionBtn.getAttribute("data-action");

    if (action === "quick-complaint") {
      routeTo("complaints");
    } else if (action === "quick-leave") {
      routeTo("leaves");
    } else if (action === "quick-attendance") {
      openQRAttendanceModal();
    } else if (action === "quick-fine") {
      routeTo("fines");
    }
  });

  const payNowAlertBtn = document.getElementById("dash-btn-pay-fine");
  if (payNowAlertBtn) {
    payNowAlertBtn.addEventListener("click", () => {
      const fines = DB.get("fines") || [];
      const rahulFine = fines.find(f => f.enrollment === currentStudentEnrollment && f.status === "Unpaid");
      if (rahulFine) {
        openPaymentModal(rahulFine.id, rahulFine.amount);
      }
    });
  }

  // Attendance Page Quick Checkin
  const mainQRBtn = document.getElementById("btn-qr-attendance");
  if (mainQRBtn) {
    mainQRBtn.addEventListener("click", openQRAttendanceModal);
  }
}

function openQRAttendanceModal() {
  const modal = document.getElementById("modal-qr-attendance");
  if (modal) {
    modal.classList.add("active");
    // Render QR Code using the CDN library QRCode
    const container = document.getElementById("qr-code-box");
    if (container) {
      container.innerHTML = ""; // clear previous
      try {
        new QRCode(container, {
          text: `https://hostel.campus/attendance?student=${currentStudentEnrollment}&timestamp=${Date.now()}`,
          width: 180,
          height: 180,
          colorDark: "#0f172a",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.H
        });
      } catch (err) {
        // Fallback if library fails
        container.innerHTML = `<i class="fa-solid fa-qrcode" style="font-size: 8rem; color: var(--text-primary);"></i>`;
      }
    }
  }
}

// ==========================================
// HELPERS
// ==========================================

function getInitials(name) {
  if (!name) return "";
  const parts = name.split(" ");
  if (parts.length > 1) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0][0].toUpperCase();
}

function getTodayDateString() {
  // Mock current date format: "YYYY-MM-DD" matching seeded dates (2026-06-27)
  const d = new Date();
  // We align with the system local time date June 27, 2026
  return "2026-06-27";
}

function formatDate(dateString) {
  if (!dateString) return "";
  try {
    const parts = dateString.split("-");
    if (parts.length === 3) {
      // "YYYY-MM-DD"
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const day = parseInt(parts[2]);
      const month = months[parseInt(parts[1]) - 1];
      const year = parts[0];
      return `${day} ${month} ${year}`;
    }
    return dateString;
  } catch (e) {
    return dateString;
  }
}

function truncateString(str, num) {
  if (str.length <= num) return str;
  return str.slice(0, num) + "...";
}

function triggerConfettiAnimation() {
  try {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#2563eb', '#10b981', '#f59e0b']
    });
  } catch (e) {
    console.log("Confetti not available");
  }
}



// ==========================================
// ABOUT HOSTEL & DYNAMIC RULES RENDERER
// ==========================================

function renderAboutSection() {
  const info = DB.get("hostel_info") || {
    name: "Grand Heritage Boys Hostel",
    address: "Sector 15, Knowledge Park II, Greater Noida, UP - 201310",
    wardenName: "Dr. Sanjay Kumar",
    wardenTitle: "Chief Warden | Room A-12 Office"
  };
  const rules = DB.get("hostel_rules") || [];

  const hostelName = document.getElementById("about-hostel-name");
  const hostelAddress = document.getElementById("about-hostel-address");
  const wardenName = document.getElementById("about-warden-name");
  const wardenTitle = document.getElementById("about-warden-title");
  const wardenAvatar = document.getElementById("about-warden-avatar");
  const rulesList = document.getElementById("about-rules-list");

  if (hostelName) hostelName.textContent = info.name;
  if (hostelAddress) hostelAddress.textContent = info.address;
  if (wardenName) wardenName.textContent = info.wardenName;
  if (wardenTitle) wardenTitle.textContent = info.wardenTitle;
  if (wardenAvatar) wardenAvatar.textContent = getInitials(info.wardenName);

  const specRooms = document.getElementById("about-spec-rooms");
  const specSeater = document.getElementById("about-spec-seater");
  const specAc = document.getElementById("about-spec-ac");
  const specBlocks = document.getElementById("about-spec-blocks");

  if (specRooms) specRooms.textContent = info.totalRooms || 120;
  if (specSeater) specSeater.textContent = info.roomSeater ? `${info.roomSeater} Seater` : "2 Seater";
  if (specAc) specAc.textContent = info.acType ? `${info.acType} Rooms` : "AC Rooms";
  if (specBlocks) specBlocks.textContent = info.blocks || "A, B, C";

  // Show Hostel Access Code card — warden only (admin can copy & share with eligible students)
  const existingCodeCard = document.getElementById("about-access-code-card");
  const aboutSpecsParent = specBlocks ? specBlocks.closest(".info-card")?.parentNode : null;
  if (aboutSpecsParent && !existingCodeCard) {
    const codeCard = document.createElement("div");
    codeCard.id = "about-access-code-card";
    codeCard.className = "info-card";
    codeCard.style.cssText = "margin-top: 20px; padding: 20px 24px;";
    aboutSpecsParent.appendChild(codeCard);
  }
  const codeCard = document.getElementById("about-access-code-card");
  if (codeCard) {
    const currentSession = JSON.parse(sessionStorage.getItem("hms_session") || "{}");
    if (currentSession.role === "admin") {
      codeCard.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
          <div>
            <h4 style="font-size:0.9rem; font-weight:700; color:var(--accent-primary); margin-bottom:4px;">🔑 Hostel Access Code (Admin Only)</h4>
            <p style="font-size:0.75rem; color:var(--text-muted); margin-bottom:12px;">Share this code ONLY with students eligible for admission to this hostel.</p>
            <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
              <code style="background:rgba(37,99,235,0.1); border:1px solid rgba(37,99,235,0.3); border-radius:8px; padding:10px 18px; font-size:1.2rem; font-weight:800; letter-spacing:0.12em; color:var(--accent-primary);">${info.accessCode || "NOT SET"}</code>
              <button class="submit-btn btn-secondary" style="padding:8px 14px; font-size:0.8rem;" onclick="copyAccessCode('${info.accessCode || ""}')">📋 Copy Code</button>
            </div>
          </div>
          ${!info.accessCode ? `<span class="badge pending" style="font-size:0.8rem;">⚠️ No Code Set</span>` : `<span class="badge resolved" style="font-size:0.8rem;">✅ Active</span>`}
        </div>
      `;
    } else {
      codeCard.remove();
    }
  }

  if (rulesList) {
    if (rules.length === 0) {
      rulesList.innerHTML = `<li style="list-style:none; color:var(--text-muted);">No rules defined yet.</li>`;
    } else {
      rulesList.innerHTML = rules.map(rule => `<li>${rule}</li>`).join("");
    }
  }

  // Render Emergency Contacts
  const emergencyList = document.getElementById("about-emergency-contacts");
  if (emergencyList) {
    const contacts = DB.get("emergency_contacts") || [];
    if (contacts.length === 0) {
      emergencyList.innerHTML = `<p style="font-size:0.85rem; color:var(--text-muted); text-align:center;">No contacts found.</p>`;
    } else {
      emergencyList.innerHTML = contacts.map(c => `
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--glass-border); padding-bottom:8px; margin-bottom:8px;">
          <div>
            <h4 style="font-size:0.9rem; font-weight:600; color:var(--text-primary);">${c.name}</h4>
            <p style="font-size:0.75rem; color:var(--text-muted);">${c.role}</p>
          </div>
          <a href="tel:${c.number}" style="color:var(--accent-primary); font-weight:600; font-size:0.85rem;"><i class="fa-solid fa-phone"></i> ${c.number}</a>
        </div>
      `).join("");
    }
  }

  // Render Events List
  const eventsList = document.getElementById("about-events-list");
  if (eventsList) {
    const events = DB.get("events") || [];
    if (events.length === 0) {
      eventsList.innerHTML = `<p style="font-size:0.85rem; color:var(--text-muted); text-align:center;">No scheduled events.</p>`;
    } else {
      eventsList.innerHTML = events.map(e => `
        <div style="background:rgba(148,163,184,0.04); border:1px solid var(--glass-border); border-radius:var(--border-radius); padding:12px; margin-bottom: 8px;">
          <h4 style="font-size:0.9rem; font-weight:600; color:var(--accent-primary);">${e.title}</h4>
          <p style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">
            <i class="fa-regular fa-calendar"></i> ${formatDate(e.date)} | <i class="fa-regular fa-clock"></i> ${e.time}
          </p>
          <p style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">
            <i class="fa-solid fa-location-dot"></i> ${e.venue}
          </p>
          <p style="font-size:0.8rem; color:var(--text-secondary); margin-top:6px; line-height:1.4;">${e.description}</p>
        </div>
      `).join("");
    }
  }
}

// ==========================================
// CHIEF WARDEN HOSTEL RULES & PROFILE MANAGER
// ==========================================

function renderAdminHostel() {
  const info = DB.get("hostel_info") || {
    name: "Grand Heritage Boys Hostel",
    address: "Sector 15, Knowledge Park II, Greater Noida, UP - 201310",
    wardenName: "Dr. Sanjay Kumar",
    wardenTitle: "Chief Warden | Room A-12 Office"
  };

  // 1. Setup Tab switching click listeners
  const tabBtns = document.querySelectorAll("[data-manage-tab]");
  tabBtns.forEach(btn => {
    btn.onclick = () => {
      tabBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const tab = btn.getAttribute("data-manage-tab");
      document.querySelectorAll(".manage-tab-content").forEach(c => c.style.display = "none");
      document.getElementById(`manage-tab-${tab}`).style.display = "block";
    };
  });

  // 2. General Profile Tab Populate
  const formName = document.getElementById("hostel-profile-name");
  const formAddress = document.getElementById("hostel-profile-address");
  const formWarden = document.getElementById("hostel-profile-warden");
  const formTitle = document.getElementById("hostel-profile-title");

  if (formName) formName.value = info.name;
  if (formAddress) formAddress.value = info.address;
  if (formWarden) formWarden.value = info.wardenName;
  if (formTitle) formTitle.value = info.wardenTitle;

  // Bind general profile update form
  const profileForm = document.getElementById("admin-hostel-profile-form");
  if (profileForm) {
    profileForm.onsubmit = (e) => {
      e.preventDefault();
      const updatedInfo = {
        name: formName.value.trim(),
        address: formAddress.value.trim(),
        wardenName: formWarden.value.trim(),
        wardenTitle: formTitle.value.trim()
      };
      DB.set("hostel_info", updatedInfo);
      renderAboutSection();
      renderHeader();
      alert("Hostel profile details updated successfully!");
    };
  }

  // 3. Rules Tab render & bind
  renderAdminRulesList();
  const addRuleForm = document.getElementById("admin-add-rule-form");
  if (addRuleForm) {
    addRuleForm.onsubmit = (e) => {
      e.preventDefault();
      const newRuleText = document.getElementById("new-rule-text");
      if (newRuleText) {
        const rules = DB.get("hostel_rules") || [];
        rules.push(newRuleText.value.trim());
        DB.set("hostel_rules", rules);
        newRuleText.value = "";
        renderAdminRulesList();
        renderAboutSection();
        alert("New rule added successfully!");
      }
    };
  }

  // 4. Emergency Contacts Tab render & bind
  renderAdminContactsList();
  const addContactForm = document.getElementById("admin-add-contact-form");
  if (addContactForm) {
    addContactForm.onsubmit = (e) => {
      e.preventDefault();
      const nameVal = document.getElementById("new-contact-name").value.trim();
      const numVal = document.getElementById("new-contact-number").value.trim();
      const roleVal = document.getElementById("new-contact-role").value.trim();

      const contacts = DB.get("emergency_contacts") || [];
      contacts.push({ name: nameVal, number: numVal, role: roleVal });
      DB.set("emergency_contacts", contacts);

      document.getElementById("admin-add-contact-form").reset();
      renderAdminContactsList();
      renderAboutSection();
      alert("Emergency contact line registered successfully!");
    };
  }

  // 5. Events Tab render & bind
  renderAdminEventsList();
  const addEventForm = document.getElementById("admin-add-event-form");
  if (addEventForm) {
    addEventForm.onsubmit = (e) => {
      e.preventDefault();
      const titleVal = document.getElementById("new-event-title").value.trim();
      const dateVal = document.getElementById("new-event-date").value;
      const timeVal = document.getElementById("new-event-time").value.trim();
      const venueVal = document.getElementById("new-event-venue").value.trim();
      const descVal = document.getElementById("new-event-desc").value.trim();

      const events = DB.get("events") || [];
      events.push({
        id: "EVT-" + Math.floor(100 + Math.random() * 900),
        title: titleVal,
        date: dateVal,
        time: timeVal,
        venue: venueVal,
        description: descVal
      });
      DB.set("events", events);

      document.getElementById("admin-add-event-form").reset();
      renderAdminEventsList();
      renderAboutSection();
      alert("New hostel event scheduled successfully!");
    };
  }

  // 6. Feedback Tab render
  renderAdminFeedbackList();
}

function renderAdminRulesList() {
  const container = document.getElementById("admin-rules-list-container");
  if (!container) return;

  const rules = DB.get("hostel_rules") || [];
  if (rules.length === 0) {
    container.innerHTML = `<li style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 20px 0;">No active rules.</li>`;
    return;
  }

  container.innerHTML = rules.map((rule, idx) => `
    <li style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; font-size: 0.85rem; border-bottom: 1px solid var(--glass-border); padding-bottom: 8px;">
      <span style="color: var(--text-secondary); line-height:1.4;">${idx + 1}. ${rule}</span>
      <button class="action-btn unresolved" onclick="deleteHostelRule(${idx})" style="padding: 2px 6px; font-size: 0.7rem; border-color:var(--danger); color:var(--danger); background:none; cursor:pointer;" title="Delete Rule">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    </li>
  `).join("");
}

function deleteHostelRule(index) {
  if (confirm("Are you sure you want to delete this rule?")) {
    const rules = DB.get("hostel_rules") || [];
    rules.splice(index, 1);
    DB.set("hostel_rules", rules);
    renderAdminRulesList();
    renderAboutSection();
    alert("Rule deleted successfully.");
  }
}

function renderAdminContactsList() {
  const container = document.getElementById("admin-contacts-list-container");
  if (!container) return;

  const contacts = DB.get("emergency_contacts") || [];
  if (contacts.length === 0) {
    container.innerHTML = `<li style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 20px 0;">No contact lines active.</li>`;
    return;
  }

  container.innerHTML = contacts.map((c, idx) => `
    <li style="display: flex; justify-content: space-between; align-items: center; gap: 12px; font-size: 0.85rem; border-bottom: 1px solid var(--glass-border); padding-bottom: 8px;">
      <div>
        <div style="font-weight: 600; color:var(--text-primary);">${c.name}</div>
        <div style="font-size: 0.75rem; color: var(--text-muted);">${c.role} | ${c.number}</div>
      </div>
      <button class="action-btn unresolved" onclick="deleteEmergencyContact(${idx})" style="padding: 2px 6px; font-size: 0.7rem; border-color:var(--danger); color:var(--danger); background:none; cursor:pointer;" title="Delete Contact">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    </li>
  `).join("");
}

function deleteEmergencyContact(index) {
  if (confirm("Are you sure you want to delete this contact line?")) {
    const contacts = DB.get("emergency_contacts") || [];
    contacts.splice(index, 1);
    DB.set("emergency_contacts", contacts);
    renderAdminContactsList();
    renderAboutSection();
    alert("Emergency contact line deleted successfully.");
  }
}

function renderAdminEventsList() {
  const container = document.getElementById("admin-events-list-container");
  if (!container) return;

  const events = DB.get("events") || [];
  if (events.length === 0) {
    container.innerHTML = `<li style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 20px 0;">No scheduled events.</li>`;
    return;
  }

  container.innerHTML = events.map((e, idx) => `
    <li style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; font-size: 0.85rem; border-bottom: 1px solid var(--glass-border); padding-bottom: 8px;">
      <div>
        <div style="font-weight: 600; color:var(--text-primary);">${e.title}</div>
        <div style="font-size: 0.75rem; color: var(--text-muted);">${formatDate(e.date)} | ${e.time} | ${e.venue}</div>
      </div>
      <button class="action-btn unresolved" onclick="deleteHostelEvent(${idx})" style="padding: 2px 6px; font-size: 0.7rem; border-color:var(--danger); color:var(--danger); background:none; cursor:pointer;" title="Delete Event">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    </li>
  `).join("");
}

function deleteHostelEvent(index) {
  if (confirm("Are you sure you want to delete this event?")) {
    const events = DB.get("events") || [];
    events.splice(index, 1);
    DB.set("events", events);
    renderAdminEventsList();
    renderAboutSection();
    alert("Hostel event deleted successfully.");
  }
}

window.deleteHostelRule = deleteHostelRule;
window.deleteEmergencyContact = deleteEmergencyContact;
window.deleteHostelEvent = deleteHostelEvent;

// View detailed application info in modal
function reviewApplicationDetails(appId) {
  const apps = DB.get("registration_applications") || [];
  const app = apps.find(a => a.id === appId);
  if (!app) return;

  const modal = document.getElementById("modal-app-details");
  if (!modal) return;

  // Fill modal fields
  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || "N/A"; };
  const setSrc = (id, src) => { const el = document.getElementById(id); if (el) el.src = src || ""; };

  setEl("app-modal-id", app.id);
  setEl("app-modal-name", app.name);
  setEl("app-modal-enrollment", app.enrollment);
  setEl("app-modal-email", app.email);
  setEl("app-modal-phone", app.phone);
  setEl("app-modal-parent", app.parentPhone);
  setEl("app-modal-course", app.course);
  setEl("app-modal-year", app.academicYear || app.year);
  setEl("app-modal-blood", app.bloodGroup);
  setEl("app-modal-aadhaar", app.aadhaar);
  setEl("app-modal-address", app.address);
  setEl("app-modal-status", app.status);
  setEl("app-modal-date", app.appliedDate);

  if (app.photo) setSrc("app-modal-photo", app.photo);

  modal.style.display = "flex";
}

window.reviewApplicationDetails = reviewApplicationDetails;


function renderSettingsPage() {
  // Sync preferences checkbox
  const settings = DB.get("settings") || {};
  const darkCheckbox = document.getElementById("settings-darkmode");
  if (darkCheckbox) {
    darkCheckbox.checked = !!settings.darkMode;
  }

  // Bind change password form
  const pwdForm = document.getElementById("settings-pwd-form");
  if (pwdForm) {
    pwdForm.onsubmit = (e) => {
      e.preventDefault();
      const currPwd = document.getElementById("settings-curr-pwd").value;
      const newPwd = document.getElementById("settings-new-pwd").value;
      const token = sessionStorage.getItem("hms_token");

      if (!token) {
        alert("You must be logged in to change your password.");
        return;
      }

      fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword: currPwd, newPassword: newPwd })
      })
        .then(res => {
          if (!res.ok) {
            return res.json().then(err => { throw new Error(err.error || "Password change failed"); });
          }
          return res.json();
        })
        .then(data => {
          alert(data.message || "Password changed successfully!");
          pwdForm.reset();
        })
        .catch(err => {
          alert("❌ Error: " + err.message);
        });
    };
  }

  // Handle Warden Hostel Control Board section display
  const adminSection = document.getElementById("admin-settings-hostel-section");
  if (adminSection) {
    if (currentRole === "admin") {
      adminSection.style.display = "block";
      renderAdminHostel();
    } else {
      adminSection.style.display = "none";
    }
  }
}

// ==========================================
// UTILITY: Copy Hostel Access Code
// ==========================================
window.copyAccessCode = function (code) {
  if (!code) {
    alert("No access code set. Please configure the hostel first.");
    return;
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(code).then(() => {
      alert(`Hostel Access Code copied!\n\n"${code}"\n\nShare this with eligible students only.`);
    }).catch(() => {
      prompt("Copy this code manually (Ctrl+C):", code);
    });
  } else {
    prompt("Copy this code manually (Ctrl+C):", code);
  }
};

// ==========================================
// NOTIFICATION SYSTEM CONTROLLER
// ==========================================
function initNotificationSystem() {
  const bell = document.getElementById("notification-bell");
  const dropdown = document.getElementById("notification-dropdown");
  const clearBtn = document.getElementById("clear-notifications");

  if (bell && dropdown) {
    // Toggle dropdown on bell click
    bell.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdown.classList.toggle("active");
    });

    // Close dropdown on click outside
    document.addEventListener("click", (e) => {
      if (!dropdown.contains(e.target) && e.target !== bell && !bell.contains(e.target)) {
        dropdown.classList.remove("active");
      }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      clearAllNotifications();
    });
  }

  renderNotifications();
}

function addNotification(recipient, title, desc, target, type) {
  const notifications = DB.get("notifications") || [];
  const newNotif = {
    id: "notif_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    recipient: recipient, // 'admin' or enrollmentId
    title: title,
    desc: desc,
    target: target,
    type: type, // 'leave', 'complaint', 'feedback'
    read: false,
    date: new Date().toISOString()
  };
  notifications.unshift(newNotif);
  DB.set("notifications", notifications);
  renderNotifications();
}

function renderNotifications() {
  const container = document.getElementById("notification-list");
  const notifDot = document.getElementById("notif-dot");
  if (!container) return;

  const notifications = DB.get("notifications") || [];
  // Filter notifications relevant to current role / student
  const relevant = notifications.filter(n => {
    if (currentRole === "admin") {
      return n.recipient === "admin";
    } else {
      return n.recipient === currentStudentEnrollment;
    }
  });
  const unread = relevant.filter(n => !n.read);

  // Update bell red dot
  if (notifDot) {
    notifDot.style.display = unread.length > 0 ? "block" : "none";
  }

  if (relevant.length === 0) {
    container.innerHTML = `<div class="notification-empty">No notifications yet.</div>`;
    return;
  }

  container.innerHTML = relevant.map(n => {
    let iconClass = "fa-info-circle";
    if (n.type === "leave") iconClass = "fa-file-signature";
    else if (n.type === "complaint") iconClass = "fa-circle-exclamation";
    else if (n.type === "feedback") iconClass = "fa-comment-dots";

    return `
      <div class="notification-item ${n.read ? "" : "unread"}" onclick="handleNotificationClick('${n.id}')">
        <div class="notification-icon ${n.type}">
          <i class="fa-solid ${iconClass}"></i>
        </div>
        <div class="notification-info">
          <div class="notification-title">${escapeHtml(n.title)}</div>
          <div class="notification-desc">${escapeHtml(n.desc)}</div>
          <div class="notification-time">${getNotifTimeElapsed(n.date)}</div>
        </div>
      </div>
    `;
  }).join("");
}

function clearAllNotifications() {
  let notifications = DB.get("notifications") || [];
  // Only clear notifications for current role / student
  notifications = notifications.filter(n => {
    if (currentRole === "admin") {
      return n.recipient !== "admin";
    } else {
      return n.recipient !== currentStudentEnrollment;
    }
  });
  DB.set("notifications", notifications);
  renderNotifications();
}

window.handleNotificationClick = function(id) {
  const notifications = DB.get("notifications") || [];
  const notif = notifications.find(n => n.id === id);
  if (!notif) return;

  // Mark as read
  notif.read = true;
  DB.set("notifications", notifications);

  // Close dropdown
  const dropdown = document.getElementById("notification-dropdown");
  if (dropdown) dropdown.classList.remove("active");

  // Route to page
  if (notif.target) {
    if (notif.target === "settings-feedback") {
      routeTo("settings");
      // Switch Warden Hostel Board tab to Student Feedback tab
      const tabBtns = document.querySelectorAll("[data-manage-tab]");
      tabBtns.forEach(btn => {
        if (btn.getAttribute("data-manage-tab") === "feedback") {
          btn.click();
        }
      });
    } else {
      routeTo(notif.target);
    }
  }

  renderNotifications();
  renderHeader();
};

function getNotifTimeElapsed(dateStr) {
  const past = new Date(dateStr);
  const now = new Date();
  const diffMs = now - past;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);

  if (diffSec < 60) return "Just Now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return formatDate(dateStr.split("T")[0]);
}

function escapeHtml(text) {
  if (!text) return "";
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// ==========================================
// STUDENT FEEDBACK DIRECTORY RENDERER
// ==========================================
function renderAdminFeedbackList() {
  const container = document.getElementById("admin-feedback-table-body");
  if (!container) return;

  const feedbackList = DB.get("feedback") || [];
  const students = DB.get("students") || [];

  if (feedbackList.length === 0) {
    container.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 24px;">No student feedback submitted yet.</td></tr>`;
    return;
  }

  container.innerHTML = feedbackList.slice().reverse().map(f => {
    const student = students.find(s => s.enrollment === f.enrollment) || { name: "Resident Student", roomNo: "N/A" };
    return `
      <tr>
        <td>
          <div style="font-weight: 600;">${student.name}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">Room ${student.roomNo} | ${f.enrollment}</div>
        </td>
        <td><span class="badge inprogress" style="background: rgba(245, 158, 11, 0.08); color: var(--warning);">${f.category}</span></td>
        <td style="color: var(--text-secondary); max-width: 250px; white-space: normal; word-wrap: break-word;">${escapeHtml(f.comment)}</td>
        <td>${formatDate(f.date)}</td>
      </tr>
    `;
  }).join("");
}

