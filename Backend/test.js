const http = require('http');
http.get('http://localhost:5000/api/v1/rooms?limit=48&sort=newest', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Response:', res.statusCode, data));
}).on('error', err => console.log('Error:', err.message));

http.get('http://localhost:5000/api/v1/rooms/locations/counts?city=Nainital', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Response:', res.statusCode, data));
}).on('error', err => console.log('Error:', err.message));
