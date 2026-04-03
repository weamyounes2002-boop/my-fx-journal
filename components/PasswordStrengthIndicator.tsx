import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { PasswordStrength } from '@/utils/security';

interface PasswordStrengthIndicatorProps {
  strength: PasswordStrength;
  errors: string[];
}

export default function PasswordStrengthIndicator({ strength, errors }: PasswordStrengthIndicatorProps) {
  const progressValue = (strength.score / 4) * 100;

  return (
    <div className="space-y-2 mt-2">
      {/* Strength Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">Password Strength:</span>
          <span className="font-semibold" style={{ color: strength.color }}>
            {strength.label}
          </span>
        </div>
        <Progress 
          value={progressValue} 
          className="h-2"
          style={{
            ['--progress-background' as string]: strength.color,
          } as React.CSSProperties}
        />
      </div>

      {/* Requirements Checklist */}
      <div className="space-y-1">
        <p className="text-xs font-semibold text-gray-700">Password Requirements:</p>
        <div className="grid grid-cols-1 gap-1">
          <RequirementItem 
            met={errors.length === 0 || !errors.some(e => e.includes('8 characters'))}
            text="At least 8 characters"
          />
          <RequirementItem 
            met={errors.length === 0 || !errors.some(e => e.includes('uppercase'))}
            text="One uppercase letter (A-Z)"
          />
          <RequirementItem 
            met={errors.length === 0 || !errors.some(e => e.includes('lowercase'))}
            text="One lowercase letter (a-z)"
          />
          <RequirementItem 
            met={errors.length === 0 || !errors.some(e => e.includes('number'))}
            text="One number (0-9)"
          />
          <RequirementItem 
            met={errors.length === 0 || !errors.some(e => e.includes('special character'))}
            text="One special character (!@#$%...)"
          />
        </div>
      </div>

      {/* Suggestions */}
      {strength.suggestions.length > 0 && (
        <Alert className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Tips:</strong> {strength.suggestions.join('. ')}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

function RequirementItem({ met, text }: { met: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {met ? (
        <CheckCircle2 className="h-3 w-3 text-green-600 flex-shrink-0" />
      ) : (
        <XCircle className="h-3 w-3 text-gray-400 flex-shrink-0" />
      )}
      <span className={met ? 'text-green-700' : 'text-gray-600'}>{text}</span>
    </div>
  );
}