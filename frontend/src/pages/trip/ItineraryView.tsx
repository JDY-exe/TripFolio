import { Plus, Pencil, Check, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { Button, IconButton, Text } from '../../components/common';
import { getFromApi, patchToApi } from '../../utils/api';

interface ItineraryData {
  _id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
}

/**
 * Displays a single sample walking event on a static day timeline.
 * An arched date, scalloped activity marker, and asymmetric card borrow MD3's
 * expressive shapes while using the app's semantic colors and native elements.
 *
 * @returns A presentation-only itinerary with inactive event actions.
 */
function ItineraryView() {
  const { id } = useParams<{ id: string }>();
  const [itinerary, setItinerary] = useState<ItineraryData | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  useEffect(() => {
    if (id) {
      getFromApi<ItineraryData>(`/itinerary?id=${id}`)
        .then((data) => {
          setItinerary(data);
          setEditTitle(data.title);
          setEditDescription(data.description);
        })
        .catch(console.error);
    }
  }, [id]);

  const handleSave = async () => {
    if (!itinerary) return;
    try {
      const updated = await patchToApi<ItineraryData>(`/itinerary/${itinerary._id}`, {
        title: editTitle,
        description: editDescription,
      });
      setItinerary(updated);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update itinerary:', error)
    }
  }

  const handleCancel = () => {
    if (itinerary) {
      setEditTitle(itinerary.title);
      setEditDescription(itinerary.description);
    }
    setIsEditing(false);
  };

  if (!itinerary) {
    return <div className="p-4 text-on-surface">Loading itinerary...</div>;
  }

  const startDate = new Date(itinerary.startDate);
  const month = startDate.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short' });
  const day = startDate.toLocaleDateString('en-US', { timeZone: 'UTC', day: '2-digit' });
  const weekday = startDate.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long' });

  return (
    <section
      aria-labelledby="itinerary-heading"
      className="min-w-0 text-on-surface"
    >
      <header className="mb-6">
        <Text as="h2" id="itinerary-heading" variant="title">
          Itinerary
        </Text>
      </header>

      <div className="mb-7 flex items-start gap-4">
        <div
          aria-hidden="true"
          className="flex h-24 w-20 shrink-0 flex-col items-center justify-center rounded-t-full rounded-b-2xl bg-primary-container text-on-primary-container"
        >
          <span className="text-xs font-medium uppercase tracking-wider">
            {month}
          </span>
          <span className="mt-0.5 text-4xl leading-none tracking-tight">
            {day}
          </span>
        </div>
        <div className="flex-1">
          <h3 className="text-title">
            <time dateTime={itinerary.startDate}>
              {weekday}
            </time>
          </h3>
          
          {isEditing ? (
            <div className="mt-2 flex flex-col gap-3">
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full rounded bg-surface-container p-2 text-sm text-on-surface focus:outline-primary"
                placeholder="Itinerary Title"
              />
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="w-full resize-none rounded bg-surface-container p-2 text-sm text-on-surface focus:outline-primary"
                placeholder="Add a description for this itinerary..."
                rows={3}
              />
              <div className="flex gap-2">
                <Button onClick={handleSave} size="sm" leadingIcon={<Check size={16} />}>Save</Button>
                <Button onClick={handleCancel} variant="ghost" size="sm" leadingIcon={<X size={16} />}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="mt-1">
              {/* Hoverable Title with Pencil */}
              <div className="group flex items-center gap-2">
                <p className="font-medium text-on-surface">{itinerary.title}</p>
                <button 
                  onClick={() => setIsEditing(true)} 
                  className="text-on-surface-variant opacity-0 transition-opacity hover:text-primary group-hover:opacity-100"
                  aria-label="Edit title"
                >
                  <Pencil size={14} />
                </button>
              </div>

              {/* Hoverable Description with Pencil */}
              <div className="group relative mt-4 rounded-panel bg-surface-container-low p-5 pr-10 text-sm text-on-surface-variant">
                {itinerary.description ? (
                  <p>{itinerary.description}</p>
                ) : (
                  <p className="italic opacity-70">No description provided.</p>
                )}
                <button 
                  onClick={() => setIsEditing(true)} 
                  className="absolute right-3 top-3 text-on-surface-variant opacity-0 transition-opacity hover:text-primary group-hover:opacity-100"
                  aria-label="Edit description"
                >
                  <Pencil size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Disabled Add Event Bar */}
      {!isEditing && (
        <button
          disabled
          className="mt-8 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-full border-2 border-dashed border-outline-variant bg-transparent py-4 text-on-surface-variant opacity-50"
        >
          <Plus size={20} />
          <span className="font-medium">Add Event</span>
        </button>
      )}
    </section>
  );
}

export default ItineraryView;
