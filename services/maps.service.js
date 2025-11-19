const axios = require('axios');
module.exports.getAddressCoordinates = async (address) => {
    const apiKey = process.env.GOOGLE_MAPS_APIS;
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
    // const url2= `https://maps.gomaps.pro/maps/api/place/details/json?place_id=&key=${apiKey}`
    try {
        const response = await axios.get(url);
        console.log("Google Maps API response:", response.data);

        if (response.data.status === 'OK') {
            const location = response.data.results[0].geometry.location;
            return {
                lat: location.lat,
                lng: location.lng
            };
        } else {
            throw new Error('Unable to find address coordinates');
        }
    } catch (error) {
        console.error('Error fetching address coordinates:', error);
        throw error;
    }
}

module.exports.getDistanceTime = async (origin, destination) => {
    if (!origin || !destination) {
        throw new Error('Origin and destination are required');
    }
    const apiKey = process.env.GOOGLE_MAPS_APIS;
    const url = 'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix';
    
    // Parse origin and destination - they can be addresses or lat,lng coordinates
    const parseLocation = (location) => {
        // Check if it's coordinates (lat,lng format)
        if (/^-?\d+\.?\d*,-?\d+\.?\d*$/.test(location.trim())) {
            const [lat, lng] = location.split(',').map(Number);
            return { waypoint: { location: { latLng: { latitude: lat, longitude: lng } } } };
        }
        // Otherwise treat as address
        return { waypoint: { address: location } };
    };
    
    try {
        const requestBody = {
            origins: [parseLocation(origin)],
            destinations: [parseLocation(destination)],
            travelMode: 'DRIVE',
            routingPreference: 'TRAFFIC_AWARE'
        };
        
        const response = await axios.post(url, requestBody, {
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': 'originIndex,destinationIndex,duration,distanceMeters,status'
            }
        });
        
        console.log("Google Maps API response:", response.data);

        // The API returns an array directly, not an object with elements
        let elements = [];
        if (Array.isArray(response.data)) {
            elements = response.data;
        } else if (response.data && Array.isArray(response.data.elements)) {
            elements = response.data.elements;
        } else if (response.data && response.data.elements) {
            elements = [response.data.elements];
        }

        if (elements && elements.length > 0) {
            const element = elements[0];
            
            // Check if we have distance and duration data
            if (element.distanceMeters !== undefined && element.duration !== undefined) {
                // Parse duration - it might be a string like "1234s" or an object
                let durationSeconds;
                let durationString;
                
                if (typeof element.duration === 'string') {
                    durationSeconds = parseInt(element.duration.replace('s', ''));
                    durationString = element.duration;
                } else if (element.duration && element.duration.seconds !== undefined) {
                    durationSeconds = parseInt(element.duration.seconds);
                    durationString = `${durationSeconds}s`;
                } else {
                    durationSeconds = parseInt(element.duration) || 0;
                    durationString = `${durationSeconds}s`;
                }
                
                return {
                    distance: {
                        value: element.distanceMeters, // in meters
                        text: `${(element.distanceMeters / 1000).toFixed(2)} km`
                    },
                    duration: {
                        value: durationSeconds,
                        text: formatDuration(durationString)
                    }
                };
            } else {
                throw new Error('Could not fetch distance or duration from API response');
            }
        } else {
            throw new Error('Unable to fetch distance and time - no elements in response');
        }
    } catch (error) {
        if (error.response?.data?.error) {
            const apiError = error.response.data.error;
            console.error('Error fetching distance and time:', apiError);
            
            if (apiError.status === 'PERMISSION_DENIED') {
                const errorMsg = apiError.message || 'Routes API is not enabled. Please enable it in Google Cloud Console.';
                throw new Error(errorMsg);
            } else if (apiError.status === 'INVALID_ARGUMENT') {
                throw new Error(apiError.message || 'Invalid request parameters');
            } else {
                throw new Error(apiError.message || 'Unable to fetch distance and time');
            }
        }
        console.error('Error fetching distance and time:', error.message);
        throw error;
    }
}

// Helper function to format duration (e.g., "1234s" -> "20 mins")
function formatDuration(durationString) {
    const seconds = parseInt(durationString.replace('s', ''));
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
        return `${hours} hour${hours > 1 ? 's' : ''} ${minutes % 60} min${minutes % 60 !== 1 ? 's' : ''}`;
    } else if (minutes > 0) {
        return `${minutes} min${minutes !== 1 ? 's' : ''}`;
    } else {
        return `${seconds} sec${seconds !== 1 ? 's' : ''}`;
    }
}

