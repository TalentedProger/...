import DevModeButton from './dev-mode-button';

interface RejectedScreenProps {
  onDevAuth?: () => void;
}

export default function RejectedScreen({ onDevAuth }: RejectedScreenProps) {
  return (
    <div className="fixed inset-0 bg-background z-40">
      <div className="h-full flex flex-col items-center justify-center px-6 text-center">
        <div className="w-32 h-32 bg-destructive/10 rounded-full flex items-center justify-center mb-8">
          <div className="text-6xl">❌</div>
        </div>
        
        <h1 className="text-2xl font-bold text-destructive mb-4">
          Доступ запрещён
        </h1>
        
        <p className="text-muted-foreground text-lg mb-6 leading-relaxed max-w-sm">
          К сожалению, ваша заявка была отклонена модератором.
        </p>
        
        <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 mb-8 max-w-sm">
          <p className="text-sm text-muted-foreground">
            Если вы считаете, что произошла ошибка, обратитесь к администратору бота
          </p>
        </div>
        
        <button 
          className="bg-secondary hover:bg-secondary/80 text-secondary-foreground px-6 py-3 rounded-lg font-medium transition-colors"
          data-testid="button-contact-support"
        >
          Связаться с поддержкой
        </button>
      </div>
      
      {/* Dev Mode Button */}
      {onDevAuth && <DevModeButton onDevAuth={onDevAuth} />}
    </div>
  );
}
