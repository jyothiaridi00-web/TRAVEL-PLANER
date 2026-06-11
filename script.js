// Array with a few recommended travel places.
const recommendedPlaces = [
  { title: 'Eiffel Tower, Paris', description: 'Iconic city views and charming cafés.' },
  { title: 'Kyoto Temples', description: 'Ancient shrines, peaceful gardens, and culture.' },
  { title: 'Santorini, Greece', description: 'Sunset cliffs, white buildings, and beach days.' },
  { title: 'Banff National Park', description: 'Mountain lakes, forest trails, and fresh air.' },
  { title: 'Tokyo Street Food', description: 'Neon nights, sushi, ramen, and local markets.' }
];

const tripForm = document.getElementById('trip-form');
const savedTripsElement = document.getElementById('saved-trips');
const itineraryElement = document.getElementById('itinerary');
const recommendationsElement = document.getElementById('recommendations');
const contactForm = document.getElementById('contact-form');
const contactFeedback = document.getElementById('contact-feedback');

// Load saved trips from browser local storage when the page opens.
window.addEventListener('DOMContentLoaded', () => {
  showRecommendations();
  displaySavedTrips();
});

// Show the recommended places on the page.
function showRecommendations() {
  recommendationsElement.innerHTML = '';
  recommendedPlaces.forEach(place => {
    const card = document.createElement('div');
    card.className = 'recommendation-card';
    card.innerHTML = `
      <h4>${place.title}</h4>
      <p>${place.description}</p>
    `;
    recommendationsElement.appendChild(card);
  });
}

// Read the current saved trips from local storage.
function getSavedTrips() {
  const tripsJSON = localStorage.getItem('travelPlannerTrips');
  return tripsJSON ? JSON.parse(tripsJSON) : [];
}

// Save the trip array back to local storage.
function saveTrips(trips) {
  localStorage.setItem('travelPlannerTrips', JSON.stringify(trips));
}

// Display saved trips in the sidebar.
function displaySavedTrips() {
  const trips = getSavedTrips();
  savedTripsElement.innerHTML = '';

  if (trips.length === 0) {
    savedTripsElement.textContent = 'No trips saved yet.';
    return;
  }

  trips.forEach((trip, index) => {
    const item = document.createElement('div');
    item.className = 'trip-card';
    item.innerHTML = `
      <strong>${trip.destination}</strong>
      <p>${trip.startDate} — ${trip.endDate}</p>
      <p>Budget: $${trip.budget}</p>
      <button data-index="${index}">View</button>
    `;
    const button = item.querySelector('button');
    button.addEventListener('click', () => showItinerary(trip));
    savedTripsElement.appendChild(item);
  });
}

// Build the itinerary text and display it.
function showItinerary(trip) {
  itineraryElement.innerHTML = `
    <div class="itinerary-card">
      <div class="trip-card">
        <h3>${trip.destination}</h3>
        <p><strong>Dates:</strong> ${trip.startDate} to ${trip.endDate}</p>
        <p><strong>Budget:</strong> $${trip.budget}</p>
      </div>
      <div class="trip-card">
        <h4>Suggested activities</h4>
        <ul>
          <li>Day 1: Explore the main landmarks.</li>
          <li>Day 2: Visit local cafes and markets.</li>
          <li>Day 3: Relax with a scenic walk.</li>
          <li>Day 4: Try a famous local experience.</li>
        </ul>
      </div>
      <div class="trip-card">
        <h4>Travel tip</h4>
        <p>Keep a small daily budget for spontaneous adventures and souvenirs.</p>
      </div>
    </div>
  `;
}

// Validate the date values and calculate if the itinerary is valid.
function validateDates(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return startDate < endDate;
}

// Handle the trip form submission.
tripForm.addEventListener('submit', event => {
  event.preventDefault();

  const destination = document.getElementById('destination').value.trim();
  const startDate = document.getElementById('start-date').value;
  const endDate = document.getElementById('end-date').value;
  const budget = document.getElementById('budget').value;

  if (!destination || !startDate || !endDate || !budget) {
    alert('Please fill in every field before continuing.');
    return;
  }

  if (!validateDates(startDate, endDate)) {
    alert('Please choose an end date that is after the start date.');
    return;
  }

  const newTrip = { destination, startDate, endDate, budget };
  const trips = getSavedTrips();
  trips.unshift(newTrip); // Add newest trip first
  saveTrips(trips);
  displaySavedTrips();
  showItinerary(newTrip);
  tripForm.reset();
});

// Handle contact form submission with a small confirmation.
contactForm.addEventListener('submit', event => {
  event.preventDefault();
  const name = document.getElementById('contact-name').value.trim();
  const email = document.getElementById('contact-email').value.trim();
  const message = document.getElementById('contact-message').value.trim();

  if (!name || !email || !message) {
    contactFeedback.textContent = 'Please fill in all contact fields.';
    contactFeedback.style.color = '#ff8a8a';
    return;
  }

  contactFeedback.textContent = `Thanks, ${name}! Your message has been received.`;
  contactFeedback.style.color = '#a8ffd8';
  contactForm.reset();
});
