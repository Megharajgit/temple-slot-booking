require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Railway OR local DB
const db = mysql.createPool({
    host: process.env.MYSQLHOST || process.env.DB_HOST,
    user: process.env.MYSQLUSER || process.env.DB_USER,
    password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD,
    database: process.env.MYSQLDATABASE || process.env.DB_NAME,
    port: process.env.MYSQLPORT || 3306
});

// Health
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK' });
});

// Slot status
app.get('/api/slots/:sectionId/:slotNumber', async (req, res) => {
    try {
        const { sectionId, slotNumber } = req.params;

        const [rows] = await db.execute(
            "SELECT * FROM bookings WHERE section_id=? AND slot_number=?",
            [sectionId, slotNumber]
        );

        res.json({ isBooked: rows.length > 0 });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// Book slot
app.post('/api/bookings', async (req, res) => {
    try {
        const { sectionId, slotNumber, fullName, place, mobile } = req.body;

        await db.execute(
            "INSERT INTO bookings(section_id, slot_number, full_name, place, mobile, booking_date) VALUES (?,?,?,?,?,NOW())",
            [sectionId, slotNumber, fullName, place, mobile]
        );

        res.status(201).json({ message: "Booking successful" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// Fallback
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(process.env.PORT || 3000, () =>
    console.log("Server running")
);
