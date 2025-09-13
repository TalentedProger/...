// Check if dev mode is enabled via environment variable
const isDevModeEnabled = () => {
  return import.meta.env.VITE_DEV_MODE === 'true' || import.meta.env.DEV;
};

interface DevModeButtonProps {
  onDevAuth: () => void;
  className?: string;
}

export default function DevModeButton({ onDevAuth, className = "" }: DevModeButtonProps) {
  // Only show if dev mode is enabled and not in Telegram WebApp
  if (!isDevModeEnabled() || window.Telegram?.WebApp) {
    return null;
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      <div className="bg-background/90 backdrop-blur-sm border rounded-lg p-3 shadow-lg">
        <p className="text-xs text-muted-foreground mb-2">Dev Mode</p>
        <button 
          onClick={onDevAuth}
          data-testid="button-dev-auth"
          className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm"
        >
          🧑‍💻 Test as Approved User
        </button>
      </div>
    </div>
  );
}