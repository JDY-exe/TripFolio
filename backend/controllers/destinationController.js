const getDestinations = async (req, res) => {
  try {
    const { query_term } = req.query;

    // Do not process if search box is empty
    if (!query_term || query_term.trim() === '') {
      return res.status(200).json({ suggestions: [] });
    }
    
    /**
     * MOCK DATA AND SIMULATED NETWORK DELAY FOR TESTING
     */
    
    /*
    const dummyData = {
      suggestions: [
        {
          placePrediction: {
            placeId: "ChIJd8BlQ2BZwokRAFUEcm_qrcA",
            text: { text: `${query_term} Bakery & Cafe` }
          }
        },
        {
          placePrediction: {
            placeId: "ChIJIQBpAG2ahYAR_6128GcTUEo",
            text: { text: `${query_term} National Museum` }
          }
        }
      ]
    };

    setTimeout(() => {
      res.status(200).json(dummyData);
    }, 500);
    */

    /**
     * END OF MOCK DATA FOR TESTING
     */

    // Real Google API Logic (Uncomment when ready to test Google Maps Lookup feature)
    
    const url = 'https://places.googleapis.com/v1/places:autocomplete';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': process.env.GOOGLE_API_KEY,
        'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text',
      },
      body: JSON.stringify({ input: query_term }),
    });

    if (!response.ok) {
      throw new Error(`Google API responded with status: ${response.status}`);
    }

    const data = await response.json();
    res.status(200).json(data);
  
  } catch (error) {
    console.error('Destination Lookup Error:', error.message);
    res.status(500).json({ message: 'Error fetching destinations', error: error.message })
  }
};

module.exports = { getDestinations };