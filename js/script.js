// =========================
// 1) Grab elements from HTML
// =========================
// Find our date picker inputs on the page
const startInput = document.getElementById('startDate');
const endInput = document.getElementById('endDate');
const gallery = document.getElementById('gallery');
const getImagesButton = document.querySelector('.filters button');
const imageModal = document.getElementById('imageModal');
const closeModalButton = document.getElementById('closeModalButton');
const modalImage = document.getElementById('modalImage');
const modalTitle = document.getElementById('modalTitle');
const modalDate = document.getElementById('modalDate');
const modalExplanation = document.getElementById('modalExplanation');
const modalContent = imageModal.querySelector('.modal-content');
let modalPositionRafId = null;

// We keep the current API results here so click handlers can find the right item later.
// Example: when card #2 is clicked, we use this array to find item at index 2.
let currentImageItems = [];

// =========================
// 2) API configuration values
// =========================
// NASA APOD API info
const APOD_URL = 'https://api.nasa.gov/planetary/apod';
const API_KEY = 'vObOdgJVNtJewP7aB1LiOuoLftcE2WzKIrVOFXbZ';
const RANGE_DAYS = 9;
const LAST_RANGE_OFFSET_DAYS = RANGE_DAYS - 1;

// =========================
// 3) Initial setup + events
// =========================
// Call the setupDateInputs function from dateRange.js
// This sets up the date pickers to:
// - Default to a range of 9 days (from 9 days ago to today)
// - Restrict dates to NASA's image archive (starting from 1995)
setupDateInputs(startInput, endInput);

// When user clicks the button, fetch and display APOD items
getImagesButton.addEventListener('click', fetchApodRange);

// Event delegation: gallery handles interactions for clickable cards
gallery.addEventListener('click', handleGalleryClick);
gallery.addEventListener('keydown', handleGalleryKeydown);

// Click listener for the modal close button
closeModalButton.addEventListener('click', closeModal);

// Close when user clicks outside the modal card
imageModal.addEventListener('click', (event) => {
  // If user clicks the dark backdrop (not the white card), close modal
  if (event.target === imageModal) {
    closeModal();
  }
});

// Close when user presses Escape
document.addEventListener('keydown', (event) => {
  // Only close on Escape when modal is currently visible
  if (event.key === 'Escape' && imageModal.classList.contains('is-visible')) {
    closeModal();
  }
});

// Keep the modal aligned with the page scroller while visible.
window.addEventListener('scroll', requestModalPositionUpdate);
window.addEventListener('resize', requestModalPositionUpdate);

// Load default date range immediately on page load
fetchApodRange();

function formatDateForInput(date) {
  // Convert Date object to "YYYY-MM-DD", the format date inputs require.
  return date.toISOString().split('T')[0];
}

function createNineDayRange(startDateValue) {
  // Build an exact 9-day window from one selected start date.
  const startDate = new Date(startDateValue);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + LAST_RANGE_OFFSET_DAYS);

  return { startDate, endDate, endDateValue: formatDateForInput(endDate) };
}

