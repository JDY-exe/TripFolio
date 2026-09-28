const Itinerary = require ('../models/itinerary');

const createItinerary = async (req, res) => {
  try {
    const { tripId, title, description, startDate, endDate} = req.body;

    const newItinerary = new Itinerary({
      tripId,
      title,
      description,
      startDate,
      endDate
    });

    await newItinerary.save();
    res.status(201).json(newItinerary);
  } catch (error) {
    res.status(500).json({ message: 'Error creating itinerary', error: error.message });
  }
};

const getItinerary = async (req, res) => {
  try {
    const tripId = req.query.id;

    if (!tripId) {
      return res.status(400).json({ message: 'Missing ID parameter in query string' });
    }

    const itinerary = await Itinerary.findOne({ tripId: tripId });

    if (!itinerary) {
      return res.status(404).json({ message: 'Itinerary not found for this trip' });
    }

    res.status(200).json(itinerary);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching itinerary', error: error.message });
  }
}

const updateItinerary = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;
    
    const updatedItinerary = await Itinerary.findByIdAndUpdate(
      id,
      { title, description },
      { returnDocument: 'after' }
    );

    if (!updatedItinerary) {
      return res.status(404).json({ message: 'Itinerary not found' });
    }
    res.status(200).json(updatedItinerary);
  } catch (error) {
    res.status(500).json({ message: 'Error updating itinerary', error: error.message });
  }
};

module.exports = { createItinerary, getItinerary, updateItinerary };