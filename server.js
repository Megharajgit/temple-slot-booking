// server.js
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const cron = require('node-cron');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve static files from public folder

// Database configuration - Works for both local and Railway
const dbConfig = {
  host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
  user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || 'Megharaj@123',
  database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'temple_booking',
  port: process.env.MYSQLPORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Database connection pool
const pool = mysql.createPool(dbConfig);

// Initialize database tables
async function initializeDatabase() {
  try {
    const connection = await pool.getConnection();

    // Create bookings table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        section_id INT NOT NULL,
        slot_number INT NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        place VARCHAR(100) NOT NULL,
        mobile VARCHAR(10) NOT NULL,
        booking_date DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_slot (section_id, slot_number, booking_date),
        INDEX idx_booking_date (booking_date),
        INDEX idx_section_slot (section_id, slot_number)
      )
    `);

    // Create archive table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS booking_archive (
        id INT PRIMARY KEY,
        section_id INT NOT NULL,
        slot_number INT NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        place VARCHAR(100) NOT NULL,
        mobile VARCHAR(10) NOT NULL,
        booking_date DATETIME NOT NULL,
        created_at TIMESTAMP,
        archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_archived_date (archived_at)
      )
    `);

    console.log('✅ Database tables initialized successfully');
    connection.release();
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  }
}

// Test database connection and initialize
pool.getConnection()
  .then(connection => {
    console.log('✅ Database connected successfully');
    connection.release();
    initializeDatabase();
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err);
  });

// API Routes

// Get slot status
app.get('/api/slots/:sectionId/:slotNumber', async (req, res) => {
  try {
    const { sectionId, slotNumber } = req.params;

    const [rows] = await pool.query(
      'SELECT * FROM bookings WHERE section_id = ? AND slot_number = ? AND DATE(booking_date) = CURDATE()',
      [sectionId, slotNumber]
    );

    res.json({ isBooked: rows.length > 0 });
  } catch (error) {
    console.error('Error checking slot:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create booking
app.post('/api/bookings', async (req, res) => {
  try {
    const { sectionId, slotNumber, fullName, place, mobile } = req.body;

    // Validate input
    if (!sectionId || !slotNumber || !fullName || !place || !mobile) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Validate mobile number
    if (!/^\d{10}$/.test(mobile)) {
      return res.status(400).json({ message: 'Invalid mobile number' });
    }

    // Check if slot is already booked today
    const [existing] = await pool.query(
      'SELECT * FROM bookings WHERE section_id = ? AND slot_number = ? AND DATE(booking_date) = CURDATE()',
      [sectionId, slotNumber]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: 'This slot is already booked' });
    }

    // Create booking
    const [result] = await pool.query(
      'INSERT INTO bookings (section_id, slot_number, full_name, place, mobile, booking_date) VALUES (?, ?, ?, ?, ?, NOW())',
      [sectionId, slotNumber, fullName, place, mobile]
    );

    res.status(201).json({
      message: 'Booking successful',
      bookingId: result.insertId
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all bookings for today
app.get('/api/bookings/today', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM bookings WHERE DATE(booking_date) = CURDATE() ORDER BY section_id, slot_number'
    );

    res.json(rows);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Archive old bookings (move to archive table)
async function archiveOldBookings() {
  try {
    // Copy old bookings to archive
    await pool.query(
      'INSERT INTO booking_archive SELECT * FROM bookings WHERE DATE(booking_date) < CURDATE()'
    );

    // Delete old bookings from main table
    const [result] = await pool.query(
      'DELETE FROM bookings WHERE DATE(booking_date) < CURDATE()'
    );

    console.log(`✅ Archived and cleaned ${result.affectedRows} old bookings`);
  } catch (error) {
    console.error('❌ Error archiving bookings:', error);
  }
}

// Schedule daily cleanup at midnight (00:00)
cron.schedule('0 0 * * *', () => {
  console.log('🔄 Running daily booking cleanup...');
  archiveOldBookings();
}, {
  timezone: "Asia/Kolkata"
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Serve index.html for root route
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 API endpoint: http://localhost:${PORT}/api`);
});
