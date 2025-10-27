require("dotenv").config();

const nodemailer = require("nodemailer");
const crypto = require("crypto");
const axios = require("axios");

var fs = require("fs");
const express = require("express");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const { supabase } = require("./supabaseClient.js"); // now uses env
const { createClient } = require("@supabase/supabase-js"); // now uses env
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const multer = require("multer");

const app = express();


// ================= Middleware =================
app.use(express.static("static"));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.set("views", "pages");
app.use(cookieParser()); // ✅ needed for JWT cookies



// === EMAIL HELPER =========================================================
async function sendEmail(to, subject, html) {
  try {
    // Example using Supabase's built-in email (if available via edge functions)
    // Or integrate your own mail provider here
    // For now, we'll just log so you can confirm it's running
    console.log(`📧 Sending email to ${to} | Subject: ${subject}`);
    console.log("Body:", html);

    // TODO: Replace with your actual email sending logic
    // e.g. using your existing email service function if you already have one
  } catch (err) {
    console.error("Email send failed:", err.message);
  }
}






// ====== JWT CONFIG ======
const JWT_SECRET = process.env.JWT_SECRET;

function authMiddleware(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.redirect("/login");

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // ✅ user info now available
    next();
  } catch (err) {
    console.error("JWT Error:", err.message);
    return res.redirect("/login");
  }
}

// FOR IMAGE UPLOAD
const upload = multer({ storage: multer.memoryStorage() });

// ================= Start Server =================
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`listening to port ${port}`);
});

// ======================= ROUTES =======================

// HOME PAGE
app.get("/hp", (req, res) => {
  res.render("hp.ejs", { root: __dirname });
});

// SIGN UP PAGE (form)
app.get("/register", (req, res) => {
  res.render("sign.ejs", { root: __dirname, error: null, success: null });
});


// LOGIN PAGE (form)
app.get("/login", (req, res) => {
  const verified = req.query.verified === "true";
  const message = verified ? "Your email has been verified! You can now log in." : null;
  res.render("log.ejs", { root: __dirname, error: null, success: message });
});
// LOGIN PAGE  for cofirming emails (form)
app.get("/", (req, res) => {
  const verified = req.query.verified === "true";
  const message = verified ? "Your email has been verified! You can now log in." : null;
  res.render("log.ejs", { root: __dirname, error: null, success: message });
});



// === SIGN UP =====================================================================
// === SIGN UP =====================================================================
app.post("/register", async (req, res) => {
  try {
    let { fullname, email, password, cpassword } = req.body;

    // ✅ Trim input values
    fullname = fullname?.trim();
    email = email?.trim();
    password = password?.trim();
    cpassword = cpassword?.trim();

    // ✅ Validate required fields
    if (!fullname || !email || !password || !cpassword) {
      return respond(res, "All fields are required.");
    }

    // ✅ Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return respond(res, "Please enter a valid email address.");
    }

    // ✅ Check if passwords match
    if (password !== cpassword) {
      return respond(res, "Passwords do not match!");
    }

    // ✅ 1. Check if user already exists in custom table
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("email")
      .eq("email", email)
      .maybeSingle(); // safer than .single()

    if (existingUser) {
      return respond(res, "Account already exists with this email!");
    }

    // ✅ 2. Create Supabase Auth user (store role & fullname in metadata)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { fullname, role: "admin" },
        emailRedirectTo: "http://localhost:3000/?verified=true", // add this
      },
    });

    if (authError) {
      console.error("Auth Error:", authError.message);

      // 🧩 Handle common Supabase duplicate / rate-limit cases
      if (
        authError.message.includes("Email rate limit exceeded") ||
        authError.message.includes("User already registered")
      ) {
        return respond(res, "Account already exists with this email!");
      }

      return respond(res, authError.message);
    }

    const authUser = authData.user;

    // ✅ 3. Insert user record into your custom 'users' table
    const { error: dbError } = await supabaseAdmin.from("users").insert([
      {
        id: authUser.id,
        fullname,
        email,
        role: "admin",
      },
    ]);

    if (dbError) {
      console.error("Database Error:", dbError.message);

      // 🧩 Handle duplicate or constraint issues
      if (
        dbError.message.includes("duplicate key value") ||
        dbError.code === "23505"
      ) {
        return respond(res, "Account already exists with this email!");
      }

      return respond(res, "Error signing up. Please try again later.");
    }

    // ✅ 4. Success message
    return respond(
      res,
      "Account created successfully! Please check your email to verify your account.",
      true
    );
  } catch (err) {
    console.error("Server Error:", err.message);
    return respond(res, "Internal Server Error.");
  }
});

function respond(res, message, success = false, view = "sign.ejs") {
  if (res.req.headers["content-type"] === "application/json") {
    return res.json({ success, message });
  }

  // ✅ Always define both
  const renderData = {
    error: success ? null : message,
    success: success ? message : null,
  };

  return res.render(view, renderData);
}







