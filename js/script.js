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

// We keep the current API results here so click handlers can find the right item later
let currentImageItems = [];

// NASA APOD API info
const APOD_URL = 'https://api.nasa.gov/planetary/apod';
const API_KEY = 'vObOdgJVNtJewP7aB1LiOuoLftcE2WzKIrVOFXbZ';

// Call the setupDateInputs function from dateRange.js
// This sets up the date pickers to:
// - Default to a range of 9 days (from 9 days ago to today)
// - Restrict dates to NASA's image archive (starting from 1995)
setupDateInputs(startInput, endInput);

// When user clicks the button, fetch and display APOD items
getImagesButton.addEventListener('click', fetchApodRange);

// Event delegation: one listener on gallery handles clicks for all card buttons
gallery.addEventListener('click', handleGalleryClick);

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

// Load default date range immediately on page load
fetchApodRange();

async function fetchApodRange() {
  // Read selected dates from input controls
  const startDate = startInput.value;
  const endDate = endInput.value;

  // Simple validation so beginners can see why nothing happens
  if (!startDate || !endDate) {
    gallery.innerHTML = '<p>Please select both start and end dates.</p>';
    return;
  }

  // Make sure the range is valid before calling NASA's API
  if (new Date(startDate) > new Date(endDate)) {
    gallery.innerHTML = '<p>Start date must be before or equal to end date.</p>';
    return;
  }

  // Show loading message while API request is running
  gallery.innerHTML = '<p>Loading space images...</p>';

  try {
    // Request APOD data for the selected date range
    const response = await fetch(
      `${APOD_URL}?api_key=${API_KEY}&start_date=${startDate}&end_date=${endDate}`
    );

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    // Convert response body from JSON text into JavaScript data
    const apodItems = await response.json();

    // API can return a single object or an array, so normalize to an array
    const itemsArray = Array.isArray(apodItems) ? apodItems : [apodItems];

    // Show newest items first
    itemsArray.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Pass cleaned and sorted data to UI renderer
    renderGallery(itemsArray);
  } catch (error) {
    console.error('Failed to fetch APOD data:', error);
    gallery.innerHTML = '<p>Sorry, we could not load NASA images right now.</p>';
  }
}

function renderGallery(items) {
  // Save this list so we can open the correct item when a card is clicked
  currentImageItems = items;

  if (items.length === 0) {
    gallery.innerHTML = '<p>No APOD results found for this date range. Try a different set of dates.</p>';
    return;
  }

  const cardsHtml = items
    .map((item, index) => {
      // data-index stores each item's position, so we can locate it on click
      const embedUrl = item.media_type === 'video' ? getEmbeddableVideoUrl(item.url) : null;

      const mediaHtml =
        item.media_type === 'video'
          ? embedUrl
            ? `<div class="video-wrapper">
                <iframe src="${embedUrl}" title="${item.title}" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>
              </div>`
            : `<div class="video-fallback">
                <a href="${item.url}" target="_blank" rel="noopener noreferrer">Open video in a new tab</a>
              </div>`
          : `<button class="open-modal-btn" data-index="${index}" aria-label="Open details for ${item.title}">
              <img src="${item.url}" alt="${item.title}" />
            </button>`;

      const helperText =
        item.media_type === 'video'
          ? embedUrl
            ? 'Embedded video from APOD.'
            : 'This provider does not allow embedding. Use the link above.'
          : 'Click the image to view full details.';

      return `
        <article class="card">
          <h2>${item.title}</h2>
          <p class="date">${item.date}</p>
          <div class="media">
            ${mediaHtml}
          </div>
          <p>${helperText}</p>
        </article>
      `;
    })
    .join('');

  // Replace old gallery content with the new cards
  gallery.innerHTML = cardsHtml;
}

function getEmbeddableVideoUrl(videoUrl) {
  // Some APOD videos use watch-page URLs that do not work inside iframes.
  // This converts known providers (YouTube/Vimeo) to embed URLs.
  try {
    const parsedUrl = new URL(videoUrl);
    const host = parsedUrl.hostname.replace('www.', '');

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (parsedUrl.pathname === '/watch') {
        const videoId = parsedUrl.searchParams.get('v');
        return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
      }

      if (parsedUrl.pathname.startsWith('/embed/')) {
        return parsedUrl.toString();
      }

      if (parsedUrl.pathname.startsWith('/shorts/')) {
        const videoId = parsedUrl.pathname.split('/')[2];
        return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
      }
    }

    if (host === 'youtu.be') {
      const videoId = parsedUrl.pathname.slice(1);
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
      const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
      const videoId = pathParts[pathParts.length - 1];
      return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
    }

    // Unknown provider: return null so UI can show an external link fallback.
    return null;
  } catch (error) {
    console.error('Invalid video URL:', error);
    return null;
  }
}

function handleGalleryClick(event) {
  // Find the closest modal button from where user clicked
  const openButton = event.target.closest('.open-modal-btn');

  if (!openButton) {
    return;
  }

  // Convert data-index text to a number (for array access)
  const itemIndex = Number(openButton.dataset.index);
  const selectedItem = currentImageItems[itemIndex];

  if (!selectedItem) {
    return;
  }

  openModal(selectedItem);
}

function openModal(item) {
  // Fill modal fields with the selected APOD data
  modalImage.src = item.hdurl || item.url;
  modalImage.alt = item.title;
  modalTitle.textContent = item.title;
  modalDate.textContent = item.date;
  modalExplanation.textContent = item.explanation;

  // Show modal and lock page scroll in the background
  imageModal.classList.add('is-visible');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  // Hide modal and restore normal page scrolling
  imageModal.classList.remove('is-visible');
  document.body.style.overflow = '';
}
