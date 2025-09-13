interface LoadingScreenProps {
  message?: string;
  onDevAuth?: () => void;
}

// Check if dev mode is enabled via environment variable
const isDevModeEnabled = () => {
  return import.meta.env.VITE_DEV_MODE === 'true' || import.meta.env.DEV;
};

export default function LoadingScreen({ message = "Проверяем ваш статус", onDevAuth }: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-6"></div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Подключение...</h2>
        <p className="text-muted-foreground">{message}</p>
        
        {/* Dev mode button for browser testing - only show if dev mode is enabled */}
        {onDevAuth && isDevModeEnabled() && !window.Telegram?.WebApp && (
          <div className="mt-6">
            <p className="text-sm text-muted-foreground mb-2">Режим разработчика:</p>
            <button 
              onClick={onDevAuth}
              data-testid="button-dev-auth"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              🧑‍💻 Тест как одобренный пользователь
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