// === LOGIN =====================================================================
// === LOGIN =====================================================================
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return respond(res, "Email and password are required.");

    // Attempt login
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      console.error("Auth Error:", authError.message);

      // Handle specific Supabase error messages
      if (
        authError.message.includes("Invalid login credentials") ||
        authError.message.includes("Invalid email or password")
      ) {
        return respond(res, "Invalid email or password.");
      }

      if (authError.message.includes("Email not confirmed")) {
        return respond(
          res,
          "Please verify your email before logging in. Check your inbox or spam folder."
        );
      }

      // Catch-all for any other auth error
      return respond(res, "Login failed. Please try again.");
    }

    const authUser = authData.user;

    // Double-check email verification
    const { data: refreshedUser } = await supabaseAdmin.auth.admin.getUserById(authUser.id);
    if (!refreshedUser.user.email_confirmed_at) {
      return respond(
        res,
        "Please verify your email before logging in. Check your inbox or spam folder."
      );
    }

    // Fetch profile info
    const { data: userData, error: dbError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle();

    if (dbError) {
      console.error("User table fetch error:", dbError.message);
      return respond(res, "Error retrieving user details.");
    }

    const userPayload = {
      id: userData ? userData.id : authUser.id,
      fullname: userData ? userData.fullname : authUser.user_metadata?.fullname || "User",
      email: userData ? userData.email : authUser.email,
      role: userData ? userData.role : authUser.user_metadata?.role || "user",
      profile_image: userData?.profile_image || null,
    };

    // Create session token
    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: "7d" });
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    console.log("✅ Login success:", email);
    return res.redirect("/app");
  } catch (err) {
    console.error("Login Error:", err);
    return respond(res, "Internal Server Error");
  }
});






  // ================== PROFILE PHOTO UPLOAD ==================
  app.post(
    "/profile/photo",
    authMiddleware,
    upload.single("avatar"),
    async (req, res) => {
      try {
        const userId = req.user.id;
        const file = req.file;

        if (!file) return res.redirect("/app");

        const filename = `avatars/${userId}-${Date.now()}-${file.originalname}`;

        if (req.user.profile_image) {
          const oldPath = req.user.profile_image.split("/").slice(-2).join("/");
          await supabase.storage.from("user-avatars").remove([oldPath]);
        }

        const { error: uploadError } = await supabaseAdmin.storage
          .from("user-avatars")
          .upload(filename, file.buffer, {
            cacheControl: "3600",
            upsert: true,
            contentType: file.mimetype,
          });

        if (uploadError) {
          console.error(uploadError);
          return res.status(500).send("Error uploading photo");
        }

        const { data: publicUrlData } = supabase.storage
          .from("user-avatars")
          .getPublicUrl(filename);

        const publicUrl = publicUrlData.publicUrl;

        const { error: dbError } = await supabaseAdmin
          .from("users")
          .update({ profile_image: publicUrl })
          .eq("id", userId);

        if (dbError) {
          console.error(dbError);
          return res.status(500).send("Error updating profile");
        }

        // ✅ Only include the fields you actually want in the token
  const token = jwt.sign(
    {
      id: req.user.id,
      fullname: req.user.fullname,
      email: req.user.email,
      role: req.user.role,
      profile_image: publicUrl
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );


        res.cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
        });
        res.redirect("/app");
      } catch (err) {
        console.error("Upload Error:", err);
        res.status(500).send("Internal Server Error");
      }
    }
);

// ================== DELETE PROFILE PHOTO ==================
app.post("/profile/photo/delete", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    if (req.user.profile_image) {
      const oldPath = req.user.profile_image.split("/").slice(-2).join("/");
      await supabase.storage.from("user-avatars").remove([oldPath]);

      await supabase.from("users").update({ profile_image: null }).eq("id", userId);

      const token = jwt.sign(
  {
    id: req.user.id,
    fullname: req.user.fullname,
    email: req.user.email,
    role: req.user.role,
    profile_image: null
  },
  JWT_SECRET,
  { expiresIn: "7d" }
);

      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
      });
    }

    res.redirect("/app");
  } catch (err) {
    console.error("Delete Photo Error:", err);
    res.status(500).send("Internal Server Error");
  }
});

// ADMIN PAGE
app.get("/admin", authMiddleware, (req, res) => {
  if (req.user.role !== "admin") return res.status(403).send("Forbidden");
  res.render("ad.ejs", { root: __dirname, user: req.user });
});

// LOGOUT
app.get("/logout", (req, res) => {
  res.clearCookie("token");
  res.redirect("/login");
});



// === ACCOUNT DELETE FLOW =====================================================

// Temporary in-memory store for verification codes
const deleteCodes = new Map(); // key: adminId, value: { code, expiresAt }

