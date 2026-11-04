import { Text, Button } from '../../../components/common';

export default function ExpenseList({ expenses, travelers, loading, readOnly, onDelete }: any) {
  const getTravelerName = (paidByData: any) => {
    if (!paidByData) return 'Unknown';
    
    // If the backend populated the user object directly
    if (paidByData.username || paidByData.name) {
      return paidByData.username || paidByData.name;
    }
    
    // Extract ID whether it is an object or a flat string
    const searchId = typeof paidByData === 'object' ? (paidByData.id || paidByData._id) : paidByData;
    
    // Find the traveler in the trips array
    const matchedUser = travelers.find((t: any) => t.id === searchId || t._id === searchId);
    
    return matchedUser?.username || matchedUser?.name || matchedUser?.email || 'Unknown';
  };

  const getSplitNames = (splitAmongArray: any[]) => {
    if (!splitAmongArray || splitAmongArray.length === 0) return 'Not split';
    
    // Use the existing getTravelerName function to resolve each ID
    return splitAmongArray
      .map(user => getTravelerName(user))
      .join(', ');
  };

  if (loading) return <Text color="muted">Loading expenses...</Text>;
  if (expenses.length === 0) return <Text color="muted">No expenses logged yet.</Text>;

  return (
    <div className="flex flex-col gap-4">
      {expenses.map((exp: any) => (
        <div key={exp._id} className="flex items-center justify-between rounded-panel bg-surface-container-low p-4 text-on-surface transition-colors hover:bg-surface-container">
          <div className="flex flex-col">
            <Text variant="title" as="h4">{exp.description}</Text>
            <Text color="muted" className="text-sm">Paid by {getTravelerName(exp.paidBy)}</Text>
            {/* Show who is responsible for paying */}
            <Text color="muted" className="text-xs mt-1 italic">
              Split among: {getSplitNames(exp.splitAmong)}
            </Text>
          </div>
          <div className="flex items-center gap-4">
            <Text className="font-mono text-lg">${exp.amount.toFixed(2)}</Text>
            {!readOnly && (
              <Button size="sm" variant="danger" onClick={() => onDelete(exp)}>
                Delete
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}