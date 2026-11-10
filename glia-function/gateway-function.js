
// functions.js
import axios from 'axios';

// Function 1: Calls endpoint /b with a GET request
export async function getEndpointB(params = {}) {
  try {
    const response = await axios.get('https://api.example.com/b', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching /b:', error.response?.data || error.message);
    throw error;
  }
}

// Function 2: Sends data to endpoint /b with a POST request
export async function postEndpointB(payload = {}) {
  try {
    const response = await axios.post('https://api.example.com/b', payload, {
      headers: { 'Content-Type': 'application/json' },
    });
    return response.data;
  } catch (error) {
    console.error('Error posting to /b:', error.response?.data || error.message);
    throw error;
  }
}