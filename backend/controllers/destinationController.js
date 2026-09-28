const getDestinations = async (req, res) => {
  try {
    const { query_term } = req.query;

    // Do not process if search box is empty
    if (!query_term || query_term.trim() === '') {
      return res.status(200).json({ suggestions: [] });
    }
    
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