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
const itineraryElement = document.getElementById('itinerary-content');
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
const navUser = document.getElementById('nav-user');
const itineraryActions = document.getElementById('itinerary-actions');
const exportItineraryBtn = document.getElementById('export-itinerary');
const copyItineraryBtn = document.getElementById('copy-itinerary');
const tripCountdown = document.getElementById('trip-countdown');
const generatePackingBtn = document.getElementById('generate-packing');
const packingListElement = document.getElementById('packing-list');
const nearbyHotelsElement = document.getElementById('nearby-hotels');
const nearbyRestaurantsElement = document.getElementById('nearby-restaurants');
const nearbyAttractionsElement = document.getElementById('nearby-attractions');

let currentUserEmail = null;
let activeTrip = null;
let lastWeatherCode = null;
let lastDestinationCoords = null;

let map = null;
let mapMarker = null;
let poiMarkers = [];
let poiMarkerById = new Map();

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
  setupItineraryActions();
  setupPackingList();
  setupDiscoverTabs();
  setupInstallPrompt();
});

// Show the recommended places on the page.
function showRecommendations() {
  recommendationsElement.innerHTML = '';
  recommendedPlaces.forEach(place => {
    const card = document.createElement('div');
    card.className = 'recommendation-card recommendation-clickable';
    card.innerHTML = `
      <h4>${place.title}</h4>
      <p>${place.description}</p>
      <span class="recommendation-hint">Click to use as destination</span>
    `;
    card.addEventListener('click', () => {
      const destinationField = document.getElementById('destination');
      const city = place.title.split(',')[0].trim();
      destinationField.value = city;
      destinationField.dispatchEvent(new Event('input'));
      document.getElementById('planner').scrollIntoView({ behavior: 'smooth' });
    });
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

  if (navUser) {
    navUser.textContent = isLoggedIn ? currentUserEmail.split('@')[0] : 'Guest';
  }

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

function updateWeatherUI(current, destination, daily = []) {
  const forecastHtml = daily.length
    ? `
      <div class="weather-forecast">
        <p class="weather-forecast-title">7-Day Forecast</p>
        <div class="forecast-grid">
          ${daily.map(day => `
            <div class="forecast-day">
              <span>${formatForecastDate(day.date)}</span>
              <strong>${Math.round(day.tempMax)}° / ${Math.round(day.tempMin)}°</strong>
              <small>${getWeatherDescription(day.code)}</small>
            </div>
          `).join('')}
        </div>
      </div>
    `
    : '';

  weatherInfoElement.innerHTML = `
    <div class="weather-row">
      <strong>${destination} — Now</strong>
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
    ${forecastHtml}
  `;
}

function formatForecastDate(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
}

function initializeMapPlaceholder() {
  if (map) {
    map.remove();
    map = null;
    mapMarker = null;
  }
  clearPoiMarkers();
  mapElement.innerHTML = '<p class="placeholder-text">Map will appear here after you create a trip.</p>';
}

function clearPoiMarkers() {
  poiMarkers.forEach(marker => marker.remove());
  poiMarkers = [];
  poiMarkerById.clear();
}

function setupDiscoverTabs() {
  document.querySelectorAll('.discover-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      document.querySelectorAll('.discover-tab').forEach(t => t.classList.toggle('active', t === tab));
      document.querySelectorAll('.nearby-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === `nearby-${target}`);
      });
    });
  });
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = deg => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getPoiName(tags) {
  return tags.name || tags.brand || tags['name:en'] || 'Unnamed place';
}

function getPoiSubtitle(tags, type) {
  if (type === 'hotels') {
    return tags.tourism || tags.accommodation || 'Hotel';
  }
  if (type === 'restaurants') {
    return tags.cuisine ? `${tags.amenity || 'Restaurant'} · ${tags.cuisine}` : (tags.amenity || 'Restaurant');
  }
  return tags.tourism || 'Attraction';
}