app.post("/account/delete/send-code", authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    if (user.role !== "admin")
      return res.json({ success: false, message: "Only admins can delete accounts." });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    deleteCodes.set(user.id, { code, expiresAt: Date.now() + 10 * 60 * 1000 }); // valid 10 mins

    const subject = "Account Deletion Verification Code";
    const message = `
      Hi ${user.fullname},<br><br>
      You requested to delete your account on <strong>cFleet</strong>.<br>
      Your verification code is:<br><br>
      <h2>${code}</h2><br>
      This code will expire in 10 minutes.<br><br>
      If you didn't request this, please ignore this email.
    `;

    await sendEmail(user.email, subject, message);

    return res.json({ success: true, message: "Verification code sent." });
  } catch (err) {
    console.error("Send code error:", err);
    res.status(500).json({ success: false, message: "Failed to send code." });
  }
});

app.post("/account/delete/confirm", authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    if (user.role !== "admin")
      return res.json({ success: false, message: "Only admins can delete accounts." });

    const { code } = req.body;
    const stored = deleteCodes.get(user.id);

    if (!stored || stored.expiresAt < Date.now()) {
      return res.json({ success: false, message: "Verification code expired or missing." });
    }
    if (stored.code !== code) {
      return res.json({ success: false, message: "Invalid verification code." });
    }

    // ✅ 1. Get all drivers created by this admin
    const { data: drivers, error: fetchError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("created_by", user.id);

    if (fetchError) {
      console.error("Fetch drivers error:", fetchError.message);
      return res.json({ success: false, message: "Error fetching drivers." });
    }

    // ✅ 2. Delete drivers from Supabase Auth
    if (drivers && drivers.length > 0) {
      for (const driver of drivers) {
        try {
          await supabaseAdmin.auth.admin.deleteUser(driver.id);
        } catch (e) {
          console.error(`Failed to delete driver auth user: ${driver.id}`, e.message);
        }
      }

      // ✅ 3. Delete driver records from custom table
      await supabaseAdmin.from("users").delete().eq("created_by", user.id);
    }

    // ✅ 4. Delete admin's auth account
    await supabaseAdmin.auth.admin.deleteUser(user.id);

    // ✅ 5. Delete admin record from users table
    await supabaseAdmin.from("users").delete().eq("id", user.id);

    deleteCodes.delete(user.id);

    res.clearCookie("token");
    return res.json({ success: true, message: "Your account and all associated drivers have been deleted." });
  } catch (err) {
    console.error("Delete account error:", err);
    res.status(500).json({ success: false, message: "Error deleting account." });
  }
});









// ============= ADMIN CREATE DRIVER ==============

