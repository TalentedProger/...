import DevModeButton from './dev-mode-button';

interface PendingScreenProps {
  onRefreshStatus: () => void;
  onDevAuth?: () => void;
}

export default function PendingScreen({ onRefreshStatus, onDevAuth }: PendingScreenProps) {
  return (
    <div className="fixed inset-0 bg-background z-40">
      <div className="h-full flex flex-col items-center justify-center px-6 text-center">
        <div className="w-32 h-32 bg-pending/10 rounded-full flex items-center justify-center mb-8 animate-pulse">
          <div className="text-6xl">⏳</div>
        </div>
        
        <h1 className="text-2xl font-bold text-foreground mb-4">
          Ваш профиль на модерации
        </h1>
        
        <p className="text-muted-foreground text-lg mb-6 leading-relaxed max-w-sm">
          Мы рассмотрим вашу заявку в ближайшее время. Обычно это занимает несколько минут.
        </p>
        
        <div className="bg-pending/5 border border-pending/20 rounded-lg p-4 mb-8 max-w-sm">
          <div className="flex items-center justify-center text-pending mb-2">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
            </svg>
            <span className="font-medium">Статус: На рассмотрении</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Администратор проверит ваш профиль и примет решение о допуске к чату
          </p>
        </div>
        
        <button 
          onClick={onRefreshStatus}
          className="bg-secondary hover:bg-secondary/80 text-secondary-foreground px-6 py-3 rounded-lg font-medium transition-colors"
          data-testid="button-refresh-status"
        >
          Обновить статус
        </button>
      </div>
      
      {/* Dev Mode Button */}
      {onDevAuth && <DevModeButton onDevAuth={onDevAuth} />}
    </div>
  );
}