function parseOverpassElements(elements, centerLat, centerLng, type) {
  return elements
    .map(el => {
      const lat = el.lat ?? el.center?.lat;
      const lng = el.lon ?? el.center?.lon;
      if (lat == null || lng == null) return null;
      const tags = el.tags || {};
      const name = getPoiName(tags);
      if (name === 'Unnamed place') return null;
      return {
        id: `${type}-${el.type}-${el.id}`,
        name,
        subtitle: getPoiSubtitle(tags, type),
        lat,
        lng,
        distance: haversineKm(centerLat, centerLng, lat, lng),
        type
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 8);
}

async function queryOverpass(lat, lng, type) {
  const queries = {
    hotels: `
      [out:json][timeout:25];
      (
        node["tourism"~"hotel|hostel|guest_house|motel"](around:8000,${lat},${lng});
        way["tourism"~"hotel|hostel|guest_house|motel"](around:8000,${lat},${lng});
      );
      out center 12;
    `,
    restaurants: `
      [out:json][timeout:25];
      (
        node["amenity"~"restaurant|cafe|fast_food|food_court"](around:5000,${lat},${lng});
      );
      out 12;
    `,
    attractions: `
      [out:json][timeout:25];
      (
        node["tourism"~"attraction|museum|viewpoint|theme_park|gallery|zoo"](around:8000,${lat},${lng});
        way["tourism"~"attraction|museum|gallery|zoo"](around:8000,${lat},${lng});
      );
      out center 12;
    `
  };

  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: `data=${encodeURIComponent(queries[type])}`
  });

  if (!response.ok) {
    throw new Error(`Could not load ${type}.`);
  }

  const data = await response.json();
  return parseOverpassElements(data.elements || [], lat, lng, type);
}

function renderNearbyPanel(element, places, emptyMessage) {
  if (!places.length) {
    element.innerHTML = `<p class="placeholder-text">${emptyMessage}</p>`;
    return;
  }

  element.innerHTML = places.map(place => `
    <div class="poi-card" data-poi-id="${place.id}">
      <div class="poi-card-main">
        <strong>${place.name}</strong>
        <span class="poi-distance">${place.distance.toFixed(1)} km away</span>
      </div>
      <p class="poi-subtitle">${place.subtitle}</p>
      <button type="button" class="poi-map-btn" data-poi-id="${place.id}">Show on map</button>
    </div>
  `).join('');

  element.querySelectorAll('.poi-map-btn, .poi-card').forEach(el => {
    el.addEventListener('click', event => {
      const id = el.dataset.poiId || el.closest('[data-poi-id]')?.dataset.poiId;
      if (id) focusPoiOnMap(id);
    });
  });
}

function focusPoiOnMap(poiId) {
  const marker = poiMarkerById.get(poiId);
  if (!marker || !map) return;
  map.setView(marker.getLatLng(), 15);
  marker.openPopup();
  document.getElementById('map')?.scrollIntoView({ behavior: 'smooth' });
}

function addPoiMarkers(places) {
  if (!map || !window.L) return;

  const colors = {
    hotels: '#f59e0b',
    restaurants: '#ef4444',
    attractions: '#22c55e'
  };

  places.forEach(place => {
    const marker = L.circleMarker([place.lat, place.lng], {
      radius: 7,
      color: colors[place.type] || '#56c5ff',
      fillColor: colors[place.type] || '#56c5ff',
      fillOpacity: 0.85,
      weight: 2
    }).addTo(map);

    marker.bindPopup(`<strong>${place.name}</strong><br>${place.subtitle}<br>${place.distance.toFixed(1)} km away`);
    poiMarkers.push(marker);
    poiMarkerById.set(place.id, marker);
  });
}

function setNearbyLoading() {
  const message = '<p class="placeholder-text">Searching nearby places...</p>';
  nearbyHotelsElement.innerHTML = message;
  nearbyRestaurantsElement.innerHTML = message;
  nearbyAttractionsElement.innerHTML = message;
}

function clearNearbyPlaces() {
  const message = type => `<p class="placeholder-text">${type} near your destination will appear here.</p>`;
  nearbyHotelsElement.innerHTML = message('Hotels');
  nearbyRestaurantsElement.innerHTML = message('Restaurants');
  nearbyAttractionsElement.innerHTML = message('Must-visit places');
  clearPoiMarkers();
  lastDestinationCoords = null;
}