// FOR ADMINS TO SEND EMAILS TO DRIVERS AFTER PROFILING=========================
async function sendEmail(to, subject, html) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER, // your Gmail address
        pass: process.env.EMAIL_PASS, // Gmail App Password (not your normal password)
      },
    });

    const mailOptions = {
      from: `"cFleet" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    };

    await transporter.sendMail(mailOptions);
    console.log(`📨 Email sent to ${to}`);
  } catch (err) {
    console.error("Email send failed:", err.message);
  }
}



// === ADMIN CREATE DRIVER (AUTO-VERIFIED) ===================================
app.post("/admin/driver/create", authMiddleware, upload.none(), async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.json({ success: false, message: "Forbidden: Admins only!" });
    }

    const { fullname, email, password } = req.body;
    if (!fullname || !email || !password) {
      return res.json({ success: false, message: "Fullname, email, and password are required!" });
    }

    // Check if user already exists
    const { data: existing } = await supabaseAdmin
      .from("users")
      .select("email")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      return res.json({ success: false, message: "Driver already exists with this email!" });
    }

    // ✅ Create user directly via Supabase Admin (auto-verified)
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        fullname,
        role: "driver",
        created_by: req.user.id,
      },
      email_confirm: true, // auto verify
    });

    if (authError) {
      console.error("Auth Error:", authError.message);
      return res.json({ success: false, message: authError.message });
    }

    // Insert into your custom users table
    const driverId = `DRV-${Date.now()}`;
    const { error: dbError } = await supabaseAdmin.from("users").insert([
      {
        id: authUser.user.id,
        fullname,
        email,
        role: "driver",
        driver_id: driverId,
        created_by: req.user.id,
      },
    ]);

    if (dbError) {
      console.error("Database Error:", dbError.message);
      return res.status(500).json({ success: false, message: "Error saving driver record." });
    }

    // === Send welcome email ===
    const subject = "Welcome to cFleet!";
    const message = `
      Hi ${fullname},<br><br>
      You have been profiled by <strong>${req.user.fullname}</strong> as a driver on cFleet.<br><br>
      Your login email: <strong>${email}</strong><br>
      Password: <strong>${password}</strong><br><br>
      You can change your password anytime from your profile settings.<br><br>
      Welcome aboard!<br><br>
      — The cFleet Team
    `;

    await sendEmail(email, subject, message);

    console.log(`✅ Driver ${fullname} created by ${req.user.fullname}. Auto-verified and notified.`);

    return res.json({
      success: true,
      message: `Driver ${fullname} created successfully and email sent.`,
    });
  } catch (err) {
    console.error("Create Driver Error:", err.message);
    return res.status(500).json({ success: false, message: "Internal Server Error." });
  }
});











// ================================ FOR EXTRACTING USER IDs ==========================
// const jwt = require("jsonwebtoken");     has alraedy been declared

// Middleware to extract user from Supabase JWT
function authenticateUser(req, res, next) {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    const token = authHeader.split(" ")[1]; // "Bearer <token>"
    const decoded = jwt.decode(token); // Supabase JWT

    if (!decoded || !decoded.sub) {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }

    req.user = { id: decoded.sub, email: decoded.email }; // attach to req.user
    next();
  } catch (err) {
    console.error("Auth Middleware Error:", err.message);
    res.status(401).json({ success: false, message: "Unauthorized" });
  }
}

// ============================VEHICLE REGISTRATION=============================
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

app.post("/admin/vehicle/create", authMiddleware, upload.none(), async (req, res) => {
  try {
    const { product, model, registration_number, description } = req.body;

    const { error } = await supabaseAdmin.from("vehicles").insert([
      { product, model, registration_number, description, created_by: req.user.id }
    ]);

    if (error) throw error;
    res.json({ success: true, message: "Vehicle successfully registered!" });
  } catch (err) {
    console.error("Create Vehicle Error:", err.message);
    res.json({ success: false, message: "Error registering vehicle, Check if registration number already exist" });
  }
});

// FOR SEARCH SECTION=================================================================
// 🔎 SEARCH ROUTE
app.get("/admin/search", authMiddleware, async (req, res) => {
  try {
    const query = req.query.q?.trim();
    if (!query) return res.json({ success: false, message: "No query provided" });

    const [driversResult, vehiclesResult] = await Promise.all([
      supabaseAdmin
        .from("users")
        .select("id, fullname, email, driver_id, profile_image, role, created_by")
        .eq("role", "driver")
        .eq("created_by", req.user.id)
        .or(`fullname.ilike.%${query}%,email.ilike.%${query}%`),

      supabaseAdmin
        .from("vehicles")
        .select("id, product, model, registration_number, description, created_by")
        .eq("created_by", req.user.id)
        .or(`product.ilike.%${query}%,model.ilike.%${query}%,registration_number.ilike.%${query}%`)
    ]);

    if (driversResult.error) throw driversResult.error;
    if (vehiclesResult.error) throw vehiclesResult.error;

    res.json({
      success: true,
      drivers: driversResult.data,
      vehicles: vehiclesResult.data
    });
  } catch (err) {
    console.error("Search Error:", err.message);
    res.json({ success: false, message: "Error performing search" });
  }
});

// ✏️ DRIVER UPDATE
app.post("/admin/update/driver/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { fullname, email } = req.body;

    const { error } = await supabaseAdmin
      .from("users")
      .update({ fullname, email })
      .eq("id", id)
      .eq("created_by", req.user.id);

    if (error) throw error;

    res.json({ success: true, message: "Driver updated successfully!" });
  } catch (err) {
    console.error("Driver update error:", err.message);
    res.json({ success: false, message: "Failed to update driver." });
  }
});

// ✏️ VEHICLE UPDATE
app.post("/admin/update/vehicle/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { product, model, registration_number, description } = req.body;

    const { error } = await supabaseAdmin
      .from("vehicles")
      .update({ product, model, registration_number, description })
      .eq("id", id)
      .eq("created_by", req.user.id);

    if (error) throw error;

    res.json({ success: true, message: "Vehicle updated successfully!" });
  } catch (err) {
    console.error("Vehicle update error:", err.message);
    res.json({ success: false, message: "Failed to update vehicle." });
  }
});
// ❌ DELETE DRIVER
app.delete("/admin/delete/driver/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    // ✅ 1. Ensure the driver exists and belongs to this admin
    const { data: driver, error: findError } = await supabaseAdmin
      .from("users")
      .select("id, email, created_by, role")
      .eq("id", id)
      .eq("created_by", adminId)
      .eq("role", "driver")
      .single();

    if (findError || !driver) {
      return res.json({ success: false, message: "Driver not found or not yours to delete." });
    }

    // ✅ 2. Delete the driver from Supabase Auth
    try {
      await supabaseAdmin.auth.admin.deleteUser(driver.id);
    } catch (authErr) {
      console.warn("Auth deletion warning:", authErr.message);
      // Continue — we’ll still remove them from users table
    }

    // ✅ 3. Delete the driver record from the users table
    const { error: deleteError } = await supabaseAdmin
      .from("users")
      .delete()
      .eq("id", driver.id)
      .eq("created_by", adminId)
      .eq("role", "driver");

    if (deleteError) throw deleteError;

    return res.json({ success: true, message: "Driver deleted successfully." });
  } catch (err) {
    console.error("Driver delete error:", err.message);
    res.status(500).json({ success: false, message: "Failed to delete driver." });
  }
});


// ❌ DELETE VEHICLE
app.delete("/admin/delete/vehicle/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabaseAdmin
      .from("vehicles")
      .delete()
      .eq("id", id)
      .eq("created_by", req.user.id);

    if (error) throw error;
    res.json({ success: true, message: "Vehicle deleted successfully!" });
  } catch (err) {
    console.error("Vehicle delete error:", err.message);
    res.json({ success: false, message: "Failed to delete vehicle." });
  }
});

// FOR OVERVIEW--------------------------------------------------------------------------------------------
// 📦 ADMIN OVERVIEW & UPDATE ENDPOINTS

// === DRIVERS OVERVIEW & UPDATE ===
app.route("/admin/overview/drivers")
  // 📊 Get all drivers created by this admin
  .get(authMiddleware, async (req, res) => {
    try {
      const { data, error } = await supabaseAdmin
        .from("users")
        .select("id, fullname, email, profile_image, created_at, role, created_by")
        .eq("role", "driver")
        .eq("created_by", req.user.id);

      if (error) throw error;
      res.json({ success: true, data });
    } catch (err) {
      console.error("Overview drivers error:", err.message);
      res.json({ success: false, message: "Failed to load drivers." });
    }
  })

  // ✏️ Update a specific driver
  .put(authMiddleware, async (req, res) => {
    try {
      const { id, fullname, email } = req.body;
      if (!id) return res.json({ success: false, message: "Driver ID required." });

      const { data: existing, error: fetchError } = await supabaseAdmin
        .from("users")
        .select("id, created_by")
        .eq("id", id)
        .eq("role", "driver")
        .single();

      if (fetchError || !existing)
        return res.json({ success: false, message: "Driver not found." });

      if (existing.created_by !== req.user.id)
        return res.json({ success: false, message: "Unauthorized update attempt." });

      const { error } = await supabaseAdmin
        .from("users")
        .update({ fullname, email })
        .eq("id", id)
        .eq("created_by", req.user.id);

      if (error) throw error;

      res.json({ success: true, message: "Driver updated successfully!" });
    } catch (err) {
      console.error("Driver update error:", err.message);
      res.json({ success: false, message: "Failed to update driver." });
    }
  });


// === VEHICLES OVERVIEW & UPDATE ===
app.route("/admin/overview/vehicles")
  // 📊 Get all vehicles created by this admin
  .get(authMiddleware, async (req, res) => {
    try {
      const { data, error } = await supabaseAdmin
        .from("vehicles")
        .select("id, product, model, registration_number, description, created_at, created_by")
        .eq("created_by", req.user.id);

      if (error) throw error;
      res.json({ success: true, data });
    } catch (err) {
      console.error("Overview vehicles error:", err.message);
      res.json({ success: false, message: "Failed to load vehicles." });
    }
  })

  // ✏️ Update a specific vehicle
  .put(authMiddleware, async (req, res) => {
    try {
      const { id, product, model, registration_number, description } = req.body;
      if (!id) return res.json({ success: false, message: "Vehicle ID required." });

      const { data: existing, error: fetchError } = await supabaseAdmin
        .from("vehicles")
        .select("id, created_by")
        .eq("id", id)
        .single();

      if (fetchError || !existing)
        return res.json({ success: false, message: "Vehicle not found." });

      if (existing.created_by !== req.user.id)
        return res.json({ success: false, message: "Unauthorized update attempt." });

      const { error } = await supabaseAdmin
        .from("vehicles")
        .update({ product, model, registration_number, description })
        .eq("id", id)
        .eq("created_by", req.user.id);

      if (error) throw error;

      res.json({ success: true, message: "Vehicle updated successfully!" });
    } catch (err) {
      console.error("Vehicle update error:", err.message);
      res.json({ success: false, message: "Failed to update vehicle." });
    }
  });
// 🗑️ DELETE DRIVER
app.delete("/admin/delete/driver/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ Ensure this driver belongs to the current admin
    const { data: driver, error: fetchError } = await supabaseAdmin
      .from("users")
      .select("id, email, created_by")
      .eq("id", id)
      .eq("created_by", req.user.id)
      .eq("role", "driver")
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!driver)
      return res.json({ success: false, message: "Driver not found or unauthorized." });

    // ✅ Delete from Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(driver.id);
    if (authError) {
      console.error("Auth delete error:", authError.message);
      return res.json({ success: false, message: "Failed to delete driver from auth." });
    }

    // ✅ Delete from your custom users table
    const { error: dbError } = await supabaseAdmin
      .from("users")
      .delete()
      .eq("id", driver.id)
      .eq("created_by", req.user.id);

    if (dbError) {
      console.error("Database delete error:", dbError.message);
      return res.json({ success: false, message: "Failed to delete driver record." });
    }

    res.json({ success: true, message: "Driver deleted successfully!" });
  } catch (err) {
    console.error("Delete driver error:", err.message);
    res.json({ success: false, message: "Error deleting driver." });
  }
});



// MAP INTEGRATION==============================================================
// === MAP INTEGRATION =========================================================
const OFFLINE_THRESHOLD_MS = 60000; // 60 seconds
const MIN_ACCURACY_METERS = 1000; // Ignore GPS readings worse than this

// --- DRIVER LOCATION UPDATE (HIGH ACCURACY) ----------------------------------
app.post("/driver/update-location", authMiddleware, async (req, res) => {
  try {
    const { latitude, longitude, accuracy } = req.body;
    const uid = req.user.id;

    if (latitude == null || longitude == null) {
      return res.status(400).json({ success: false, message: "Missing coordinates" });
    }

    // Ignore poor accuracy readings
    if (accuracy && accuracy > MIN_ACCURACY_METERS) {
      console.warn(`[Ignored inaccurate location] uid=${uid}, accuracy=${accuracy}`);
      return res.json({ success: false, message: "Poor GPS accuracy, ignored" });
    }

    const now = new Date().toISOString();
    const payload = {
      current_lat: latitude,
      current_lng: longitude,
      last_seen: now,
      is_online: true,
    };

    const { error } = await supabaseAdmin.from("users").update(payload).eq("id", uid);
    if (error) throw error;

    // console.log(`[Driver Location Updated] user: ${uid}, lat=${latitude}, lng=${longitude}, accuracy=${accuracy}`); its overwhelming my system
    res.json({ success: true });
  } catch (err) {
    console.error("POST /driver/update-location error:", err);
    res.status(500).json({ success: false, message: "Update failed" });
  }
});

// --- ADMIN OVERVIEW: FETCH DRIVERS CREATED BY ADMIN -------------------------
app.get("/admin/overview/drivers", authMiddleware, async (req, res) => {
  try {
    const adminId = req.user.id;
    const { data, error } = await supabaseAdmin
      .from("users")
      .select(`
        id, fullname, email, profile_image,
        current_lat, current_lng, last_lat, last_lng,
        last_seen, is_online, created_by
      `)
      .eq("role", "driver")
      .eq("created_by", adminId);

    if (error) throw error;

    const now = new Date();
    const drivers = data.map((d) => {
      const lastSeen = d.last_seen ? new Date(d.last_seen) : null;
      const isOnline = d.is_online && lastSeen && now - lastSeen <= OFFLINE_THRESHOLD_MS;

      if (!isOnline && d.current_lat && d.current_lng) {
        d.last_lat = d.current_lat;
        d.last_lng = d.current_lng;
      }

      return { ...d, is_online: isOnline };
    });

    res.json({ success: true, data: drivers });
  } catch (err) {
    console.error("GET /admin/overview/drivers error:", err);
    res.json({ success: false, message: "Failed to fetch drivers" });
  }
});

// --- SINGLE DRIVER LOCATION FOR MODAL ----------------------------------------
app.get("/admin/driver/:id/location", authMiddleware, async (req, res) => {
  try {
    const driverId = req.params.id;
    const { data: driver, error } = await supabaseAdmin
      .from("users")
      .select("id, current_lat, current_lng, last_lat, last_lng, last_seen, is_online, created_by")
      .eq("id", driverId)
      .single();

    if (error) throw error;
    if (driver.created_by !== req.user.id) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const lastSeen = driver.last_seen ? new Date(driver.last_seen) : null;
    driver.is_online = driver.is_online && lastSeen && new Date() - lastSeen <= OFFLINE_THRESHOLD_MS;

    if (!driver.is_online && driver.current_lat && driver.current_lng) {
      driver.last_lat = driver.current_lat;
      driver.last_lng = driver.current_lng;
    }

    res.json({ success: true, data: driver });
  } catch (err) {
    console.error("GET /admin/driver/:id/location error:", err);
    res.json({ success: false, message: "Failed to fetch driver location" });
  }
});

// --- LOGOUT HOOK -------------------------------------------------------------
app.post("/auth/logout", authMiddleware, async (req, res) => {
  try {
    const uid = req.user.id;
    const { error } = await supabaseAdmin
      .from("users")
      .update({ is_online: false, last_seen: new Date().toISOString() })
      .eq("id", uid);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error("POST /auth/logout error:", err);
    res.status(500).json({ success: false, message: "Logout failed" });
  }
});

// --- OFFLINE CHECK LOOP ------------------------------------------------------
setInterval(async () => {
  try {
    const cutoff = new Date(Date.now() - OFFLINE_THRESHOLD_MS).toISOString();
    const { data: offlineDrivers, error: fetchError } = await supabaseAdmin
      .from("users")
      .select("id, current_lat, current_lng")
      .lt("last_seen", cutoff)
      .eq("role", "driver");

    if (fetchError) throw fetchError;

    for (const drv of offlineDrivers) {
      const { error } = await supabaseAdmin
        .from("users")
        .update({
          is_online: false,
          last_lat: drv.current_lat,
          last_lng: drv.current_lng,
        })
        .eq("id", drv.id);
      if (error) console.error(`Failed to update offline driver ${drv.id}:`, error);
    }
  } catch (err) {
    console.error("Offline check failed:", err);
  }
}, OFFLINE_THRESHOLD_MS);

// async function test() {
//   const { data, error } = await supabase
//   .from('users')
//   .select('*')
//   .eq('email', 'nzechrischibyk@gmail.com')
//   .single();
// console.log(data, error);

// }

// test();








// ROUTE OPTIMIZATION SECTION==========================================================================
// --- ROUTING PROXY & USER LOCATION PROXY ------------------------------------
// Requires: set process.env.ORS_API_KEY to your HeiGIT / OpenRouteService key

const ORS_API_KEY = process.env.ORS_API_KEY || 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjM0ZmE0ZTMwNDUxOTQ3MTk4NDYzYTMzN2ViNGI4MWRlIiwiaCI6Im11cm11cjY0In0=';

// Proxy route request for client (POST /ors/route)
// body: { coordinates: [[lng, lat],[lng, lat]], profile: "driving-car", alternatives: { share_factor, target_count } }
app.post('/ors/route', authMiddleware, async (req, res) => {
  try {
    if (!ORS_API_KEY || ORS_API_KEY === 'YOUR_ORS_API_KEY_HERE') {
      return res.status(500).json({ success: false, message: 'Server missing ORS API key' });
    }
    const payload = req.body; // forwarded as-is to ORS
    const orsRes = await fetch(`https://api.openrouteservice.org/v2/directions/${encodeURIComponent(payload.profile || 'driving-car')}`, {
      method: 'POST',
      headers: {
        'Authorization': ORS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const data = await orsRes.json();
    // forward ORS response (status 200 even if ORS returned error JSON)
    res.json({ success: true, data });
  } catch (err) {
    console.error('POST /ors/route error:', err);
    res.status(500).json({ success: false, message: 'Routing proxy failed' });
  }
});

