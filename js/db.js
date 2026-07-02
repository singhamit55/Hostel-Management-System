/**
 * db.js - Hybrid LocalStorage & Backend Synchronization Layer
 * Handles local caching and background synchronization with the multi-tenant server.
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
          const { wardenName, wardenTitle, adminUsername, adminPassword, hostelName, hostelAddress, totalRooms, roomSeater, acType, blocks, roomsPerBlock, accessCode, bgImage, dashImage } = body;

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
            calculatedRooms: parseInt(totalRooms) || 120,
            bgImage: bgImage || "",
            dashImage: dashImage || ""
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
            breakfast: "Poha, Milk, Sprouts",
            lunch: "Rice, Dal, Seasonal Sabji, Roti, Salad",
            eveningSnack: "Tea, Veg Sandwich, Biscuits",
            dinner: "Roti, Paneer Butter Masala, Dal Tadka, Sweet"
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
          const apps2 = JSON.parse(localStorage.getItem("hms_registration_applications") || "[]");
          const alreadyApplied = apps2.some(a => a.enrollment.toUpperCase() === enrollment.toUpperCase());
          if (students.some(s => s.enrollment.toUpperCase() === enrollment.toUpperCase()) || alreadyApplied) {
            return mockResponse(400, { error: "This enrollment number is already registered or has a pending application." });
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
              return mockResponse(200, { success: true, role: 'admin', token: 'mock_token_admin', hostelId: 'hostel_demo', name: admin.name });
            }
            return mockResponse(401, { error: "Invalid credentials. Please register your hostel first." });
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
            photo: app.photo || '',
            email: app.email,
            phone: app.phone,
            parentPhone: app.parentPhone,
            course: app.course,
            academicYear: app.academicYear || app.year || '',
            year: app.academicYear || app.year || '',
            bloodGroup: app.bloodGroup,
            aadhaar: app.aadhaar,
            address: app.address,
            roomNo: allocatedRoom.roomNo,
            block: allocatedRoom.block,
            hostelId: 'hostel_demo',
            password: app.password,
            status: 'Approved'
          };
          const existIdx = students.findIndex(s => s.enrollment.toLowerCase() === app.enrollment.toLowerCase());
          if (existIdx !== -1) { students[existIdx] = studentObj; } else { students.push(studentObj); }
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

        return mockResponse(404, { error: "Mock Route not found." });
      }
    }
    return originalFetch(input, init);
  };
})();

const DB_PREFIX = "hms_";

const DB = {
  get(key) {
    try {
      const data = localStorage.getItem(DB_PREFIX + key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error(`Error reading ${key} from localStorage:`, e);
      return null;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(DB_PREFIX + key, JSON.stringify(value));

      // Background Sync to Server if user is logged in
      const sessionStr = sessionStorage.getItem("hms_session");
      const token = sessionStorage.getItem("hms_token");
      if (sessionStr && token) {
        fetch("/api/hostel/save-key", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ key, value })
        })
          .then(res => res.json())
          .then(data => {
            if (data.error) {
              console.warn(`Sync warning for key '${key}':`, data.error);
            }
          })
          .catch(err => {
            console.error(`Sync network error for key '${key}':`, err);
          });
      }
      return true;
    } catch (e) {
      console.error(`Error writing ${key} to localStorage:`, e);
      return false;
    }
  },

  // Download all collections from server for the logged in tenant
  async syncFromServer() {
    const token = sessionStorage.getItem("hms_token");
    if (!token) return false;

    try {
      const res = await fetch("/api/hostel/data", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (res.status === 401 || res.status === 403) {
        console.warn("Session expired or unauthorized during server sync.");
        sessionStorage.removeItem("hms_session");
        sessionStorage.removeItem("hms_token");
        window.location.reload();
        return false;
      }

      if (!res.ok) {
        throw new Error(`Server returned status: ${res.status}`);
      }

      const data = await res.json();
      if (data && typeof data === "object") {
        // Overwrite local storage keys with fresh data from server
        Object.keys(data).forEach(key => {
          localStorage.setItem(DB_PREFIX + key, JSON.stringify(data[key]));
        });
        console.log("✅ Local cache successfully synchronized with server database.");
        return true;
      }
    } catch (e) {
      console.error("❌ Failed to synchronize database from server:", e);
    }
    return false;
  },

  init() {
    // Force fresh start — clears ALL old cached data (bumped to v6 to wipe demo data)
    if (!localStorage.getItem("hms_clean_v6")) {
      localStorage.clear();
      localStorage.setItem("hms_clean_v6", "true");
    }

    // Initialize all collections as empty if not present
    if (!this.get("food_menu")) { this.set("food_menu", { breakfast: "", lunch: "", eveningSnack: "", dinner: "" }); }
    if (!this.get("students")) { this.set("students", []); }
    if (!this.get("rooms")) { this.set("rooms", []); }
    if (!this.get("attendance")) { this.set("attendance", []); }
    if (!this.get("notices")) { this.set("notices", []); }
    if (!this.get("complaints")) { this.set("complaints", []); }
    if (!this.get("fines")) { this.set("fines", []); }
    if (!this.get("leave_applications")) { this.set("leave_applications", []); }
    if (!this.get("visitor_register")) { this.set("visitor_register", []); }
    if (!this.get("settings")) {
      this.set("settings", {
        darkMode: false,
        language: "en",
        notifications: { foodMenu: true, complaints: true, leaves: true, fines: true }
      });
    }
    if (!this.get("emergency_contacts")) { this.set("emergency_contacts", []); }
    if (!this.get("events")) { this.set("events", []); }
    if (!this.get("feedback")) { this.set("feedback", []); }
    if (!this.get("registration_applications")) { this.set("registration_applications", []); }
    if (!this.get("hostel_info")) { this.set("hostel_info", null); }
    if (!this.get("hostel_rules")) { this.set("hostel_rules", []); }
  }
};

// Initialize DB immediately
DB.init();
