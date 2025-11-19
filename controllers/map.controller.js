const mapService = require("../services/maps.service");
const { validationResult } = require("express-validator");


module.exports.getCoordinates = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { address } = req.query;

  if (!address) {
    return res
      .status(400)
      .json({ error: "Address query parameter is required" });
  }

  try {
    const coordinates = await mapService.getAddressCoordinates(address);
    return res.status(200).json(coordinates);
  } catch (error) {
    console.error(
      "Error fetching coordinates:",
      error.response?.data || error.message
    );
    return res.status(404).json({ error: "Coordinates not found" });
  }
};

module.exports.getDistanceTime = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { origin, destination } = req.query;

    if (!origin || !destination) {
      return res
        .status(400)
        .json({
          error: "Origin and destination query parameters are required",
        });
    }

    const distanceTime = await mapService.getDistanceTime(
      origin,
      destination
    );
    return res.status(200).json(distanceTime);
  } catch (error) {
    console.error(
      "Error fetching distance and time:",
      error.response?.data || error.message
    );
    
    // Return appropriate status code based on error type
    if (error.message && (error.message.includes('not enabled') || error.message.includes('PERMISSION_DENIED'))) {
      return res.status(403).json({ 
        error: error.message || "Routes API is not enabled. Please enable it in Google Cloud Console." 
      });
    } else if (error.message && error.message.includes('Invalid')) {
      return res.status(400).json({ error: error.message });
    }
    
    return res.status(500).json({ 
      error: error.message || "Unable to fetch distance and time" 
    });
  }
};

module.exports.getAutoCompleteSuggestions = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { input } = req.query;

        if (!input) {
            return res
                .status(400)
                .json({ error: "Input query parameter is required" });
        }

        const suggestions = await mapService.getAutoCompleteSuggestions(input);
        return res.status(200).json(suggestions);


    } catch (error) {
        console.error(
            "Error fetching autocomplete suggestions:",
            error.response?.data || error.message
        );
        
        // Return appropriate status code based on error type
        if (error.message && (error.message.includes('not enabled') || error.message.includes('PERMISSION_DENIED'))) {
            return res.status(403).json({ 
                error: error.message || "Places API (New) is not enabled. Please enable it in Google Cloud Console." 
            });
        }
        
        return res.status(500).json({ 
            error: error.message || "Unable to fetch autocomplete suggestions" 
        });
    }
}

module.exports.getRoute = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { pickup, destination } = req.query;

    const route = await mapService.getRoute(pickup, destination);
    return res.status(200).json(route);
  } catch (error) {
    console.error("Error fetching route:", error);
    return res.status(500).json({ error: "Route not found" });
  }
};
module.exports.getPlaceDetails = async (req, res) => {
  const { place_id } = req.query;

  if (!place_id) {
    return res.status(400).json({ message: 'place_id is required' });
  }

  try {
    const placeDetails = await mapService.getPlaceDetails(place_id);
    return res.json(placeDetails);
  } catch (error) {
    console.error('Error fetching Google Place Details:', error.message);
    
    // Return appropriate status code based on error type
    if (error.message && (error.message.includes('not enabled') || error.message.includes('PERMISSION_DENIED'))) {
      return res.status(403).json({ 
        message: error.message || 'Places API (New) is not enabled. Please enable it in Google Cloud Console.' 
      });
    } else if (error.message && error.message.includes('not found')) {
      return res.status(404).json({ message: error.message });
    }
    
    return res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};
