const express = require('express');
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let lastLocation = { lat: 9.0820, lng: 8.6753, time: 'Waiting for GPS...' };

// ESP8266 sends data here
app.post('/update', (req, res) => {
  const { lat, lng } = req.body;
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

// Browser polls this every 5 seconds
app.get('/location', (req, res) => res.json(lastLocation));

// Main dashboard page
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🚗 Vehicle Tracker</title>
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
    let map, marker, infoWindow;
    let isFirstLoad = true;

    function initMap() {
      map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: { lat: 11.0753, lng: 7.7227 },
        mapTypeId: 'roadmap'
      });

      marker = new google.maps.Marker({
        map: map,
        title: 'Vehicle',
        icon: {
          url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
        }
      });

      infoWindow = new google.maps.InfoWindow();
      fetchLocation();
      setInterval(fetchLocation, 5000);
    }

    function fetchLocation() {
      fetch('/location')
        .then(r => r.json())
        .then(data => {
          const pos = {
            lat: parseFloat(data.lat),
            lng: parseFloat(data.lng)
          };
          marker.setPosition(pos);
          if (isFirstLoad) {
            map.setCenter(pos);
            isFirstLoad = false;
          }
          document.getElementById('coords').innerHTML =
            '📍 ' + data.lat + ', ' + data.lng;
          document.getElementById('timestamp').innerHTML =
            '🕐 ' + data.time;
        })
        .catch(() => {
          document.getElementById('status').style.background = '#ffebee';
          document.getElementById('status').style.color = '#c62828';
          document.getElementById('status').innerHTML = '● OFFLINE';
        });
    }
  </script>
  <script async
    src="https://maps.googleapis.com/maps/api/js?key=MAPS_API_KEY&callback=initMap">
  </script>
</body>
</html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Tracker running on port ' + PORT));