async function fetchNearbyPlaces(destination) {
  if (!nearbyHotelsElement) return;

  setNearbyLoading();

  try {
    const { lat, lng } = await geocodeDestination(destination);
    lastDestinationCoords = { lat, lng };

    const [hotels, restaurants, attractions] = await Promise.all([
      queryOverpass(lat, lng, 'hotels'),
      queryOverpass(lat, lng, 'restaurants'),
      queryOverpass(lat, lng, 'attractions')
    ]);

    renderNearbyPanel(nearbyHotelsElement, hotels, 'No hotels found nearby. Try a larger city or different spelling.');
    renderNearbyPanel(nearbyRestaurantsElement, restaurants, 'No restaurants found nearby. Try a more specific destination.');
    renderNearbyPanel(nearbyAttractionsElement, attractions, 'No attractions found nearby. Try a popular tourist area.');

    clearPoiMarkers();
    addPoiMarkers([...hotels, ...restaurants, ...attractions]);
  } catch (error) {
    const message = `<p class="placeholder-text">Unable to load nearby places: ${error.message}</p>`;
    nearbyHotelsElement.innerHTML = message;
    nearbyRestaurantsElement.innerHTML = message;
    nearbyAttractionsElement.innerHTML = message;
  }
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
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=7&timezone=auto`
    );
    const data = await response.json();

    if (!response.ok || !data.current) {
      throw new Error('Unable to load weather for this destination.');
    }

    lastWeatherCode = data.current.weather_code;
    const daily = (data.daily?.time || []).map((date, i) => ({
      date,
      tempMax: data.daily.temperature_2m_max[i],
      tempMin: data.daily.temperature_2m_min[i],
      code: data.daily.weather_code[i]
    }));

    updateWeatherUI(data.current, destination, daily);
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
    item.className = 'trip-card saved-trip-card';
    item.innerHTML = `
      <strong>${trip.destination}</strong>
      <p>${trip.startDate} — ${trip.endDate}</p>
      <p>Budget: $${trip.budget}${trip.travelers ? ` · ${trip.travelers} traveler${trip.travelers > 1 ? 's' : ''}` : ''}</p>
      <div class="trip-card-actions">
        <button type="button" class="btn-view" data-index="${index}">View</button>
        <button type="button" class="btn-duplicate" data-index="${index}">Duplicate</button>
        <button type="button" class="btn-delete" data-index="${index}">Delete</button>
      </div>
    `;
    item.querySelector('.btn-view').addEventListener('click', () => {
      loadTrip(trip);
    });
    item.querySelector('.btn-duplicate').addEventListener('click', () => {
      duplicateTrip(index);
    });
    item.querySelector('.btn-delete').addEventListener('click', () => {
      deleteTrip(index);
    });
    savedTripsElement.appendChild(item);
  });
}

function loadTrip(trip) {
  activeTrip = trip;
  showItinerary(trip);
  fetchWeather(trip.destination);
  showMapForDestination(trip.destination);
  fetchNearbyPlaces(trip.destination);
  resetPackingList();
}

function duplicateTrip(index) {
  const trips = getSavedTrips();
  const original = trips[index];
  if (!original) return;

  const copy = {
    ...original,
    startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  };
  trips.unshift(copy);
  saveTrips(trips);
  displaySavedTrips();
}

function deleteTrip(index) {
  if (!confirm('Delete this saved trip?')) return;
  const trips = getSavedTrips();
  trips.splice(index, 1);
  saveTrips(trips);
  displaySavedTrips();

  if (activeTrip && trips.every(t => t.destination !== activeTrip.destination || t.startDate !== activeTrip.startDate)) {
    activeTrip = null;
    itineraryElement.innerHTML = '<p class="placeholder-text">Fill the form to generate your itinerary.</p>';
    if (itineraryActions) itineraryActions.hidden = true;
    if (tripCountdown) tripCountdown.hidden = true;
    clearWeather();
    initializeMapPlaceholder();
    clearNearbyPlaces();
    resetPackingList();
  }
}

function buildActivityList(trip) {
  const days = Math.min(getTripDays(trip.startDate, trip.endDate), 10);
  const styleActivities = {
    adventure: ['Take a scenic hike or outdoor tour.', 'Try an adrenaline activity.', 'Explore off-the-beaten-path spots.', 'Join a guided adventure excursion.', 'Visit a national park or nature reserve.'],
    relaxation: ['Enjoy a calm beach or spa day.', 'Take a slow scenic walk.', 'Unwind at a cozy café.', 'Spend time in a peaceful garden.', 'Have a leisurely sunset evening.'],
    food: ['Sample famous street food.', 'Visit a local market.', 'Try a regional cooking class.', 'Dine at a top local restaurant.', 'Explore a food district on foot.'],
    romantic: ['Watch the sunset together.', 'Dine at an intimate restaurant.', 'Take a scenic evening stroll.', 'Book a couples experience.', 'Find a quiet viewpoint for photos.'],
    balanced: ['Explore the main landmarks.', 'Visit local cafes and markets.', 'Relax with a scenic walk.', 'Try a famous local experience.', 'Take a guided tour or museum day.', 'Enjoy a food and culture experience.', 'Spend time in nature or by the water.', 'Shop for local crafts and souvenirs.', 'Discover a hidden neighborhood.', 'Plan a relaxed farewell day.']
  };
  const activities = styleActivities[trip.tripStyle] || styleActivities.balanced;

  return Array.from({ length: days }, (_, index) =>
    `<li>Day ${index + 1}: ${activities[index % activities.length]}</li>`
  ).join('');
}

// Build the itinerary text and display it.
function showItinerary(trip) {
  activeTrip = trip;
  const estimate = calculateBudgetEstimate(trip.budget, trip.startDate, trip.endDate, trip.destination);
  const days = getTripDays(trip.startDate, trip.endDate);
  const styleLabel = formatTripStyle(trip.tripStyle);

  if (itineraryActions) itineraryActions.hidden = false;
  if (generatePackingBtn) generatePackingBtn.disabled = false;
  updateTripCountdown(trip.startDate);

  itineraryElement.innerHTML = `
    <div class="itinerary-card">
      <div class="trip-card">
        <h3>${trip.destination}</h3>
        <p><strong>Dates:</strong> ${trip.startDate} to ${trip.endDate}</p>
        <p><strong>Total budget:</strong> ${formatMoney(trip.budget)}</p>
        <p><strong>Trip length:</strong> ${estimate.tripDays} day${estimate.tripDays === 1 ? '' : 's'}</p>
        ${trip.travelers ? `<p><strong>Travelers:</strong> ${trip.travelers}</p>` : ''}
        ${styleLabel ? `<p><strong>Style:</strong> ${styleLabel}</p>` : ''}
      </div>
      ${renderBudgetBreakdown(estimate)}
      <div class="trip-card">
        <h4>Suggested activities (${styleLabel || 'Balanced'})</h4>
        <ul>${buildActivityList(trip)}</ul>
      </div>
      <div class="trip-card">
        <h4>Travel tip</h4>
        <p>Reserve about 15% of your budget for transport and unexpected costs.</p>
      </div>
    </div>
  `;
}

function formatTripStyle(style) {
  const labels = {
    balanced: 'Balanced',
    adventure: 'Adventure',
    relaxation: 'Relaxation',
    food: 'Food & Culture',
    romantic: 'Romantic'
  };
  return labels[style] || '';
}

function updateTripCountdown(startDate) {
  if (!tripCountdown) return;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const start = new Date(startDate + 'T00:00:00');
  const diffDays = Math.ceil((start - now) / (1000 * 60 * 60 * 24));

  if (diffDays > 0) {
    tripCountdown.hidden = false;
    tripCountdown.innerHTML = `<span class="countdown-badge">${diffDays} day${diffDays === 1 ? '' : 's'} until departure</span>`;
  } else if (diffDays === 0) {
    tripCountdown.hidden = false;
    tripCountdown.innerHTML = `<span class="countdown-badge countdown-today">Your trip starts today!</span>`;
  } else {
    tripCountdown.hidden = false;
    tripCountdown.innerHTML = `<span class="countdown-badge countdown-past">This trip started ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} ago</span>`;
  }
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
    budget: document.getElementById('budget').value,
    travelers: Number(document.getElementById('travelers')?.value) || 1,
    tripStyle: document.getElementById('trip-style')?.value || 'balanced'
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

function validateDates(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return startDate < endDate;
}

function buildItineraryText(trip) {
  const estimate = calculateBudgetEstimate(trip.budget, trip.startDate, trip.endDate, trip.destination);
  const activities = buildActivityList(trip).replace(/<\/?li>/g, '\n').replace(/Day /g, '- Day ').trim();
  return [
    `AJ Travel Hub — Trip Plan`,
    `Destination: ${trip.destination}`,
    `Dates: ${trip.startDate} to ${trip.endDate}`,
    `Budget: ${formatMoney(trip.budget)}`,
    `Travelers: ${trip.travelers || 1}`,
    `Style: ${formatTripStyle(trip.tripStyle) || 'Balanced'}`,
    `Trip length: ${estimate.tripDays} days`,
    `Daily spend: ${formatMoney(estimate.dailySpend)}`,
    ``,
    `Suggested activities:`,
    activities,
    ``,
    `Generated by AJ Travel Hub`
  ].join('\n');
}

function setupItineraryActions() {
  exportItineraryBtn?.addEventListener('click', () => {
    if (!activeTrip) return;
    const blob = new Blob([buildItineraryText(activeTrip)], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeTrip.destination.replace(/\s+/g, '-').toLowerCase()}-itinerary.txt`;
    link.click();
    URL.revokeObjectURL(url);
  });

  copyItineraryBtn?.addEventListener('click', async () => {
    if (!activeTrip) return;
    try {
      await navigator.clipboard.writeText(buildItineraryText(activeTrip));
      copyItineraryBtn.textContent = 'Copied!';
      setTimeout(() => { copyItineraryBtn.textContent = 'Copy to Clipboard'; }, 2000);
    } catch {
      alert('Unable to copy. Try exporting instead.');
    }
  });
}