module.exports.getAutoCompleteSuggestions = async (input) => {
    if (!input) {
        throw new Error('query is required for autocomplete suggestions');
    }
    const apiKey = process.env.GOOGLE_MAPS_APIS;
    const url = 'https://places.googleapis.com/v1/places:autocomplete';
    
    try {
        const requestBody = {
            input: input
        };
        
        // Optional: Add locationBias if you want to bias results to a specific area
        // The new API uses circle or rectangle format, not region
        // Example with circle (uncomment and adjust coordinates as needed):
        // requestBody.locationBias = {
        //     circle: {
        //         center: { latitude: 37.7749, longitude: -122.4194 }, // Example: San Francisco
        //         radius: 50000.0 // radius in meters
        //     }
        // };
        
        const response = await axios.post(
            url,
            requestBody,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': apiKey,
                    'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat'
                }
            }
        );
        console.log("Google Maps API response:", response.data);

        if (response.data && response.data.suggestions) {
            // Transform the new API response format to match the old format
            return response.data.suggestions
                .filter(suggestion => suggestion.placePrediction) // Filter out non-place predictions
                .map(suggestion => {
                    const prediction = suggestion.placePrediction;
                    const text = prediction.text?.text || '';
                    const structuredFormat = prediction.structuredFormat;
                    
                    return {
                        place_id: prediction.placeId || '',
                        description: text,
                        structured_formatting: {
                            main_text: structuredFormat?.mainText?.text || text,
                            secondary_text: structuredFormat?.secondaryText?.text || ''
                        }
                    };
                });
        } else {
            throw new Error('Unable to fetch autocomplete suggestions');
        }
    } catch (error) {
        if (error.response?.data?.error) {
            const apiError = error.response.data.error;
            console.error('Error fetching autocomplete suggestions:', apiError);
            
            // Provide helpful error message for common issues
            if (apiError.status === 'PERMISSION_DENIED') {
                const errorMsg = apiError.message || 'Places API (New) is not enabled. Please enable it in Google Cloud Console.';
                throw new Error(errorMsg);
            } else if (apiError.status === 'INVALID_ARGUMENT') {
                throw new Error(apiError.message || 'Invalid request parameters');
            } else {
                throw new Error(apiError.message || 'Unable to fetch autocomplete suggestions');
            }
        }
        console.error('Error fetching autocomplete suggestions:', error.message);
        throw error;
    }
}

module.exports.getRoute = async (pickup, destination) => {
  if (!pickup || !destination) {
    throw new Error("Pickup and destination are required");
  }

  const [pickupLat, pickupLng] = pickup.split(",").map(Number);
  const [destLat, destLng] = destination.split(",").map(Number);

  if (
    isNaN(pickupLat) || isNaN(pickupLng) ||
    isNaN(destLat) || isNaN(destLng)
  ) {
    throw new Error("Invalid coordinates format");
  }

  const url = `https://router.project-osrm.org/route/v1/driving/${pickupLng},${pickupLat};${destLng},${destLat}?overview=full&geometries=geojson`;

  const response = await axios.get(url);

  const coordinates = response?.data?.routes?.[0]?.geometry?.coordinates;

  if (!coordinates) {
    throw new Error("Invalid route data from OSRM");
  }

  return coordinates.map(([lng, lat]) => ({ lat, lng }));
};

module.exports.getPlaceDetails = async (placeId) => {
    if (!placeId) {
        throw new Error('place_id is required');
    }
    const apiKey = process.env.GOOGLE_MAPS_APIS;
    const url = `https://places.googleapis.com/v1/places/${placeId}`;
    
    try {
        const response = await axios.get(url, {
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': 'location'
            }
        });
        
        console.log('Google Places API Response:', response.data);
        
        if (response.data && response.data.location) {
            return {
                location: {
                    lat: response.data.location.latitude,
                    lng: response.data.location.longitude
                }
            };
        } else {
            throw new Error('Unable to fetch place details');
        }
    } catch (error) {
        if (error.response?.data?.error) {
            const apiError = error.response.data.error;
            console.error('Error fetching place details:', apiError);
            
            if (apiError.status === 'PERMISSION_DENIED') {
                const errorMsg = apiError.message || 'Places API (New) is not enabled. Please enable it in Google Cloud Console.';
                throw new Error(errorMsg);
            } else if (apiError.status === 'NOT_FOUND') {
                throw new Error('Place not found');
            } else {
                throw new Error(apiError.message || 'Unable to fetch place details');
            }
        }
        console.error('Error fetching place details:', error.message);
        throw error;
    }
};
