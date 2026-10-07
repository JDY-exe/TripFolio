import Text from '../Text';

const ErrorDisplay = ({ message }: { message: string }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-full">
      <div className="bg-secondary-container w-48 h-48 rounded-full text-on-surface flex items-center justify-center text-9xl color-on-secondary-container mb-12">
        D:
      </div>
      <Text variant="title">{message}</Text>
    </div>
  );
};

export default ErrorDisplay;