function generatePackingItems(trip) {
  const days = getTripDays(trip.startDate, trip.endDate);
  const essentials = ['Passport / ID', 'Phone charger', 'Travel adapter', 'Wallet & cards', 'Medications', 'Toiletries'];
  const clothing = ['Comfortable walking shoes', 'Day outfit', 'Evening outfit', 'Underwear & socks', 'Light jacket'];

  if (days > 5) clothing.push('Laundry bag', 'Extra outfits');
  if (trip.travelers > 1) essentials.push(`Documents for ${trip.travelers} travelers`);

  const weatherExtras = [];
  if ([61, 63, 65, 80, 81, 82, 95, 96, 99].includes(lastWeatherCode)) {
    weatherExtras.push('Umbrella', 'Waterproof jacket', 'Quick-dry shoes');
  }
  if ([71, 73, 75].includes(lastWeatherCode)) {
    weatherExtras.push('Warm coat', 'Gloves', 'Thermal layers');
  }
  if ([0, 1].includes(lastWeatherCode)) {
    weatherExtras.push('Sunglasses', 'Sunscreen', 'Hat');
  }

  const styleExtras = {
    adventure: ['Hiking boots', 'Reusable water bottle', 'Backpack', 'First-aid kit'],
    relaxation: ['Swimsuit', 'Flip flops', 'Book or e-reader', 'Comfortable loungewear'],
    food: ['Reusable shopping bag', 'Snacks for transit', 'Notebook for restaurant picks'],
    romantic: ['Nice dinner outfit', 'Camera', 'Small gift or card'],
    balanced: ['Reusable water bottle', 'Day backpack', 'Portable battery']
  };

  return {
    Essentials: essentials,
    Clothing: clothing,
    'Weather-aware': weatherExtras.length ? weatherExtras : ['Check forecast before final packing'],
    'Trip style': styleExtras[trip.tripStyle] || styleExtras.balanced
  };
}