// Return current authenticated user's last/current coordinates
app.get('/user/location', authMiddleware, async (req, res) => {
  try {
    const uid = req.user.id;
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('current_lat, current_lng')
      .eq('id', uid)
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    console.error('GET /user/location error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch user location' });
  }
});






// TRIP SCHEDULING SECTION==========================================================
// === TRIP SCHEDULING SECTION ====================================================

// --- CREATE TRIP ---------------------------------------------------------------
app.post("/admin/trips", authMiddleware, async (req, res) => {
  try {
    const adminId = req.user.id;
    const {
      start_lat,
      start_lng,
      destination_lat,
      destination_lng,
      start_address,
      destination_address,
      assigned_driver,
    } = req.body;

    const { error } = await supabaseAdmin.from("trips").insert([
      {
        start_lat,
        start_lng,
        destination_lat,
        destination_lng,
        start_address,
        destination_address,
        assigned_driver,
        trip_createdby: adminId,
        trip_status: "pending",
      },
    ]);

    if (error) throw error;
    res.json({ success: true, message: "Trip created successfully." });
  } catch (err) {
    console.error("POST /admin/trips error:", err);
    res.status(500).json({ success: false, message: "Trip creation failed" });
  }
});

// --- FETCH DRIVERS UNDER ADMIN --------------------------------------------------
app.get("/admin/drivers", authMiddleware, async (req, res) => {
  try {
    const adminId = req.user.id;
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("id, fullname, email, profile_image, is_online")
      .eq("role", "driver")
      .eq("created_by", adminId);

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    console.error("GET /admin/drivers error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch drivers" });
  }
});



