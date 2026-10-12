/*
 * script.js
 * Handles the vehicle service form: vehicle information, service summary,
 * live cost estimate, old-vehicle warning and client-side validation.
 * PHP repeats the checks and the cost calculation on the server.
 */

// Service prices. These must match SERVICES in process_service.php.
const SERVICES = {
    oil:       { label: 'Engine Oil Change', price: 3000 },
    brake:     { label: 'Brake Inspection', price: 2000 },
    alignment: { label: 'Wheel Alignment', price: 2500 },
    diagnosis: { label: 'Computer Diagnosis', price: 3500 },
    full:      { label: 'Full Service', price: 8000 },
    tyre:      { label: 'Tyre Balancing', price: 2000 }, // Individual requirement
};

// Information shown for each vehicle type
const VEHICLE_INFO = {
    'Saloon Car': 'Saloon cars: standard service intervals, typically 5,000 km for oil changes.',
    'SUV':        'SUVs: check wheel alignment and brakes more often because of their weight.',
    'Pickup':     'Pickups: heavy loads wear brakes and suspension, so inspections matter.',
    'Van':        'Vans: full service is recommended for vans used on long daily routes.',
};

const MIN_YEAR = 1980;
const MAX_YEAR = 2026;
const OLD_VEHICLE_YEAR = 2010; // Vehicles before this year trigger a warning

// Runs once the page has loaded. Only the service page has this form.
document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('serviceForm');
    if (!form) {
        return;
    }

    // onchange: vehicle type, year and service checkboxes
    form.addEventListener('change', function () {
        showVehicleInfo();
        checkVehicleAge();
        updateServiceSummary();
    });

    // oninput: typing the year or the phone number refreshes the warnings immediately
    form.addEventListener('input', function () {
        checkVehicleAge();
    });

    // onsubmit: stop submission if the form is invalid
    form.addEventListener('submit', function (event) {
        if (!validateServiceForm()) {
            event.preventDefault();
        }
    });

    // Set the initial state of the page
    showVehicleInfo();
    checkVehicleAge();
    updateServiceSummary();
});

/** Returns the keys of all selected services. */
function getSelectedServices() {
    return Array.from(document.querySelectorAll('input[name="services[]"]:checked'))
        .map(function (box) { return box.value; });
}

/** Shows information that matches the selected vehicle type. */
function showVehicleInfo() {
    const type = document.getElementById('vehicleType').value;
    const info = document.getElementById('vehicleInfo');
    info.textContent = VEHICLE_INFO[type] || '';
    info.hidden = !type;
}

/** Shows a warning for vehicles manufactured before the threshold year. */
function checkVehicleAge() {
    const year = parseInt(document.getElementById('year').value, 10);
    const warning = document.getElementById('ageWarning');

    if (!isNaN(year) && year >= MIN_YEAR && year < OLD_VEHICLE_YEAR) {
        warning.textContent = 'This vehicle is older than ' + (2026 - year) + ' years. '
            + 'We recommend a Computer Diagnosis and a Brake Inspection.';
        warning.hidden = false;
    } else {
        warning.textContent = '';
        warning.hidden = true;
    }
}

/** Updates the selected services list, the count and the estimated total. */
function updateServiceSummary() {
    const selected = getSelectedServices();
    const list = document.getElementById('serviceList');
    list.innerHTML = '';

    let total = 0;
    selected.forEach(function (key) {
        const service = SERVICES[key];
        total += service.price;

        const item = document.createElement('li');
        item.textContent = service.label + ': ' + formatKsh(service.price);
        list.appendChild(item);
    });

    const count = selected.length;
    document.getElementById('serviceCount').textContent =
        count + (count === 1 ? ' service selected' : ' services selected');
    document.getElementById('serviceTotal').textContent = formatKsh(total);
    document.getElementById('estimatedTotal').value = total;

    return total;
}

/** Formats a number as Kenya shillings, for example 2000 becomes "KSh 2,000". */
function formatKsh(amount) {
    return 'KSh ' + amount.toLocaleString('en-US');
}

/** Shows an error message beside a field and marks the field as invalid. */
function setError(fieldId, errorId, message) {
    const field = document.getElementById(fieldId);
    document.getElementById(errorId).textContent = message;
    if (field) {
        field.classList.add('invalid');
    }
}

/** Clears all error messages and invalid markers. */
function clearErrors() {
    document.querySelectorAll('.error').forEach(function (el) {
        el.textContent = '';
    });
    document.querySelectorAll('.invalid').forEach(function (el) {
        el.classList.remove('invalid');
    });
}

/** Returns today's date as YYYY-MM-DD using the local time. */
function todayString() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return now.getFullYear() + '-' + month + '-' + day;
}

/**
 * Validates the whole service form.
 * Returns true only when every required entry is valid.
 */
function validateServiceForm() {
    clearErrors();
    let isValid = true;
    let firstInvalid = null;

    // Helper that records an error and remembers the first invalid field
    function fail(fieldId, errorId, message) {
        setError(fieldId, errorId, message);
        isValid = false;
        if (!firstInvalid) {
            firstInvalid = document.getElementById(fieldId);
        }
    }

    // 1. Customer name is provided
    const name = document.getElementById('customerName').value.trim();
    if (name === '') {
        fail('customerName', 'customerNameError', 'Customer name is required.');
    }

    // 2. Phone number contains exactly 10 digits
    const phone = document.getElementById('phone').value.trim();
    if (!/^\d{10}$/.test(phone)) {
        fail('phone', 'phoneError', 'Phone number must contain exactly 10 digits.');
    }

    // 3. A valid email address is entered
    const email = document.getElementById('email').value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        fail('email', 'emailError', 'Please enter a valid email address.');
    }

    // 4. Vehicle registration number is provided
    const reg = document.getElementById('regNumber').value.trim();
    if (!/^[A-Za-z0-9 \-]{3,12}$/.test(reg)) {
        fail('regNumber', 'regNumberError', 'Enter a valid registration number (3 to 12 letters or digits).');
    }

    // Vehicle type and model are required
    if (document.getElementById('vehicleType').value === '') {
        fail('vehicleType', 'vehicleTypeError', 'Please select a vehicle type.');
    }
    if (document.getElementById('vehicleModel').value.trim() === '') {
        fail('vehicleModel', 'vehicleModelError', 'Vehicle model is required.');
    }

    // 5. Year of manufacture is reasonable
    const year = parseInt(document.getElementById('year').value, 10);
    if (isNaN(year) || year < MIN_YEAR || year > MAX_YEAR) {
        fail('year', 'yearError', 'Year of manufacture must be between ' + MIN_YEAR + ' and ' + MAX_YEAR + '.');
    }

    // Service date must be today or later
    const serviceDate = document.getElementById('serviceDate').value;
    if (serviceDate === '' || serviceDate < todayString()) {
        fail('serviceDate', 'serviceDateError', 'Please choose a service date that is today or later.');
    }

    // 6. At least one service is selected
    if (getSelectedServices().length === 0) {
        document.getElementById('servicesError').textContent = 'Please select at least one service.';
        isValid = false;
        if (!firstInvalid) {
            firstInvalid = document.querySelector('input[name="services[]"]');
        }
    }

    // 7. Messages are shown above. Stop submission and focus the first problem.
    if (!isValid && firstInvalid) {
        firstInvalid.focus();
    }

    return isValid;
}
