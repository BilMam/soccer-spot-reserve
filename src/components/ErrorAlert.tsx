
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorAlertProps {
  title?: string;
  message: string;
  onDismiss?: () => void;
}

const ErrorAlert: React.FC<ErrorAlertProps> = ({ 
  title = "Erreur", 
  message, 
  onDismiss 
}) => {
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle className="flex items-center justify-between">
        {title}
        {onDismiss && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onDismiss}
            className="h-auto p-0 text-red-600 hover:text-red-800"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
};

export default ErrorAlert;
