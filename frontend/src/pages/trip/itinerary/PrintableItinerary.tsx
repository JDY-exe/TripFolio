import { forwardRef } from 'react';

export interface PrintableEvent {
  _id?: string;
  title: string;
  startTime: string;
  description?: string;
  address?: string;
  cost?: number;
  notes?: string;
}

export interface ExportedTripData {
  tripName: string;
  startDate: string;
  endDate: string;
  events: PrintableEvent[];
}

interface PrintableItineraryProps {
  tripData: ExportedTripData | null;
}

export const PrintableItinerary = forwardRef<HTMLDivElement, PrintableItineraryProps>(
  ({ tripData }, ref) => {
    if (!tripData) return null;

    // 1. Group events by Date to create section headers
    const eventsByDay = new Map<string, PrintableEvent[]>();
    if (tripData.events) {
      tripData.events.forEach(event => {
        // Slice the date string directly (YYYY-MM-DD) to group accurately
        const dateStr = event.startTime.slice(0, 10);
        const current = eventsByDay.get(dateStr) || [];
        current.push(event);
        eventsByDay.set(dateStr, current);
      });
    }

    // 2. Formatters forced to UTC to prevent DST and timezone shifts
    const formatTime = (isoString: string) => {
      return new Date(isoString).toLocaleTimeString([], {
        timeZone: 'UTC',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const formatDate = (isoString: string) => {
      return new Date(isoString).toLocaleDateString([], {
         timeZone: 'UTC',
         weekday: 'long',
         month: 'long',
         day: 'numeric',
         year: 'numeric'
      });
    };

    return (
      <div ref={ref} className="p-10 text-black bg-white" style={{ printColorAdjust: 'exact' }}>
        {/* Document Header */}
        <div className="mb-8 border-b-4 border-primary pb-4">
          <h1 className="mb-2 text-4xl font-extrabold text-gray-900">{tripData.tripName}</h1>
          <p className="text-lg font-medium text-gray-600">
            {new Date(tripData.startDate).toLocaleDateString([], { timeZone: 'UTC' })} – {new Date(tripData.endDate).toLocaleDateString([], { timeZone: 'UTC' })}
          </p>
        </div>

        {eventsByDay.size === 0 ? (
          <p className="mt-8 italic text-gray-500">No events planned for this trip yet.</p>
        ) : (
          Array.from(eventsByDay.entries()).map(([date, dayEvents]) => (
            <div key={date} className="mb-8 break-inside-avoid">
              {/* Day Header - Acts as a visual divider */}
              <h2 className="mb-4 bg-gray-100 px-4 py-2 text-xl font-bold text-gray-800 rounded">
                {formatDate(dayEvents[0].startTime)}
              </h2>

              {/* Two-Column Grid for Events */}
              <div className="grid grid-cols-2 gap-6">
                {dayEvents.map((event, index) => (
                  <div 
                    key={event._id || index} 
                    className="break-inside-avoid rounded border border-gray-200 p-4 shadow-sm h-full"
                  >
                    <div className="mb-3 flex items-start justify-between border-b border-gray-100 pb-2">
                      <h3 className="text-lg font-semibold text-gray-900 pr-2">{event.title}</h3>
                      <span className="shrink-0 rounded bg-gray-100 px-2 py-1 text-sm font-bold text-gray-700">
                        {formatTime(event.startTime)}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600">
                      {event.address && (
                        <p><span className="font-semibold text-gray-800">Location:</span> {event.address}</p>
                      )}
                      {event.cost !== undefined && event.cost > 0 && (
                        <p><span className="font-semibold text-gray-800">Cost:</span> ${event.cost}</p>
                      )}
                      {event.description && (
                        <p><span className="font-semibold text-gray-800">Details:</span> {event.description}</p>
                      )}
                      {event.notes && (
                        <p><span className="font-semibold text-gray-800">Notes:</span> {event.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    );
  }
);