function normalizeApodItems(apodItems) {
  // API may return one object or an array. This guarantees we always have an array.
  const itemsArray = Array.isArray(apodItems) ? apodItems : [apodItems];

  // Show newest items first
  return itemsArray.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function createMediaHtml(item, index) {
  // Video entries use thumbnail images. Normal entries use the image URL directly.
  if (item.media_type === 'video') {
    const videoThumbnailUrl = getVideoThumbnailUrl(item);
    return `<img class="video-thumbnail" src="${videoThumbnailUrl}" alt="Thumbnail for video: ${item.title}" />`;
  }

  return `<img src="${item.url}" alt="${item.title}" />`;
}

function createHelperText(item) {
  // Give users guidance based on media type.
  if (item.media_type === 'video') {
    return `Video preview shown. <a href="${item.url}" target="_blank" rel="noopener noreferrer">Watch video</a>.`;
  }

  return 'Click the image to view full details.';
}

function createCardHtml(item, index) {
  // Build one full HTML card per APOD result.
  const mediaHtml = createMediaHtml(item, index);
  const helperText = createHelperText(item);
  const isImageCard = item.media_type !== 'video';
  const clickClass = isImageCard ? ' is-clickable' : '';
  const clickAttributes = isImageCard
    ? ` data-index="${index}" role="button" tabindex="0" aria-label="Open details for ${item.title}"`
    : '';


  return `
    <article class="card${clickClass}"${clickAttributes}>
      <h2>${item.title}</h2>
      <div class="media">
        ${mediaHtml}
        <p class="date-badge">${item.date}</p>
      </div>
      <p>${helperText}</p>
    </article>
  `;
}

async function fetchApodRange() {
  // =========================
  // 4) Main data flow function
  // =========================
  // Read selected dates from input controls
  const startDate = startInput.value;

  // Simple validation so beginners can see why nothing happens
  if (!startDate) {
    showGalleryMessage('Please select a start date.', 'info');
    return;
  }

  // Always collect exactly 9 consecutive days starting from the selected date.
  const { endDate: calculatedEndDate, endDateValue } = createNineDayRange(startDate);

  const todayDate = new Date();

  // If the selected start date is too recent, we cannot fetch a full 9-day set.
  if (calculatedEndDate > todayDate) {
    showGalleryMessage('Please choose an earlier start date so we can fetch 9 consecutive days.', 'info');
    return;
  }

  const endDate = endDateValue;

  // Keep the end date input in sync with the exact 9-day range.
  endInput.value = endDate;

  // Show loading message while API request is running
  showGalleryMessage('Loading space images...', 'loading');

  try {
    // Request APOD data for the selected date range
    const response = await fetch(
      `${APOD_URL}?api_key=${API_KEY}&start_date=${startDate}&end_date=${endDate}&thumbs=true`
    );

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    // Convert response body from JSON text into JavaScript data
    const apodItems = await response.json();
    const itemsArray = normalizeApodItems(apodItems);

    // Pass cleaned and sorted data to UI renderer
    renderGallery(itemsArray);
  } catch (error) {
    console.error('Failed to fetch APOD data:', error);
    showGalleryMessage('Sorry, we could not load NASA images right now.', 'error');
  }
}

function showGalleryMessage(message, type = 'info') {
  // Shared renderer for messages (loading, info, error)
  // Render one centered status card in the gallery (loading/info/error)
  const loadingSpinnerHtml =
    type === 'loading' ? '<span class="loading-spinner" aria-hidden="true"></span>' : '';

  gallery.innerHTML = `
    <div class="gallery-message ${type}" role="status" aria-live="polite">
      ${loadingSpinnerHtml}
      <p>${message}</p>
    </div>
  `;
}

function renderGallery(items) {
  // =========================
  // 5) Render APOD cards
  // =========================
  // Save this list so we can open the correct item when a card is clicked
  currentImageItems = items;

  if (items.length === 0) {
    showGalleryMessage('No APOD results found for this date range. Try a different set of dates.', 'info');
    return;
  }

  const cardsHtml = items.map((item, index) => createCardHtml(item, index)).join('');

  // Replace old gallery content with the new cards
  gallery.innerHTML = cardsHtml;
}

function getVideoThumbnailUrl(item) {
  // =========================
  // 6) Video thumbnail helpers
  // =========================
  // APOD provides thumbnail_url when thumbs=true, but not for every provider.
  if (item.thumbnail_url) {
    return item.thumbnail_url;
  }

  // Build a YouTube thumbnail URL when APOD thumbnail is missing.
  const youtubeVideoId = getYouTubeVideoId(item.url);

  if (youtubeVideoId) {
    return `https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`;
  }

  // Last fallback image if no thumbnail is available.
  return 'img/nasa-worm-logo.png';
}

function getYouTubeVideoId(videoUrl) {
  // Parse common YouTube URL formats and return a video ID if found.
  try {
    const parsedUrl = new URL(videoUrl);
    const host = parsedUrl.hostname.replace('www.', '');

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (parsedUrl.pathname === '/watch') {
        return parsedUrl.searchParams.get('v');
      }

      if (parsedUrl.pathname.startsWith('/embed/')) {
        return parsedUrl.pathname.split('/')[2] || null;
      }

      if (parsedUrl.pathname.startsWith('/shorts/')) {
        return parsedUrl.pathname.split('/')[2] || null;
      }
    }

    if (host === 'youtu.be') {
      return parsedUrl.pathname.slice(1) || null;
    }

    return null;
  } catch (error) {
    console.error('Could not parse video URL for thumbnail:', error);
    return null;
  }
}

function handleGalleryClick(event) {
  // =========================
  // 7) Gallery interactions
  // =========================
  // Ignore clicks on links (like "Watch video") so default link behavior still works.
  if (event.target.closest('a')) {
    return;
  }


  // Find the closest clickable card from where user clicked.
  const openCard = event.target.closest('.card.is-clickable');

  if (!openCard) {
    return;
  }

  // Convert data-index text to a number (for array access)
  const itemIndex = Number(openCard.dataset.index);
  const selectedItem = currentImageItems[itemIndex];

  if (!selectedItem) {
    return;
  }

  openModal(selectedItem);
}

function handleGalleryKeydown(event) {
  // Keyboard support: Enter/Space opens the selected image card.
  const isOpenKey = event.key === 'Enter' || event.key === ' ';

  if (!isOpenKey) {
    return;
  }

  const focusedCard = event.target.closest('.card.is-clickable');

  if (!focusedCard) {
    return;
  }

  // Prevent page scroll on Space and trigger modal from keyboard.
  event.preventDefault();

  const itemIndex = Number(focusedCard.dataset.index);
  const selectedItem = currentImageItems[itemIndex];

  if (!selectedItem) {
    return;
  }

  openModal(selectedItem);
}

function openModal(item) {
  // =========================
  // 8) Modal open/close logic
  // =========================
  // Fill modal fields with the selected APOD data
  modalImage.src = item.hdurl || item.url;
  modalImage.alt = item.title;
  modalTitle.textContent = item.title;
  modalDate.textContent = item.date;
  modalExplanation.textContent = item.explanation;

  // Ensure the modal's internal scrollbar starts from the top each time.
  if (modalContent) {
    modalContent.scrollTop = 0;
  }

  // Match modal overlay position to current page scroll.
  updateModalPosition();

  // Show modal overlay.
  imageModal.classList.add('is-visible');
}

function closeModal() {
  // Hide modal and clear dynamic positioning state.
  imageModal.classList.remove('is-visible');
  imageModal.style.removeProperty('--modal-scroll-y');

  if (modalPositionRafId !== null) {
    cancelAnimationFrame(modalPositionRafId);
    modalPositionRafId = null;
  }
}

function requestModalPositionUpdate() {
  // Skip work if modal is hidden.
  if (!imageModal.classList.contains('is-visible')) {
    return;
  }

  // Batch scroll/resize updates into one paint frame.
  if (modalPositionRafId !== null) {
    return;
  }

  modalPositionRafId = requestAnimationFrame(() => {
    updateModalPosition();
    modalPositionRafId = null;
  });
}

function updateModalPosition() {
  // Save current page scroll on a CSS custom property the modal uses for top.
  imageModal.style.setProperty('--modal-scroll-y', `${window.scrollY}px`);
}
