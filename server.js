require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname)));

const PORT = process.env.PORT || 3000;

// Detect if running on Railway:
const isRailway = !!process.env.MYSQLHOST;

const db = mysql.createPool({
  host: isRailway ? process.env.MYSQLHOST : process.env.DB_HOST,
  user: isRailway ? process.env.MYSQLUSER : process.env.DB_USER,
  password: isRailway ? process.env.MYSQLPASSWORD : process.env.DB_PASSWORD,
  database: isRailway ? process.env.MYSQLDATABASE : process.env.DB_NAME,
  port: isRailway ? process.env.MYSQLPORT : process.env.DB_PORT || 3306
});

// Health Route
app.get('/api/health', async (req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({ status: "OK" });
  } catch (err) {
    res.status(500).json({ status: "DB Error" });
  }
});

// Check Slot
app.get('/api/slots/:sectionId/:slotNumber', async (req, res) => {
  try {
    const { sectionId, slotNumber } = req.params;

    const [rows] = await db.execute(
      "SELECT id FROM bookings WHERE section_id = ? AND slot_number = ?",
      [sectionId, slotNumber]
    );

    res.json({ isBooked: rows.length > 0 });
  } catch (err) {
    console.error("Slot error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Book Slot
app.post('/api/bookings', async (req, res) => {
  try {
    const { sectionId, slotNumber, fullName, place, mobile } = req.body;

    // Check again if booked
    const [exists] = await db.execute(
      "SELECT id FROM bookings WHERE section_id = ? AND slot_number = ?",
      [sectionId, slotNumber]
    );

    if (exists.length > 0) {
      return res.status(400).json({ message: "Slot already booked" });
    }

    await db.execute(
      "INSERT INTO bookings (section_id, slot_number, full_name, place, mobile, booking_date) VALUES (?,?,?,?,?, NOW())",
      [sectionId, slotNumber, fullName, place, mobile]
    );

    res.json({ message: "Booked successfully" });
  } catch (err) {
    console.error("Booking error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