function renderPackingList(categories) {
  return Object.entries(categories).map(([category, items]) => `
    <div class="packing-category">
      <h4>${category}</h4>
      <ul class="packing-items">
        ${items.map((item, i) => `
          <li>
            <label>
              <input type="checkbox" id="pack-${category}-${i}" />
              <span>${item}</span>
            </label>
          </li>
        `).join('')}
      </ul>
    </div>
  `).join('');
}

function resetPackingList() {
  if (!packingListElement) return;
  packingListElement.className = 'packing-list placeholder-text';
  packingListElement.innerHTML = 'Create an itinerary first, then generate your packing checklist.';
  if (generatePackingBtn) generatePackingBtn.disabled = !activeTrip;
}

function setupPackingList() {
  generatePackingBtn?.addEventListener('click', () => {
    if (!activeTrip) return;
    const categories = generatePackingItems(activeTrip);
    packingListElement.className = 'packing-list';
    packingListElement.innerHTML = renderPackingList(categories);
  });
}

tripForm.addEventListener('submit', event => {
  event.preventDefault();

  const { destination, startDate, endDate, budget, travelers, tripStyle } = getTripFormValues();

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

  const newTrip = { destination, startDate, endDate, budget, travelers, tripStyle, createdBy: currentUser };
  const trips = getSavedTrips();
  trips.unshift(newTrip);
  saveTrips(trips);
  displaySavedTrips();
  loadTrip(newTrip);
  tripForm.reset();
  document.getElementById('travelers').value = '1';
  document.getElementById('trip-style').value = 'balanced';
  updateBudgetPreview();
  resetPackingList();
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

let deferredInstallPrompt = null;

function isAppInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function isIosDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.userAgent.includes('Mac') && 'ontouchend' in document);
}

