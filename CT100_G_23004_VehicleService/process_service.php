<?php
/*
 * process_service.php
 * Receives the service request via POST, validates it on the server,
 * recalculates the cost independently of JavaScript, and shows a confirmation.
 */

// Service prices, keyed by the checkbox values in service.html.
// 'tyre' is the individual requirement (tyre balancing, KSh 2,000).
const SERVICES = [
    'oil'       => ['name' => 'Engine Oil Change',  'price' => 3000],
    'brake'     => ['name' => 'Brake Inspection',   'price' => 2000],
    'alignment' => ['name' => 'Wheel Alignment',    'price' => 2500],
    'diagnosis' => ['name' => 'Computer Diagnosis', 'price' => 3500],
    'full'      => ['name' => 'Full Service',       'price' => 8000],
    'tyre'      => ['name' => 'Tyre Balancing',     'price' => 2000],
];

const VEHICLE_TYPES = ['Saloon Car', 'SUV', 'Pickup', 'Van'];
const MIN_YEAR = 1980;
const MAX_YEAR = 2026;

// Only accept POST requests. Anything else goes back to the form.
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: service.html');
    exit;
}

/** Returns a trimmed POST value, or an empty string if it is missing. */
function getPost(string $key): string
{
    return isset($_POST[$key]) ? trim((string) $_POST[$key]) : '';
}

/** Escapes text for safe output in HTML. */
function h(string $text): string
{
    return htmlspecialchars($text, ENT_QUOTES, 'UTF-8');
}

/** Formats an amount in Kenya shillings. */
function formatKsh(int $amount): string
{
    return 'KSh ' . number_format($amount);
}

// Read the submitted values
$customerName = getPost('customerName');
$phone        = getPost('phone');
$email        = getPost('email');
$regNumber    = getPost('regNumber');
$vehicleType  = getPost('vehicleType');
$vehicleModel = getPost('vehicleModel');
$yearInput    = getPost('year');
$serviceDate  = getPost('serviceDate');
$clientTotal  = (int) getPost('estimatedTotal');
$serviceInput = (isset($_POST['services']) && is_array($_POST['services']))
                    ? $_POST['services'] : [];

// Server-side validation
$errors = [];

if ($customerName === '') {
    $errors[] = 'Customer name is required.';
}
if (!preg_match('/^\d{10}$/', $phone)) {
    $errors[] = 'Phone number must contain exactly 10 digits.';
}
if (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
    $errors[] = 'A valid email address is required.';
}
if ($regNumber === '' || !preg_match('/^[A-Za-z0-9 \-]{3,12}$/', $regNumber)) {
    $errors[] = 'A valid vehicle registration number is required.';
}
if (!in_array($vehicleType, VEHICLE_TYPES, true)) {
    $errors[] = 'Please select a valid vehicle type.';
}
if ($vehicleModel === '') {
    $errors[] = 'Vehicle model is required.';
}
$year = filter_var($yearInput, FILTER_VALIDATE_INT, [
    'options' => ['min_range' => MIN_YEAR, 'max_range' => MAX_YEAR],
]);
if ($year === false) {
    $errors[] = 'Year of manufacture must be between ' . MIN_YEAR . ' and ' . MAX_YEAR . '.';
}

// The service date must be a valid date that is today or later
$dateValid = false;
if ($serviceDate !== '') {
    $dateObj = DateTime::createFromFormat('Y-m-d', $serviceDate);
    $today    = new DateTime('today');
    if ($dateObj && $dateObj->format('Y-m-d') === $serviceDate && $dateObj >= $today) {
        $dateValid = true;
    }
}
if (!$dateValid) {
    $errors[] = 'Please choose a service date that is today or later.';
}

// Keep only valid service keys, without duplicates
$selectedKeys = [];
foreach (array_unique($serviceInput) as $key) {
    if (array_key_exists($key, SERVICES)) {
        $selectedKeys[] = $key;
    }
}
if (empty($selectedKeys)) {
    $errors[] = 'Please select at least one service.';
}

// Show the errors and stop if anything is invalid
if (!empty($errors)) {
    http_response_code(400);
    ?>
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Service Request Error</title>
        <link rel="stylesheet" href="css/style.css">
    </head>
    <body>
        <main class="container">
            <div class="result result-error">
                <h1>Service request could not be completed</h1>
                <ul>
                    <?php foreach ($errors as $error): ?>
                        <li><?= h($error) ?></li>
                    <?php endforeach; ?>
                </ul>
                <a href="service.html" class="btn">Return to the form</a>
            </div>
        </main>
    </body>
    </html>
    <?php
    exit;
}

// Recalculate the cost on the server
$serviceTotal = 0;
$serviceNames = [];
foreach ($selectedKeys as $key) {
    $serviceTotal += SERVICES[$key]['price'];
    $serviceNames[] = SERVICES[$key]['name'];
}

// Note whether the browser's total differed from the server's total
$totalMismatch = ($clientTotal !== $serviceTotal);

$formattedDate = DateTime::createFromFormat('Y-m-d', $serviceDate)->format('j F Y');
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Service Request Received | AutoCare Garage</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>

    <header class="site-header">
        <div class="container nav-wrap">
            <span class="brand">AutoCare Garage</span>
            <nav>
                <a href="index.html">Home</a>
                <a href="service.html">Book a Service</a>
            </nav>
        </div>
    </header>

    <main class="container">
        <div class="result">
            <h1>SERVICE REQUEST RECEIVED</h1>

            <table class="confirmation">
                <tr><th>Customer</th><td><?= h($customerName) ?></td></tr>
                <tr><th>Phone</th><td><?= h($phone) ?></td></tr>
                <tr><th>Email</th><td><?= h($email) ?></td></tr>
                <tr><th>Vehicle</th><td><?= h($regNumber) ?></td></tr>
                <tr><th>Vehicle Model</th><td><?= h($vehicleModel) ?> (<?= $year ?>)</td></tr>
                <tr><th>Vehicle Type</th><td><?= h($vehicleType) ?></td></tr>
                <tr><th>Service Date</th><td><?= h($formattedDate) ?></td></tr>
            </table>

            <h2>Selected Services</h2>
            <table class="confirmation">
                <?php foreach ($selectedKeys as $key): ?>
                    <tr>
                        <td><?= h(SERVICES[$key]['name']) ?></td>
                        <td><?= formatKsh(SERVICES[$key]['price']) ?></td>
                    </tr>
                <?php endforeach; ?>
            </table>

            <p class="total-line">ESTIMATED SERVICE COST: <strong><?= formatKsh($serviceTotal) ?></strong></p>

            <?php if ($totalMismatch): ?>
                <p class="note">The cost was recalculated on the server, so the amount shown above is the one that applies.</p>
            <?php endif; ?>

            <p>Thank you for choosing AutoCare Garage. We will contact you to confirm your booking.</p>
            <a href="index.html" class="btn">Back to Home</a>
        </div>
    </main>

    <footer class="site-footer">
        <p>&copy; 2026 AutoCare Garage. All rights reserved.</p>
    </footer>

</body>
</html>