// ADMIN TRIP HISTORY=============================================
// --- ADMIN TRIP HISTORY (server) -----------------------------------------
// GET /api/admin/trips/:adminId
app.get("/api/admin/trips/:adminId", async (req, res) => {
  try {
    const { adminId } = req.params;

    // Ensure you have a Supabase client instance named `supabaseAdmin`
    // and that the "users" table has primary key column "id" and field "fullname".
    const { data, error } = await supabaseAdmin
      .from("trips")
      .select(`
        id,
        start_lat,
        start_lng,
        start_address,
        destination_lat,
        destination_lng,
        destination_address,
        trip_createdby,
        assigned_driver,
        trip_status,
        start_time,
        end_time,
        duration,
        description,
        inserted_at,
        -- fetch the assigned driver row (assumes assigned_driver stores users.id)
        drivers:assigned_driver (
          id,
          fullname,
          email,
          profile_image
        )
      `)
      .eq("trip_createdby", adminId)
      .order("inserted_at", { ascending: false });

    if (error) {
      console.error("Supabase fetch error:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch trips", error });
    }

    // Normalize: ensure drivers property exists and expose fallback fullname
    const normalized = (data || []).map(t => ({
      ...t,
      drivers: t.drivers || null,
      driver_name: (t.drivers && t.drivers.fullname) ? t.drivers.fullname : null
    }));

    res.status(200).json({ success: true, data: normalized });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});









