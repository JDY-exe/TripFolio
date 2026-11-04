import { Text } from '../../../components/common';

export default function SummaryTable({ balances, travelers, currentUserId, loading }: any) {
  const getTravelerName = (userId: string) => {
    if (!userId) return 'Unknown';
    // Check both id and _id to match the user
    const matchedUser = travelers.find((t: any) => t.id === userId || t._id === userId);
    // Fallback through username, name, then email
    return matchedUser?.username || matchedUser?.name || matchedUser?.email || 'Unknown';
  };

  if (loading) return <div className="rounded-panel bg-surface-container p-6">Loading balances...</div>;

  const myDebts = balances.filter((b: any) => b.owerId === currentUserId || b.oweeId === currentUserId);
  const isSettled = myDebts.length === 0;

  return (
    <div className="flex flex-col gap-4 rounded-panel bg-surface-container p-6 text-on-surface">
      <Text as="h3" variant="title">Balances</Text>
      
      {isSettled ? (
        <Text color="muted">All balances settled! Balance: $0</Text>
      ) : (
        <ul className="flex flex-col gap-3">
          {balances.map((balance: any, i: number) => (
            <li key={i} className="flex justify-between rounded bg-surface-container-low p-3">
              <Text>
                <span className="font-semibold">{getTravelerName(balance.owerId)}</span> owes <span className="font-semibold">{getTravelerName(balance.oweeId)}</span>
              </Text>
              <Text className="font-mono text-danger">${balance.amount.toFixed(2)}</Text>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}