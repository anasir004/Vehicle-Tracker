const express = require('express');
const http = require('http');
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let lastLocation = {
  lat: 11.0753,
  lng: 7.7227,
  time: 'Waiting for GPS...'
};

// Keep Railway alive every 25 minutes
setInterval(() => {
  http.get('http://vehicle-tracker-production-d3bc.up.railway.app/location',
    (res) => console.log('[KEEPALIVE] Pinged:', res.statusCode)
  ).on('error', (e) => console.log('[KEEPALIVE] Error:', e.message));
}, 25 * 60 * 1000);

// ESP8266 sends GET request here
app.get('/update', (req, res) => {
  const { lat, lng } = req.query;
  if (lat && lng) {
    lastLocation = {
      lat: parseFloat(lat).toFixed(6),
      lng: parseFloat(lng).toFixed(6),
      time: new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })
    };
    console.log(`[UPDATE] Lat: ${lat}, Lng: ${lng}`);
  }
  res.send('OK');
});

// Keep POST as backup
app.post('/update', (req, res) => {
  const { lat, lng } = req.body;
  if (lat && lng) {
    lastLocation = {
      lat: parseFloat(lat).toFixed(6),
      lng: parseFloat(lng).toFixed(6),
      time: new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })
    };
    console.log(`[UPDATE POST] Lat: ${lat}, Lng: ${lng}`);
  }
  res.send('OK');
});

// Browser polls this
app.get('/location', (req, res) => res.json(lastLocation));

// Main dashboard — OpenStreetMap via Leaflet (no API key needed)
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🚗 Vehicle Tracker</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; }
    #map { height: 100vh; width: 100%; }
    #panel {
      position: absolute; top: 12px; left: 12px;
      background: white; padding: 12px 16px;
      border-radius: 10px; z-index: 999;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      min-width: 220px;
    }
    #panel h3 { font-size: 14px; color: #333; margin-bottom: 6px; }
    #coords { font-size: 13px; color: #555; margin-bottom: 4px; }
    #timestamp { font-size: 11px; color: #999; }
    #status {
      display: inline-block; margin-top: 6px;
      font-size: 11px; padding: 2px 8px;
      border-radius: 10px; background: #e8f5e9; color: #2e7d32;
    }
  </style>
</head>
<body>
  <div id="panel">
    <h3>🚗 Vehicle Tracker</h3>
    <div id="coords">Fetching location...</div>
    <div id="timestamp"></div>
    <span id="status">● LIVE</span>
  </div>
  <div id="map"></div>
  <script>
    var map = L.map('map').setView([11.0753, 7.7227], 16);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    var marker = L.marker([11.0753, 7.7227]).addTo(map);
    var isFirstLoad = true;

    function fetchLocation() {
      fetch('/location')
        .then(r => r.json())
        .then(data => {
          var lat = parseFloat(data.lat);
          var lng = parseFloat(data.lng);
          marker.setLatLng([lat, lng]);
          if (isFirstLoad) {
            map.setView([lat, lng], 16);
            isFirstLoad = false;
          }
          document.getElementById('coords').innerHTML =
            '📍 ' + data.lat + ', ' + data.lng;
          document.getElementById('timestamp').innerHTML =
            '🕐 ' + data.time;
          document.getElementById('status').style.background = '#e8f5e9';
          document.getElementById('status').style.color = '#2e7d32';
          document.getElementById('status').innerHTML = '● LIVE';
        })
        .catch(() => {
          document.getElementById('status').style.background = '#ffebee';
          document.getElementById('status').style.color = '#c62828';
          document.getElementById('status').innerHTML = '● OFFLINE';
        });
    }

    fetchLocation();
    setInterval(fetchLocation, 5000);
  </script>
</body>
</html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Tracker running on port ' + PORT));
