import { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Clock } from 'lucide-react';

interface SessionTimeoutModalProps {
  open: boolean;
  remainingSeconds: number;
  onExtend: () => void;
}

export default function SessionTimeoutModal({ 
  open, 
  remainingSeconds: initialSeconds,
  onExtend 
}: SessionTimeoutModalProps) {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    setSeconds(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (!open) return;

    const interval = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [open]);

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-600" />
            <AlertDialogTitle>Session Expiring Soon</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-2">
            <p>
              Your session will expire in{' '}
              <span className="font-bold text-orange-600">
                {minutes}:{secs.toString().padStart(2, '0')}
              </span>
              {' '}due to inactivity.
            </p>
            <p className="text-sm">
              Click "Stay Signed In" to extend your session, or you will be automatically signed out.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onExtend} className="w-full">
            Stay Signed In
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}