// === CONTACT FORM SUBMISSION ===
app.post("/contact", async (req, res) => {
  try {
    const { fullname, email, message, phone_number } = req.body;

    const { error } = await supabaseAdmin
      .from("contacts")
      .insert([{ fullname, email, message, phone_number }]);

    if (error) {
      console.error("Supabase Error:", error.message);
      return res.status(500).json({
        success: false,
        message: "Error sending message",
      });
    }

    res.json({ success: true, message: "Message Sent" });
  } catch (err) {
    console.error("Server Error:", err.message);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});




// ==================================================================================WEB  APP 
app.get("/app", authMiddleware, (req, res) => {
  res.render("app.ejs", { 
    root: __dirname, 
    user: req.user,
    error: "",   // handled via JSON now
    success: "", // handled via JSON now
    googleKey: process.env.GOOGLE_MAPS_API_KEY  });
});


















// ============================================================================
// ACCOUNT RECOVERY SECTION

// ======================= FORGOT PASSWORD =======================
app.get("/forgot-password", (req, res) => {
  res.render("forgot-password", { message: null, error: null });
});

app.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.render("forgot-password", { message: null, error: "Email is required." });
  }

  // Check if user exists
  const { data: user } = await supabase.from("users").select("id").eq("email", email).maybeSingle();
  if (!user) {
    return res.render("forgot-password", { message: null, error: "No account found with that email." });
  }

  // Generate token
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 1000 * 60 * 15); // 15 minutes

  // Save token to Supabase table
  await supabase.from("password_resets").insert([{ email, token, expires_at: expires }]);

  const resetLink = `http://localhost:3000/reset-password?token=${token}`;

  // Send email
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `"cFleet Support" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Reset your cFleet password",
    html: `
      <div style="font-family: Arial; max-width: 600px; margin: auto; background: #f9f9f9; padding: 30px; border-radius: 8px;">
        <h2 style="color:#333;">Password Reset Request</h2>
        <p>Hello,</p>
        <p>We received a request to reset your password. Click the button below to proceed:</p>
        <a href="${resetLink}" style="background-color:#007bff; color:white; padding:10px 20px; text-decoration:none; border-radius:4px;">Reset Password</a>
        <p style="margin-top:15px;">If you didn’t request this, please ignore this email.</p>
        <p style="font-size:13px;color:#666;">This link expires in 15 minutes.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);

  res.render("forgot-password", {
    message: "A password reset link has been sent to your email.",
    error: null,
  });
});

