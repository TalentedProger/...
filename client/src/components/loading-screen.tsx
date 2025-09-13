interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message = "Проверяем ваш статус" }: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-6"></div>
        <h2 className="text-xl font-semibold text-foreground mb-2">Подключение...</h2>
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
