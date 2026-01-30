import { ImportSession } from '../types';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Trash2, FileText, Calendar } from 'lucide-react';
import { getBankDisplayName } from '../utils/csvParser';
import { getMonthName } from '../utils/calculations';

interface ImportHistoryItemProps {
  session: ImportSession;
  onRemove: (sessionId: string) => void;
  isRemoving: boolean;
}

export const ImportHistoryItem: React.FC<ImportHistoryItemProps> = ({
  session,
  onRemove,
  isRemoving
}) => {
  const importDate = new Date(session.importDate);
  const formattedImportDate = importDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const targetMonthStr = session.targetYear && session.targetMonth
    ? `${getMonthName(session.targetMonth)} ${session.targetYear}`
    : 'Unknown';

  return (
    <Card className="hover:border-blue-300 transition-colors">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium truncate">{session.fileName}</span>
              {session.bankSource && (
                <Badge variant="outline" className="ml-2">
                  {getBankDisplayName(session.bankSource)}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>Imported: {formattedImportDate}</span>
              </div>
              {session.appliedToMonth && (
                <div className="flex items-center gap-1">
                  <span>Applied to: <span className="font-medium">{targetMonthStr}</span></span>
                </div>
              )}
            </div>

            <div className="flex gap-3 text-xs text-muted-foreground">
              <span>{session.transactionCount} transactions</span>
              <span>•</span>
              <span>{session.categorizedCount} categorized</span>
              {session.appliedToMonth && (
                <>
                  <span>•</span>
                  <Badge variant="secondary" className="h-5">Applied</Badge>
                </>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(session.id)}
            disabled={isRemoving}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
