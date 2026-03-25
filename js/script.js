// Find our date picker inputs on the page
const startInput = document.getElementById('startDate');
const endInput = document.getElementById('endDate');
const gallery = document.getElementById('gallery');
const getImagesButton = document.querySelector('.filters button');

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

// Load default date range immediately on page load
fetchApodRange();

async function fetchApodRange() {
  const startDate = startInput.value;
  const endDate = endInput.value;

  // Simple validation so beginners can see why nothing happens
  if (!startDate || !endDate) {
    gallery.innerHTML = '<p>Please select both start and end dates.</p>';
    return;
  }

  // Show loading message while API request is running
  gallery.innerHTML = '<p>Loading space images...</p>';

  try {
    const response = await fetch(
      `${APOD_URL}?api_key=${API_KEY}&start_date=${startDate}&end_date=${endDate}`
    );

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const apodItems = await response.json();

    // API can return a single object or an array, so normalize to an array
    const itemsArray = Array.isArray(apodItems) ? apodItems : [apodItems];

    // Show newest items first
    itemsArray.sort((a, b) => new Date(b.date) - new Date(a.date));

    renderGallery(itemsArray);
  } catch (error) {
    console.error('Failed to fetch APOD data:', error);
    gallery.innerHTML = '<p>Sorry, we could not load NASA images right now.</p>';
  }
}

function renderGallery(items) {
  if (items.length === 0) {
    gallery.innerHTML = '<p>No images found for this date range.</p>';
    return;
  }

  const cardsHtml = items
    .map((item) => {
      // APOD can be an image or a video
      const mediaHtml =
        item.media_type === 'image'
          ? `<img src="${item.url}" alt="${item.title}" />`
          : `<iframe src="${item.url}" title="${item.title}" frameborder="0" allowfullscreen></iframe>`;

      return `
        <article class="card">
          <h2>${item.title}</h2>
          <p class="date">${item.date}</p>
          <div class="media">${mediaHtml}</div>
          <p>${item.explanation}</p>
        </article>
      `;
    })
    .join('');

  gallery.innerHTML = cardsHtml;
}
