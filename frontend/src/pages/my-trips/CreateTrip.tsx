import { useState } from 'react';
import { useNavigate } from 'react-router';
import { postToApi } from '../../utils/api';
import { Button, Text } from '../../components/common';

function CreateTrip() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Missing Field Validation
    if (!name || !startDate || !endDate) {
      setError('Please fill out all required fields.');
      return;
    }

    // Chronological Date Validation
    if (new Date(endDate) < new Date(startDate)) {
      setError('Ending date must come after starting date.');
      return;
    }

    try {
      await postToApi('/trip', { name, startDate, endDate });
      navigate ('/my-trips');
    } catch (error) {
      setError('Failed to create trip. Please try again.')
    }
  };

  return (
    <section className="text-on-surface max-w-lg mx-auto mt-10">
      <Text as="h1" variant="headline" className="mb-6">Create a New Trip</Text>
      
      {error && <div className="text-red-500 mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block mb-1">Trip Name *</label>
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            className="w-full p-2 rounded bg-surface-container text-on-surface"
          />
        </div>
        <div>
          <label className="block mb-1">Start Date *</label>
          <input 
            type="date" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)} 
            className="w-full p-2 rounded bg-surface-container text-on-surface"
          />
        </div>
        <div>
          <label className="block mb-1">End Date *</label>
          <input 
            type="date" 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)} 
            className="w-full p-2 rounded bg-surface-container text-on-surface"
          />
        </div>
        <Button type="submit" className="mt-4">Create Trip</Button>
      </form>
    </section>
  );
}

export default CreateTrip;