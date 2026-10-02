const Event = require('../models/event');

const createEvent = async (req, res) => {
  try {
    const { itineraryID, title, address, startTime, endTime, notes } = req.body;

    const newEvent = new Event ({
      itineraryID,
      title: title || 'New Event',
      address,
      startTime,
      endTime,
      notes: notes || ''
    });

    await newEvent.save()
    res.status(201).json(newEvent);
  } catch (error) {
    res.status(500).json({ message: 'Error creating event', error: error.message });
  }
};

const getEvents = async (req, res) => {
  try {
    const { itinerary_id } = req.query;

    if (!itinerary_id) {
      return res.status(400).json({ message: 'Missing itineraryID parameter' });
    }

    const events = await Event.find({ itineraryID: itinerary_id }).sort({ startTime: 1 });
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ message: 'Error getting events', error: error.message });
  }
};

const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedEvent = await Event.findByIdAndUpdate(
      id,
      { $set: req.body },
      { returnDocument: 'after', runValidators: true }
    );

    if (!updateEvent) {
      return res.status(400).json({ message: 'Event not found' });
    }
    res.status(200).json(updateEvent);
  } catch (error) {
    res.status(500).json({ message: 'Error updating event', error: error.message });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedEvent = await Event.findByIdAndDelete(id);

    if (!deletedEvent) {
      return res.status(400).json({ message: 'Event not found' });
    }
    res.status(200).json({ message: 'Event deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting event', error: error.message });
  }
};

module.exports = { createEvent, getEvents, updateEvent, deleteEvent };