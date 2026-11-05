import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Text, displayAlert } from '../../../components/common';
import { useAuth } from '../../../contexts/AuthContext';
import { getApiErrorMessage } from '../../../utils/api';
import { expensesQueryKey, balancesQueryKey } from './LedgerView'; // Import the query keys you defined

export default function AddExpenseForm({ tripId, travelers }: { tripId: string, travelers: any[] }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [splitAmong, setSplitAmong] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paidBy, setPaidBy] = useState<string>(user?.id ?? '');

  // Safely extracts the ID whether it is a flat user object or a nested trip traveler object
  const getTravelerId = (t: any) => t?.user?._id || t?.user?.id || t?._id || t?.id;

  // Toggle a user's ID in the splitAmong array
  const handleToggleSplit = (travelerId: string) => {
    setSplitAmong(prev => 
      prev.includes(travelerId) 
        ? prev.filter(id => id !== travelerId) 
        : [...prev, travelerId]
    );
  };

  // Select all travelers for an even split
  const handleSelectAll = () => {
    if (splitAmong.length === travelers.length) {
      setSplitAmong([]);
    } else {
      // Map to valid IDs only, filtering out any undefines
      setSplitAmong(travelers.map(getTravelerId).filter(Boolean));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      displayAlert({ message: 'Please enter a valid description and positive amount.', tone: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      // If splitAmong is empty, the backend will default to the payer (user?.id)
      const payload = {
        tripId,
        description,
        amount: parseFloat(amount),
        paidBy: paidBy || user?.id,
        splitAmong
      };

      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/ledger/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to create expense');

      // User Story 2.3 AC5: Invalidate queries to instantly update UI and summary table
      await queryClient.invalidateQueries({ queryKey: expensesQueryKey(tripId) });
      await queryClient.invalidateQueries({ queryKey: balancesQueryKey(tripId) });

      // Reset form
      setDescription('');
      setAmount('');
      setSplitAmong([]);
      
    } catch (error) {
      displayAlert({ message: getApiErrorMessage(error, 'Could not add the expense.'), tone: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 rounded-panel bg-surface-container p-6">
      <Text as="h3" variant="title">Add a New Expense</Text>
      
      {/* Strict 2-Column Grid */}
      <div className="flex flex-col gap-6 md:flex-row md:items-stretch">
        
        {/* LEFT COLUMN: Description, Amount, Paid By */}
        <div className="flex flex-1 flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="expense-desc" className="text-sm font-medium text-on-surface">Description</label>
            <input
              id="expense-desc"
              type="text"
              className="rounded border border-gray-600 bg-surface p-2 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g. Dinner at Luigi's"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          
          <div className="flex flex-col gap-1">
            <label htmlFor="expense-amount" className="text-sm font-medium text-on-surface">Amount ($)</label>
            <input
              id="expense-amount"
              type="number"
              step="0.01"
              min="0.01"
              className="rounded border border-gray-600 bg-surface p-2 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="expense-payer" className="text-sm font-medium text-on-surface">Paid By</label>
            <select
              id="expense-payer"
              className="rounded border border-gray-600 bg-surface p-2 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              disabled={isSubmitting}
            >
              {travelers.map((traveler) => {
                const tId = getTravelerId(traveler);
                return (
                  <option key={tId} value={tId}>
                    {traveler.username || traveler.name || traveler.email || traveler.user?.username || 'Unknown User'}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* RIGHT COLUMN: Split Among */}
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex items-center justify-between">
            <Text className="text-sm font-medium">Split Among:</Text>
            <button 
              type="button" 
              onClick={handleSelectAll} 
              className="text-xs text-primary hover:underline transition-colors"
            >
              {splitAmong.length === travelers.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          
          {/* This container stretches to fill the height alongside the left column */}
          <div className="flex h-full flex-col gap-2 overflow-y-auto rounded border border-gray-600 bg-surface-container-low p-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {travelers.map(traveler => {
                const tId = getTravelerId(traveler);
                return (
                  <label key={tId} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={splitAmong.includes(tId)}
                      onChange={() => handleToggleSplit(tId)}
                      disabled={isSubmitting}
                      className="h-4 w-4 rounded border-gray-500 accent-primary"
                    />
                    <span className="text-sm text-on-surface truncate">
                      {traveler.username || traveler.name || traveler.email || traveler.user?.username || 'Unknown User'}
                    </span>
                  </label>
                );
              })}
            </div>
            {splitAmong.length === 0 && (
              <div className="mt-auto pt-2">
                <Text color="muted" className="text-xs italic">
                  If no one is selected, this cost will not be split.
                </Text>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Adding...' : 'Add Expense'}
        </Button>
      </div>
    </form>
  );
}