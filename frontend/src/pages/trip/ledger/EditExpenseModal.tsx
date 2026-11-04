import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Modal, Text, displayAlert } from '../../../components/common';
import { patchToApi, getApiErrorMessage } from '../../../utils/api';
import { expensesQueryKey, balancesQueryKey } from './LedgerView';

export default function EditExpenseModal({ expense, tripId, travelers, open, onClose }: any) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State for form fields
  const [description, setDescription] = useState(expense?.description || '');
  const [amount, setAmount] = useState(expense?.amount?.toString() || '');
  const [paidBy, setPaidBy] = useState(expense?.paidBy || '');
  const [splitAmong, setSplitAmong] = useState<string[]>(expense?.splitAmong || []);

  // Update local state if the selected expense changes
  useEffect(() => {
    if (expense) {
      setDescription(expense.description);
      setAmount(expense.amount.toString());
      setPaidBy(typeof expense.paidBy === 'object' ? (expense.paidBy._id || expense.paidBy.id) : expense.paidBy);
      setSplitAmong(expense.splitAmong.map((s: any) => typeof s === 'object' ? (s._id || s.id) : s));
    }
  }, [expense]);

  // Safely extracts the ID whether it is a flat user object or a nested trip traveler object
  const getTravelerId = (t: any) => t?.user?._id || t?.user?.id || t?._id || t?.id;

  const handleToggleSplit = (travelerId: string) => {
    setSplitAmong(prev => prev.includes(travelerId) ? prev.filter(id => id !== travelerId) : [...prev, travelerId]);
  };

  const handleSelectAll = () => {
    setSplitAmong(splitAmong.length === travelers.length ? [] : travelers.map(getTravelerId).filter(Boolean));
  };

  const handleSubmit = async () => {
    if (!description.trim() || !amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      displayAlert({ message: 'Please enter a valid description and positive amount.', tone: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      await patchToApi(`/api/ledger/expenses/${expense._id}`, {
        description,
        amount: parseFloat(amount),
        paidBy,
        splitAmong
      });

      await queryClient.invalidateQueries({ queryKey: expensesQueryKey(tripId) });
      await queryClient.invalidateQueries({ queryKey: balancesQueryKey(tripId) });
      if (expense.eventId) await queryClient.invalidateQueries({ queryKey: ['events'] });
      
      onClose();
    } catch (error) {
      displayAlert({ message: getApiErrorMessage(error, 'Could not update the expense.'), tone: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Edit Expense"
      onClose={onClose}
      dismissDisabled={isSubmitting}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6 md:flex-row md:items-stretch min-w-[300px] md:min-w-[500px]">
        {/* Left Column */}
        <div className="flex flex-1 flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-on-surface">Description</label>
            <input
              type="text"
              className="rounded border border-gray-600 bg-surface p-2 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-on-surface">Amount ($)</label>
            <input
              type="number"
              step="0.01" min="0.01"
              className="rounded border border-gray-600 bg-surface p-2 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-on-surface">Paid By</label>
            <select
              className="rounded border border-gray-600 bg-surface p-2 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              disabled={isSubmitting}
            >
              {travelers.map((traveler: any) => {
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

        {/* Right Column */}
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex items-center justify-between">
            <Text className="text-sm font-medium">Split Among:</Text>
            <button type="button" onClick={handleSelectAll} className="text-xs text-primary hover:underline">
              {splitAmong.length === travelers.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div className="flex h-full flex-col gap-2 overflow-y-auto rounded border border-gray-600 bg-surface-container-low p-3">
            <div className="grid grid-cols-1 gap-3">
              {travelers.map((traveler: any) => {
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
                <Text color="muted" className="text-xs italic">Defaults to payer if empty.</Text>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}