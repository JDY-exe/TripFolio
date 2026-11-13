const Trip = require('../models/trip');
const fs = require('fs');
const path = require('path');

exports.addEssential = async (req, res) => {
  try {
    const { tripId } = req.params;
    const { title, value } = req.body;
    const file = req.file;

    const trip = await Trip.findById(tripId);
    if (!trip) return res.status(404).json({ message: 'Trip not found' });

    // Construct the essential object based on whether a file was uploaded
    const newEssential = {
      title,
      value: value || '',
      fileUrl: file ? `/uploads/essentials/${file.filename}` : null,
      fileName: file ? file.originalname : null,
      mimetype: file ? file.mimetype : null
    };

    trip.essentials.push(newEssential);
    await trip.save();

    res.status(201).json(trip.essentials);
  } catch (error) {
    console.error("Error adding essential:", error);
    res.status(500).json({ message: 'Failed to add essential' });
  }
};

exports.deleteEssential = async (req, res) => {
  try {
    const { tripId, essentialId } = req.params;
    
    const trip = await Trip.findById(tripId);
    if (!trip) return res.status(404).json({ message: 'Trip not found' });

    // Find the essential to get the file path before removing it from the DB
    const essential = trip.essentials.id(essentialId);
    if (!essential) return res.status(404).json({ message: 'Essential not found' });

    // If it has a file, delete it from the server to prevent storage leaks (AC 4)
    if (essential.fileUrl) {
      // Adjust the path resolution based on where your uploads folder lives
      const filePath = path.join(__dirname, '..', essential.fileUrl); 
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Remove from database
    trip.essentials.pull(essentialId);
    await trip.save();

    res.status(200).json({ message: 'Essential deleted', essentials: trip.essentials });
  } catch (error) {
    console.error("Error deleting essential:", error);
    res.status(500).json({ message: 'Failed to delete essential' });
  }
};

exports.downloadEssential = async (req, res) => {
  try {
    const { tripId, essentialId } = req.params;
    
    const trip = await Trip.findById(tripId);
    if (!trip) return res.status(404).json({ message: 'Trip not found' });

    const essential = trip.essentials.id(essentialId);
    if (!essential || !essential.fileUrl) {
      return res.status(404).json({ message: 'File not found' });
    }

    const filePath = path.join(__dirname, '..', essential.fileUrl);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File no longer exists on server' });
    }

    // Determine the original extension (e.g., .pdf)
    const ext = path.extname(essential.fileName || '');
    // Create a safe, clean filename based on the user's title
    const safeTitle = essential.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const downloadName = `${safeTitle}${ext}`;

    // Send the file securely with the requested custom name
    res.download(filePath, downloadName);
  } catch (error) {
    console.error("Error downloading essential:", error);
    res.status(500).json({ message: 'Failed to download file' });
  }
};