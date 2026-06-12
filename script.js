import { loginOrRegister, signOutUser, watchAuth, getAuthErrorMessage } from './firebase.js';

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
const weatherInfoElement = document.getElementById('weather-info');
const aiPrompt = document.getElementById('ai-prompt');
const aiGenerateButton = document.getElementById('ai-generate');
const aiResult = document.getElementById('ai-result');
const contactForm = document.getElementById('contact-form');
const contactFeedback = document.getElementById('contact-feedback');
const mapElement = document.getElementById('map');
const loginForm = document.getElementById('login-form');
const loginFeedback = document.getElementById('login-feedback');
const loginStatus = document.getElementById('login-status');
const logoutButton = document.getElementById('logout-button');

let currentUserEmail = null;

let map = null;
let mapMarker = null;

watchAuth(user => {
  currentUserEmail = user?.email || null;
  updateLoginState();
  displaySavedTrips();
});

window.addEventListener('DOMContentLoaded', () => {
  showRecommendations();
  displaySavedTrips();
  initializeMapPlaceholder();
  updateLoginState();
  setupBudgetPreview();
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

// Clear the weather panel when no trip is loaded.
function clearWeather() {
  weatherInfoElement.innerHTML = '<p class="placeholder-text">Enter your destination and generate the itinerary to see weather details.</p>';
}

function getAiTheme(prompt) {
  const value = prompt.toLowerCase();
  if (value.includes('adventure') || value.includes('hike') || value.includes('explore')) return 'Adventure';
  if (value.includes('relax') || value.includes('spa') || value.includes('beach')) return 'Relaxation';
  if (value.includes('food') || value.includes('market') || value.includes('cafe')) return 'Food & Culture';
  if (value.includes('romantic') || value.includes('couple') || value.includes('sunset')) return 'Romantic';
  return 'Discovery';
}

async function fetchAiTripPlan(prompt, destination, startDate, endDate, budget) {
  const defaultPlan = generateAiTripPlan(prompt, destination, startDate, endDate, budget);

  return defaultPlan;
}

function generateAiTripPlan(prompt, destination, startDate, endDate, budget) {
  const theme = getAiTheme(prompt);
  const days = Math.max(1, Math.min(7, Math.round((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24) || 3)));
  const budgetStyle = budget > 3000 ? 'luxury' : budget > 1500 ? 'comfortable' : 'budget-friendly';

  const suggestions = {
    Adventure: ['Take a scenic hike', 'Try a local adventure tour', 'Explore a hidden viewpoint'],
    Relaxation: ['Enjoy a calm beach day', 'Visit a peaceful spa', 'Savor slow walks in nature'],
    'Food & Culture': ['Sample street food', 'Visit local markets', 'Take a cooking class'],
    Romantic: ['Watch a sunset together', 'Dine in a cozy restaurant', 'Take a river or evening stroll'],
    Discovery: ['Explore the top landmarks', 'Meet friendly local guides', 'Find a beautiful scenic spot']
  };

  const themeActivities = suggestions[theme];
  const daysList = Array.from({ length: days }, (_, index) => {
    const activity = themeActivities[index % themeActivities.length];
    return `Day ${index + 1}: ${activity} and discover more of ${destination}.`;
  });

  return {
    title: `${theme} AI trip plan for ${destination}`,
    description: `A ${budgetStyle} ${theme.toLowerCase()} itinerary for ${days} day${days === 1 ? '' : 's'} in ${destination}.`,
    items: daysList
  };
}

async function showAiPlan() {
  const prompt = aiPrompt?.value.trim() || 'friendly travel adventure';
  const destination = document.getElementById('destination').value.trim() || 'your destination';
  const startDate = document.getElementById('start-date').value || new Date().toISOString().slice(0, 10);
  const endDate = document.getElementById('end-date').value || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const budget = Number(document.getElementById('budget').value) || 1500;

  aiResult.innerHTML = '<p class="placeholder-text">Generating AI itinerary...</p>';
  const plan = await fetchAiTripPlan(prompt, destination, startDate, endDate, budget);

  aiResult.innerHTML = `
    <h4>${plan.title}</h4>
    <p>${plan.description}</p>
    <ul>${plan.items.map(item => `<li>${item}</li>`).join('')}</ul>
  `;
}

aiGenerateButton?.addEventListener('click', showAiPlan);

function getCurrentUser() {
  return currentUserEmail;
}

function updateLoginState() {
  const isLoggedIn = Boolean(currentUserEmail);

  if (!loginStatus || !tripForm) return;

  if (isLoggedIn) {
    loginStatus.textContent = `Logged in as ${currentUserEmail}.`;
    if (loginFeedback) loginFeedback.textContent = '';
    if (logoutButton) logoutButton.hidden = false;
    tripForm.querySelectorAll('input, button').forEach(el => el.disabled = false);
    tripForm.classList.remove('disabled-input');
  } else {
    loginStatus.textContent = 'Not logged in.';
    if (loginFeedback) loginFeedback.textContent = 'Please log in before planning a trip.';
    if (logoutButton) logoutButton.hidden = true;
    tripForm.querySelectorAll('input, button').forEach(el => {
      if (el.type !== 'submit') el.disabled = true;
    });
    tripForm.classList.add('disabled-input');
  }
}

function getWeatherDescription(code) {
  const descriptions = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Foggy',
    51: 'Light drizzle',
    53: 'Drizzle',
    55: 'Heavy drizzle',
    61: 'Light rain',
    63: 'Rain',
    65: 'Heavy rain',
    71: 'Light snow',
    73: 'Snow',
    75: 'Heavy snow',
    80: 'Rain showers',
    81: 'Rain showers',
    82: 'Heavy rain showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with hail',
    99: 'Thunderstorm with hail'
  };
  return descriptions[code] || 'Current conditions';
}

function updateWeatherUI(current, destination) {
  weatherInfoElement.innerHTML = `
    <div class="weather-row">
      <strong>${destination} Weather</strong>
      <span>${getWeatherDescription(current.weather_code)}</span>
    </div>
    <div class="weather-row">
      <span>Temperature</span>
      <strong>${Math.round(current.temperature_2m)}°C</strong>
    </div>
    <div class="weather-row">
      <span>Feels like</span>
      <strong>${Math.round(current.apparent_temperature)}°C</strong>
    </div>
    <div class="weather-row">
      <span>Humidity</span>
      <strong>${current.relative_humidity_2m}%</strong>
    </div>
    <div class="weather-row">
      <span>Wind speed</span>
      <strong>${Math.round(current.wind_speed_10m)} km/h</strong>
    </div>
  `;
}

function initializeMapPlaceholder() {
  if (map) {
    map.remove();
    map = null;
    mapMarker = null;
  }
  mapElement.innerHTML = '<p class="placeholder-text">Map will appear here after you create a trip.</p>';
}

function initializeMap() {
  if (!window.L) {
    throw new Error('Map library failed to load.');
  }

  if (map) {
    map.remove();
  }

  mapElement.innerHTML = '';
  map = L.map(mapElement, { zoomControl: true }).setView([20, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);
}

async function geocodeDestination(destination) {
  const response = await fetch(
    `https://photon.komoot.io/api/?q=${encodeURIComponent(destination)}&limit=1`
  );

  if (!response.ok) {
    throw new Error('Unable to find this destination on the map.');
  }

  const data = await response.json();
  const feature = data.features?.[0];

  if (!feature) {
    throw new Error('Destination not found. Try a more specific place name.');
  }

  const [lng, lat] = feature.geometry.coordinates;
  return { lat, lng };
}

async function showMapForDestination(destination) {
  try {
    if (!map) {
      initializeMap();
    }

    const { lat, lng } = await geocodeDestination(destination);
    map.setView([lat, lng], 10);

    if (mapMarker) {
      mapMarker.remove();
    }

    mapMarker = L.marker([lat, lng]).addTo(map);
    map.invalidateSize();
  } catch (error) {
    initializeMapPlaceholder();
    mapElement.innerHTML = `<p class="placeholder-text">${error.message}</p>`;
  }
}

async function fetchWeather(destination) {
  weatherInfoElement.innerHTML = `<p class="placeholder-text">Loading weather for ${destination}...</p>`;

  try {
    const { lat, lng } = await geocodeDestination(destination);
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code`
    );
    const data = await response.json();

    if (!response.ok || !data.current) {
      throw new Error('Unable to load weather for this destination.');
    }

    updateWeatherUI(data.current, destination);
  } catch (error) {
    weatherInfoElement.innerHTML = `<p class="placeholder-text">Weather unavailable: ${error.message}</p>`;
  }
}

function getTripsStorageKey() {
  return currentUserEmail ? `travelPlannerTrips:${currentUserEmail}` : 'travelPlannerTrips';
}

function getSavedTrips() {
  if (!currentUserEmail) return [];
  const tripsJSON = localStorage.getItem(getTripsStorageKey());
  return tripsJSON ? JSON.parse(tripsJSON) : [];
}

// Save the trip array back to local storage.
function saveTrips(trips) {
  if (!currentUserEmail) return;
  localStorage.setItem(getTripsStorageKey(), JSON.stringify(trips));
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
    button.addEventListener('click', () => {
      showItinerary(trip);
      fetchWeather(trip.destination);
      showMapForDestination(trip.destination);
    });
    savedTripsElement.appendChild(item);
  });
}

function buildActivityList(trip) {
  const days = Math.min(getTripDays(trip.startDate, trip.endDate), 10);
  const activities = [
    'Explore the main landmarks.',
    'Visit local cafes and markets.',
    'Relax with a scenic walk.',
    'Try a famous local experience.',
    'Take a guided tour or museum day.',
    'Enjoy a food and culture experience.',
    'Spend time in nature or by the water.',
    'Shop for local crafts and souvenirs.',
    'Discover a hidden neighborhood.',
    'Plan a relaxed farewell day.'
  ];

  return Array.from({ length: days }, (_, index) =>
    `<li>Day ${index + 1}: ${activities[index % activities.length]}</li>`
  ).join('');
}

// Build the itinerary text and display it.
function showItinerary(trip) {
  const estimate = calculateBudgetEstimate(trip.budget, trip.startDate, trip.endDate, trip.destination);

  itineraryElement.innerHTML = `
    <div class="itinerary-card">
      <div class="trip-card">
        <h3>${trip.destination}</h3>
        <p><strong>Dates:</strong> ${trip.startDate} to ${trip.endDate}</p>
        <p><strong>Total budget:</strong> ${formatMoney(trip.budget)}</p>
        <p><strong>Trip length:</strong> ${estimate.tripDays} day${estimate.tripDays === 1 ? '' : 's'}</p>
      </div>
      ${renderBudgetBreakdown(estimate)}
      <div class="trip-card">
        <h4>Suggested activities</h4>
        <ul>${buildActivityList(trip)}</ul>
      </div>
      <div class="trip-card">
        <h4>Travel tip</h4>
        <p>Reserve about 15% of your budget for transport and unexpected costs.</p>
      </div>
    </div>
  `;
}

function getTripDays(startDate, endDate) {
  const ms = new Date(endDate) - new Date(startDate);
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function getDestinationCostProfile(destination) {
  const value = destination.toLowerCase();
  const profiles = [
    { keywords: ['paris', 'tokyo', 'london', 'new york', 'zurich', 'dubai', 'singapore', 'sydney'], daily: 220, label: 'premium' },
    { keywords: ['bali', 'barcelona', 'rome', 'bangkok', 'amsterdam', 'kyoto', 'santorini'], daily: 140, label: 'moderate' },
    { keywords: ['india', 'vietnam', 'portugal', 'mexico', 'thailand', 'prague'], daily: 95, label: 'budget-friendly' }
  ];

  const match = profiles.find(profile => profile.keywords.some(keyword => value.includes(keyword)));
  return match || { daily: 120, label: 'standard' };
}

function calculateBudgetEstimate(totalBudget, startDate, endDate, destination) {
  const tripDays = getTripDays(startDate, endDate);
  const budget = Number(totalBudget) || 0;
  const dailySpend = budget / tripDays;
  const tenDayAtCurrentRate = dailySpend * 10;
  const profile = getDestinationCostProfile(destination);
  const recommendedTenDay = profile.daily * 10;
  const recommendedForTrip = profile.daily * tripDays;
  const difference = budget - recommendedForTrip;

  let status;
  let message;

  if (budget >= recommendedForTrip * 1.1) {
    status = 'comfortable';
    message = 'Your budget looks comfortable for this destination.';
  } else if (budget >= recommendedForTrip * 0.85) {
    status = 'balanced';
    message = 'Your budget is close to the typical spend for this destination.';
  } else {
    status = 'tight';
    message = 'Your budget may be tight. Consider reducing activities or extending planning.';
  }

  return {
    tripDays,
    dailySpend,
    tenDayAtCurrentRate,
    recommendedDaily: profile.daily,
    recommendedTenDay,
    recommendedForTrip,
    difference,
    status,
    message,
    profileLabel: profile.label,
    totalBudget: budget,
    tripCategories: getCategorySplit(budget),
    tenDayCategories: getCategorySplit(tenDayAtCurrentRate)
  };
}

const BUDGET_CATEGORIES = [
  { key: 'lodging', label: 'Lodging', pct: 40 },
  { key: 'food', label: 'Food', pct: 30 },
  { key: 'transport', label: 'Transport', pct: 15 },
  { key: 'activities', label: 'Activities', pct: 15 }
];

function getCategorySplit(total) {
  return {
    lodging: total * 0.4,
    food: total * 0.3,
    transport: total * 0.15,
    activities: total * 0.15
  };
}

function formatMoney(amount) {
  return `$${Math.round(amount).toLocaleString()}`;
}

function renderCategoryRows(categories, title) {
  const rows = BUDGET_CATEGORIES.map(({ key, label, pct }) => `
    <div class="budget-row category-row">
      <span>${label} (${pct}%)</span>
      <strong>${formatMoney(categories[key])}</strong>
    </div>
  `).join('');

  return `
    <div class="budget-category-block">
      <p class="budget-category-title">${title}</p>
      ${rows}
    </div>
  `;
}

function renderBudgetBreakdown(estimate) {
  const statusClass = `budget-status-${estimate.status}`;
  const differenceText = estimate.difference >= 0
    ? `${formatMoney(estimate.difference)} above typical`
    : `${formatMoney(Math.abs(estimate.difference))} below typical`;

  return `
    <div class="trip-card budget-card">
      <h4>10-Day Budget Estimate</h4>
      <p class="budget-intro">Based on your total budget, trip length, and destination.</p>
      <div class="budget-row">
        <span>Your trip length</span>
        <strong>${estimate.tripDays} day${estimate.tripDays === 1 ? '' : 's'}</strong>
      </div>
      <div class="budget-row">
        <span>Your daily spend</span>
        <strong>${formatMoney(estimate.dailySpend)} / day</strong>
      </div>
      <div class="budget-row highlight">
        <span>Estimated for 10 days</span>
        <strong>${formatMoney(estimate.tenDayAtCurrentRate)}</strong>
      </div>
      <div class="budget-row">
        <span>Typical spend (${estimate.profileLabel})</span>
        <strong>${formatMoney(estimate.recommendedDaily)} / day</strong>
      </div>
      <div class="budget-row">
        <span>Recommended for 10 days</span>
        <strong>${formatMoney(estimate.recommendedTenDay)}</strong>
      </div>
      <div class="budget-row">
        <span>Vs typical ${estimate.tripDays}-day trip</span>
        <strong>${differenceText}</strong>
      </div>
      ${renderCategoryRows(estimate.tripCategories, `Spending breakdown (${estimate.tripDays} days)`)}
      ${renderCategoryRows(estimate.tenDayCategories, 'Spending breakdown (10 days)')}
      <p class="budget-message ${statusClass}">${estimate.message}</p>
    </div>
  `;
}

function renderBudgetPreview(estimate) {
  const statusClass = `budget-status-${estimate.status}`;

  return `
    <p class="budget-preview-title">Live 10-day estimate</p>
    <div class="budget-row highlight">
      <span>Estimated for 10 days</span>
      <strong>${formatMoney(estimate.tenDayAtCurrentRate)}</strong>
    </div>
    <div class="budget-row">
      <span>Daily spend</span>
      <strong>${formatMoney(estimate.dailySpend)} / day</strong>
    </div>
    ${renderCategoryRows(estimate.tenDayCategories, '10-day category split')}
    <p class="budget-message ${statusClass}">${estimate.message}</p>
  `;
}

function getTripFormValues() {
  return {
    destination: document.getElementById('destination').value.trim(),
    startDate: document.getElementById('start-date').value,
    endDate: document.getElementById('end-date').value,
    budget: document.getElementById('budget').value
  };
}

function updateBudgetPreview() {
  const preview = document.getElementById('budget-preview');
  if (!preview) return;

  const { destination, startDate, endDate, budget } = getTripFormValues();

  if (!destination || !startDate || !endDate || !budget) {
    preview.className = 'budget-preview placeholder-text';
    preview.innerHTML = 'Fill in destination, dates, and budget to see a live 10-day estimate.';
    return;
  }

  if (!validateDates(startDate, endDate)) {
    preview.className = 'budget-preview placeholder-text';
    preview.innerHTML = 'Choose an end date after the start date to calculate your budget.';
    return;
  }

  const estimate = calculateBudgetEstimate(budget, startDate, endDate, destination);
  preview.className = 'budget-preview';
  preview.innerHTML = renderBudgetPreview(estimate);
}

function setupBudgetPreview() {
  ['destination', 'start-date', 'end-date', 'budget'].forEach(id => {
    const field = document.getElementById(id);
    field?.addEventListener('input', updateBudgetPreview);
    field?.addEventListener('change', updateBudgetPreview);
  });
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

  const currentUser = getCurrentUser();
  if (!currentUser) {
    alert('Please log in before saving a trip.');
    return;
  }

  const newTrip = { destination, startDate, endDate, budget, createdBy: currentUser };
  const trips = getSavedTrips();
  trips.unshift(newTrip); // Add newest trip first
  saveTrips(trips);
  displaySavedTrips();
  showItinerary(newTrip);
  fetchWeather(destination);
  showMapForDestination(destination);
  tripForm.reset();
  updateBudgetPreview();
});

loginForm?.addEventListener('submit', async event => {
  event.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!email || !password) {
    loginFeedback.textContent = 'Please enter both email and password.';
    return;
  }

  if (password.length < 6) {
    loginFeedback.textContent = 'Password must be at least 6 characters.';
    return;
  }

  loginFeedback.textContent = 'Signing in...';

  try {
    await loginOrRegister(email, password);
    loginFeedback.textContent = 'Welcome! You are now logged in.';
    loginForm.reset();
  } catch (error) {
    loginFeedback.textContent = getAuthErrorMessage(error);
  }
});

logoutButton?.addEventListener('click', async () => {
  try {
    await signOutUser();
    loginFeedback.textContent = 'You have been logged out.';
  } catch (error) {
    loginFeedback.textContent = `Logout failed: ${error.message}`;
  }
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
