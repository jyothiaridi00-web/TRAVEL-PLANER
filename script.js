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

// Replace these values with your own API keys.
const weatherApiKey = 'YOUR_OPENWEATHERMAP_API_KEY';
const googleMapsApiKey = 'YOUR_GOOGLE_MAPS_API_KEY';
const openAiApiKey = 'YOUR_OPENAI_API_KEY';

let googleMapsPromise = null;
let map = null;
let geocoder = null;

// Load saved trips from browser local storage when the page opens.
window.addEventListener('DOMContentLoaded', () => {
  showRecommendations();
  displaySavedTrips();
  initializeMapPlaceholder();
  updateLoginState();
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

  if (!openAiApiKey || openAiApiKey === 'YOUR_OPENAI_API_KEY') {
    return defaultPlan;
  }

  const systemMessage = {
    role: 'system',
    content: 'You are a helpful travel assistant creating a friendly, readable itinerary summary for a vacation planner web app.'
  };

  const userMessage = {
    role: 'user',
    content: `Create a travel itinerary for ${destination} from ${startDate} to ${endDate} with a ${budget}-dollar budget. The traveller says: "${prompt}". Return a JSON object with title, description, and a list of 3 to 5 suggested activities.`
  };

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openAiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [systemMessage, userMessage],
        max_tokens: 400,
        temperature: 0.8
      })
    });

    if (!response.ok) {
      throw new Error('AI service returned an error');
    }

    const result = await response.json();
    const text = result.choices?.[0]?.message?.content || '';

    try {
      const json = JSON.parse(text);
      return {
        title: json.title || defaultPlan.title,
        description: json.description || defaultPlan.description,
        items: Array.isArray(json.items) ? json.items : defaultPlan.items
      };
    } catch {
      return defaultPlan;
    }
  } catch (error) {
    console.warn('AI request failed:', error);
    return defaultPlan;
  }
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

// Manage a simple login system with local storage.
function getUsers() {
  const users = localStorage.getItem('travelPlannerUsers');
  return users ? JSON.parse(users) : [];
}

function saveUsers(users) {
  localStorage.setItem('travelPlannerUsers', JSON.stringify(users));
}

function getCurrentUser() {
  return localStorage.getItem('travelPlannerCurrentUser');
}

function setCurrentUser(username) {
  localStorage.setItem('travelPlannerCurrentUser', username);
}

function clearCurrentUser() {
  localStorage.removeItem('travelPlannerCurrentUser');
}

function updateLoginState() {
  const currentUser = getCurrentUser();
  const isLoggedIn = Boolean(currentUser);

  if (isLoggedIn) {
    loginStatus.textContent = `Logged in as ${currentUser}.`;
    loginFeedback.textContent = '';
    logoutButton.hidden = false;
    loginForm.querySelector('button[type="submit"]').textContent = 'Login / Register';
    tripForm.querySelectorAll('input, button').forEach(el => el.disabled = false);
    tripForm.classList.remove('disabled-input');
  } else {
    loginStatus.textContent = 'Not logged in.';
    loginFeedback.textContent = 'Please log in before planning a trip.';
    logoutButton.hidden = true;
    tripForm.querySelectorAll('input, button').forEach(el => {
      if (el.type !== 'submit') el.disabled = true;
    });
    tripForm.classList.add('disabled-input');
  }
}

// Update weather information on the page.
function updateWeatherUI(data, destination) {
  weatherInfoElement.innerHTML = `
    <div class="weather-row">
      <strong>${destination} Weather</strong>
      <span>${data.weather[0].main}</span>
    </div>
    <div class="weather-row">
      <span>Temperature</span>
      <strong>${Math.round(data.main.temp)}°C</strong>
    </div>
    <div class="weather-row">
      <span>Feels like</span>
      <strong>${Math.round(data.main.feels_like)}°C</strong>
    </div>
    <div class="weather-row">
      <span>Humidity</span>
      <strong>${data.main.humidity}%</strong>
    </div>
    <div class="weather-row">
      <span>Wind speed</span>
      <strong>${Math.round(data.wind.speed * 3.6)} km/h</strong>
    </div>
  `;
}

// Load the Google Maps API script dynamically.
function loadGoogleMapsApi() {
  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    if (window.google && window.google.maps) {
      resolve();
      return;
    }

    if (!googleMapsApiKey || googleMapsApiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
      reject(new Error('Add your Google Maps API key in script.js to load the map.'));
      return;
    }

    window.initGoogleMap = () => {
      resolve();
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&callback=initGoogleMap`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error('Google Maps failed to load.'));
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

function initializeMapPlaceholder() {
  mapElement.innerHTML = '<p class="placeholder-text">Map will appear here after you create a trip.</p>';
}

function initializeMap() {
  map = new google.maps.Map(mapElement, {
    center: { lat: 20, lng: 0 },
    zoom: 2,
    disableDefaultUI: true,
    gestureHandling: 'cooperative',
  });
  geocoder = new google.maps.Geocoder();
}

function showMapForDestination(destination) {
  loadGoogleMapsApi()
    .then(() => {
      if (!map) {
        initializeMap();
      }

      geocoder.geocode({ address: destination }, (results, status) => {
        if (status === 'OK' && results[0]) {
          const location = results[0].geometry.location;
          map.setCenter(location);
          map.setZoom(10);
          new google.maps.Marker({ map, position: location });
        } else {
          console.warn('Geocode failed:', status);
        }
      });
    })
    .catch(error => {
      mapElement.innerHTML = `<p class="placeholder-text">Map unavailable: ${error.message}</p>`;
    });
}

// Fetch weather from OpenWeatherMap using the destination name.
async function fetchWeather(destination) {
  weatherInfoElement.innerHTML = `<p class="placeholder-text">Loading weather for ${destination}...</p>`;

  if (!weatherApiKey || weatherApiKey === 'YOUR_OPENWEATHERMAP_API_KEY') {
    weatherInfoElement.innerHTML = '<p class="placeholder-text">Add your OpenWeatherMap API key in script.js to load weather data.</p>';
    return;
  }

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(destination)}&units=metric&appid=${weatherApiKey}`
    );
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Unable to load weather');
    }

    updateWeatherUI(data, destination);
  } catch (error) {
    weatherInfoElement.innerHTML = `<p class="placeholder-text">Weather unavailable: ${error.message}</p>`;
  }
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
    button.addEventListener('click', () => {
      showItinerary(trip);
      fetchWeather(trip.destination);
      showMapForDestination(trip.destination);
    });
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
});

// Handle login form submission.
loginForm.addEventListener('submit', event => {
  event.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value.trim();

  if (!username || !password) {
    loginFeedback.textContent = 'Please enter both username and password.';
    return;
  }

  const users = getUsers();
  const existingUser = users.find(user => user.username === username);

  if (existingUser) {
    if (existingUser.password === password) {
      setCurrentUser(username);
      loginFeedback.textContent = `Welcome back, ${username}!`;
    } else {
      loginFeedback.textContent = 'Password does not match. Try again.';
      return;
    }
  } else {
    users.push({ username, password });
    saveUsers(users);
    setCurrentUser(username);
    loginFeedback.textContent = `Account created and logged in as ${username}.`;
  }

  loginForm.reset();
  updateLoginState();
});

logoutButton.addEventListener('click', () => {
  clearCurrentUser();
  loginFeedback.textContent = 'You have been logged out.';
  updateLoginState();
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
