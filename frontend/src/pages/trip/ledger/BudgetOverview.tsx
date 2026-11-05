import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Text, Button, displayAlert } from '../../../components/common';
import { getApiErrorMessage } from '../../../utils/api';

export default function BudgetOverview({ tripId, initialBudget, expenses, readOnly }: any) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [budgetInput, setBudgetInput] = useState(initialBudget.toString());
  const [isSaving, setIsSaving] = useState(false);

  const totalSpent = expenses.reduce((sum: number, exp: any) => sum + exp.amount, 0);
  const remainingBudget = initialBudget - totalSpent;

  const handleSave = async () => {
    const num = parseFloat(budgetInput);
    if (num < 0) {
      displayAlert({ message: 'Budget cannot be negative', tone: 'error' });
      return;
    }

    setIsSaving(true);
    try {
      await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/ledger/${tripId}/budget`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budget: num })
      });
      // Invalidate the trips query so the UI updates the initialBudget prop automatically
      await queryClient.invalidateQueries({ queryKey: ['trips'] });
      setIsEditing(false);
    } catch (error) {
      displayAlert({ message: getApiErrorMessage(error, 'Failed to update budget'), tone: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-panel bg-surface-container p-6 text-on-surface">
      <Text as="h3" variant="title">Budget Overview</Text>
      
      {!isEditing ? (
        <>
          <div className="flex justify-between items-center">
            <Text color="muted">Total Budget</Text>
            <Text>${initialBudget.toFixed(2)}</Text>
          </div>
          <div className="flex justify-between items-center">
            <Text color="muted">Remaining</Text>
            <Text className={remainingBudget < 0 ? 'text-danger' : 'text-success'}>
              ${remainingBudget.toFixed(2)}
            </Text>
          </div>
          {!readOnly && (
             <Button size="sm" variant="secondary" onClick={() => setIsEditing(true)}>
               Edit Budget
             </Button>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-2">
          <input 
            type="number"
            className="rounded border border-gray-600 bg-surface p-2 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            value={budgetInput}
            onChange={(e) => setBudgetInput(e.target.value)}
          />
          <div className="flex gap-2">
            <Button size="sm" disabled={isSaving} onClick={handleSave}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setIsEditing(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}