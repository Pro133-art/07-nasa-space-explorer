
// NOTE: You do not need to edit this file.
// This helper is separated to keep date rules reusable and easy to understand.

// NASA's APOD API only has images from June 16, 1995 onwards
const earliestDate = '1995-06-16';

// Get today's date in YYYY-MM-DD format (required by date inputs)
const today = new Date().toISOString().split('T')[0];

function setupDateInputs(startInput, endInput) {
  // =========================
  // 1) Apply valid date limits
  // =========================
  // Add min/max constraints so users can only pick valid APOD dates
  // Restrict date selection range from NASA's first image to today
  startInput.min = earliestDate;
  startInput.max = today;
  endInput.min = earliestDate;
  endInput.max = today;

  // =========================
  // 2) Set default 9-day window
  // =========================
  // Default: Show the most recent 9 days of space images
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 8); // minus 8 because it includes today
  startInput.value = lastWeek.toISOString().split('T')[0];
  endInput.value = today;

  // =========================
  // 3) Keep end date in sync
  // =========================
  // Automatically adjust end date to show exactly 9 days of images
  startInput.addEventListener('change', () => {
    // Convert selected start date string into a Date object
    const startDate = new Date(startInput.value);

    // Clone start date, then move forward 8 days (9 total including start)
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 8);

    // Prevent end date from going beyond today's date
    endInput.value = endDate > new Date(today) ? today : endDate.toISOString().split('T')[0];
  });
}