function setupInstallPrompt() {
  const installNavBtn = document.getElementById('install-app-btn');
  const installHeroBtn = document.getElementById('install-hero-btn');
  const installBanner = document.getElementById('install-banner');
  const installBannerBtn = document.getElementById('install-banner-btn');
  const installBannerClose = document.getElementById('install-banner-close');
  const installBannerText = document.getElementById('install-banner-text');
  const iosModal = document.getElementById('install-ios-modal');
  const iosClose = document.getElementById('install-ios-close');

  if (isAppInstalled()) return;

  const showInstallUi = () => {
    installNavBtn?.removeAttribute('hidden');
    installHeroBtn?.removeAttribute('hidden');
    if (!localStorage.getItem('install-banner-dismissed')) {
      installBanner?.removeAttribute('hidden');
    }
  };

  const hideBanner = () => {
    installBanner?.setAttribute('hidden', '');
    localStorage.setItem('install-banner-dismissed', '1');
  };

  const runInstall = async () => {
    if (isIosDevice()) {
      iosModal?.removeAttribute('hidden');
      return;
    }

    if (!deferredInstallPrompt) return;

    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;

    if (outcome === 'accepted') {
      installNavBtn?.setAttribute('hidden', '');
      installHeroBtn?.setAttribute('hidden', '');
      hideBanner();
    }
  };

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredInstallPrompt = event;
    if (installBannerText) {
      installBannerText.textContent = 'Install AJ Travel Hub on your device for quick access.';
    }
    showInstallUi();
  });

  if (isIosDevice()) {
    if (installBannerText) {
      installBannerText.textContent = 'On iPhone/iPad: tap Share, then Add to Home Screen.';
    }
    showInstallUi();
  }

  installNavBtn?.addEventListener('click', runInstall);
  installHeroBtn?.addEventListener('click', runInstall);
  installBannerBtn?.addEventListener('click', runInstall);
  installBannerClose?.addEventListener('click', hideBanner);
  iosClose?.addEventListener('click', () => iosModal?.setAttribute('hidden', ''));
  iosModal?.addEventListener('click', event => {
    if (event.target === iosModal) iosModal.setAttribute('hidden', '');
  });
}

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