// ======================= RESET PASSWORD PAGE =======================
app.get("/reset-password", async (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.render("reset-password", { error: "Invalid or missing token.", success: null, token: null });
  }

  // Check token validity
  const { data: tokenData } = await supabase
    .from("password_resets")
    .select("email, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!tokenData || new Date(tokenData.expires_at) < new Date()) {
    return res.render("reset-password", { error: "Token expired or invalid.", success: null, token: null });
  }

  res.render("reset-password", { error: null, success: null, token });
});

// ======================= RESET PASSWORD SUBMIT =======================
app.post("/reset-password", async (req, res) => {
  const { token, password, confirmPassword } = req.body;

  if (!token) return res.render("reset-password", { error: "Missing token.", success: null, token: null });
  if (password !== confirmPassword)
    return res.render("reset-password", { error: "Passwords do not match.", success: null, token });

  // Verify token again
  const { data: tokenData } = await supabase
    .from("password_resets")
    .select("email")
    .eq("token", token)
    .maybeSingle();

  if (!tokenData) return res.render("reset-password", { error: "Invalid token.", success: null, token: null });

  // Update password in Supabase Auth
 // Find user by email first
const { data: userRecord, error: findError } = await supabaseAdmin.auth.admin.listUsers();
if (findError) {
  return res.render("reset-password", { error: "Error retrieving user record.", success: null, token });
}

// Look for matching email
const foundUser = userRecord.users.find(u => u.email === tokenData.email);
if (!foundUser) {
  return res.render("reset-password", { error: "User not found.", success: null, token });
}

// ✅ Update user password by ID
const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(foundUser.id, {
  password,
});

if (updateError) {
  console.error(updateError);
  return res.render("reset-password", { error: "Error resetting password.", success: null, token });
}


  if (updateError)
    return res.render("reset-password", { error: "Error resetting password.", success: null, token });

  // Delete used token
  await supabase.from("password_resets").delete().eq("token", token);

  res.render("reset-password", {
    success: "Password reset successfully! You can now log in.",
    error: null,
    token: null,
  });
});

