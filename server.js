import mysql from "mysql2/promise";

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database connection


const db = mysql.createPool({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT
});

// Health
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK' });
});

// Check slot status
app.get('/api/slots/:sectionId/:slotNumber', async (req, res) => {
    try {
        const { sectionId, slotNumber } = req.params;

        const [rows] = await db.execute(
            "SELECT * FROM bookings WHERE section_id = ? AND slot_number = ?",
            [sectionId, slotNumber]
        );

        res.json({ isBooked: rows.length > 0 });
    } catch (err) {
        console.error("Error checking slot:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Book slot
app.post('/api/bookings', async (req, res) => {
    try {
        const { sectionId, slotNumber, fullName, place, mobile } = req.body;

        if (!sectionId || !slotNumber || !fullName || !mobile) {
            return res.status(400).json({ message: "All fields required" });
        }

        // Check if booked
        const [existing] = await db.execute(
            "SELECT * FROM bookings WHERE section_id = ? AND slot_number = ?",
            [sectionId, slotNumber]
        );

        if (existing.length > 0) {
            return res.status(409).json({ message: "Slot already booked" });
        }

        // Insert booking (with booking_date)
        await db.execute(
            "INSERT INTO bookings (section_id, slot_number, full_name, place, mobile, booking_date) VALUES (?,?,?,?,?, NOW())",
            [sectionId, slotNumber, fullName, place, mobile]
        );

        res.status(201).json({ message: "Booking successful" });

    } catch (err) {
        console.error("Error booking slot:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
