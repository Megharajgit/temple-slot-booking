// API Base URL - Change this to your backend URL
const API_BASE_URL = 'http://localhost:3000/api';

// Section data
const sections = [
    { id: 1, name: 'Section 1', time: '12:00 PM – 1:00 PM' },
    { id: 2, name: 'Section 2', time: '1:00 PM – 2:00 PM' },
    { id: 3, name: 'Section 3', time: '2:00 PM – 3:00 PM' },
    { id: 4, name: 'Section 4', time: '3:00 PM – 4:00 PM' },
    { id: 5, name: 'Section 5', time: '4:00 PM – 5:00 PM' }
];

// Update date and time
function updateDateTime() {
    const datetimeElement = document.getElementById('datetime');
    if (!datetimeElement) return;

    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    };
    datetimeElement.textContent = now.toLocaleDateString('en-IN', options);
}

// Check if a slot is booked
async function checkSlotStatus(sectionId, slotNumber) {
    try {
        const response = await fetch(`${API_BASE_URL}/slots/${sectionId}/${slotNumber}`);
        if (!response.ok) {
            console.warn('Non-OK response checking slot status:', response.status);
            return false;
        }
        const data = await response.json();
        return data.isBooked;
    } catch (error) {
        console.error('Error checking slot status:', error);
        return false;
    }
}

// Load all sections and slots
async function loadSections() {
    const container = document.getElementById('sections-container');
    if (!container) return;

    container.innerHTML = '';

    for (const section of sections) {
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'section';
        
        const headerDiv = document.createElement('div');
        headerDiv.className = 'section-header';
        headerDiv.innerHTML = `
            <div class="section-title">${section.name}</div>
            <div class="section-time">${section.time}</div>
        `;
        
        const slotsContainer = document.createElement('div');
        slotsContainer.className = 'slots-container';
        
        // Create 5 slots for each section
        for (let i = 1; i <= 5; i++) {
            const slotDiv = document.createElement('div');
            slotDiv.className = 'slot';
            slotDiv.textContent = `Slot ${i}`;
            slotDiv.dataset.section = section.id;
            slotDiv.dataset.slot = i;
            
            // Check if slot is booked
            const isBooked = await checkSlotStatus(section.id, i);
            if (isBooked) {
                slotDiv.classList.add('booked');
                slotDiv.textContent = `Slot ${i} (Booked)`;
            } else {
                slotDiv.addEventListener('click', () => openBookingModal(section.id, i));
            }
            
            slotsContainer.appendChild(slotDiv);
        }
        
        sectionDiv.appendChild(headerDiv);
        sectionDiv.appendChild(slotsContainer);
        container.appendChild(sectionDiv);
    }
}

// Modal functions
const modal = document.getElementById('bookingModal');
const closeBtn = document.getElementsByClassName('close')[0];

function openBookingModal(sectionId, slotNumber) {
    if (!modal) return;

    document.getElementById('sectionId').value = sectionId;
    document.getElementById('slotNumber').value = slotNumber;
    modal.style.display = 'block';
}

if (closeBtn) {
    closeBtn.onclick = function() {
        modal.style.display = 'none';
        const form = document.getElementById('bookingForm');
        if (form) form.reset();
    };
}

window.onclick = function(event) {
    if (event.target === modal) {
        modal.style.display = 'none';
        const form = document.getElementById('bookingForm');
        if (form) form.reset();
    }
};

// Handle form submission
const bookingForm = document.getElementById('bookingForm');
if (bookingForm) {
    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            sectionId: parseInt(document.getElementById('sectionId').value, 10),
            slotNumber: parseInt(document.getElementById('slotNumber').value, 10),
            fullName: document.getElementById('fullName').value,
            place: document.getElementById('place').value,
            mobile: document.getElementById('mobile').value
        };
        
        try {
            const response = await fetch(`${API_BASE_URL}/bookings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                alert('Booking successful! Your slot has been confirmed.');
                modal.style.display = 'none';
                bookingForm.reset();
                loadSections(); // Reload to show updated slot status
            } else {
                alert(data.message || 'Booking failed. Please try again.');
            }
        } catch (error) {
            console.error('Error booking slot:', error);
            alert('An error occurred. Please try again.');
        }
    });
}

// Initialize
updateDateTime();
setInterval(updateDateTime, 1000);
loadSections();

// Refresh slots every 30 seconds
setInterval(loadSections, 30000);
