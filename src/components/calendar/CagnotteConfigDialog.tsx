import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users } from 'lucide-react';

interface CagnotteConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalAmount: number;
  onConfirm: (teamASize: number, teamBSize: number) => void;
  isCreating: boolean;
}

export const CagnotteConfigDialog = ({ 
  open, 
  onOpenChange, 
  totalAmount, 
  onConfirm,
  isCreating 
}: CagnotteConfigDialogProps) => {
  const [teamASize, setTeamASize] = useState(8);
  const [teamBSize, setTeamBSize] = useState(8);
  
  const teamASuggestedPart = Math.ceil(totalAmount / 2 / teamASize);
  const teamBSuggestedPart = Math.ceil(totalAmount / 2 / teamBSize);
  
  const handleTeamASizeChange = (value: string) => {
    const num = parseInt(value) || 8;
    setTeamASize(Math.max(1, Math.min(22, num)));
  };
  
  const handleTeamBSizeChange = (value: string) => {
    const num = parseInt(value) || 8;
    setTeamBSize(Math.max(1, Math.min(22, num)));
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Configuration de la cagnotte
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Total */}
          <div className="bg-primary/5 rounded-lg p-3 text-center">
            <p className="text-sm text-muted-foreground">Total à collecter</p>
            <p className="text-2xl font-bold text-primary">{totalAmount.toLocaleString()} XOF</p>
          </div>
          
          {/* Équipe A */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Équipe A</label>
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setTeamASize(Math.max(1, teamASize - 1))}
                disabled={isCreating}
              >
                −
              </Button>
              <Input 
                type="number" 
                value={teamASize} 
                onChange={(e) => handleTeamASizeChange(e.target.value)}
                className="w-20 text-center"
                min={1}
                max={22}
                disabled={isCreating}
              />
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setTeamASize(Math.min(22, teamASize + 1))}
                disabled={isCreating}
              >
                +
              </Button>
              <span className="text-sm text-muted-foreground">joueurs</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Part suggérée : <span className="font-semibold text-foreground">{teamASuggestedPart.toLocaleString()} XOF</span> / joueur
            </p>
          </div>
          
          {/* Équipe B */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Équipe B</label>
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setTeamBSize(Math.max(1, teamBSize - 1))}
                disabled={isCreating}
              >
                −
              </Button>
              <Input 
                type="number" 
                value={teamBSize} 
                onChange={(e) => handleTeamBSizeChange(e.target.value)}
                className="w-20 text-center"
                min={1}
                max={22}
                disabled={isCreating}
              />
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setTeamBSize(Math.min(22, teamBSize + 1))}
                disabled={isCreating}
              >
                +
              </Button>
              <span className="text-sm text-muted-foreground">joueurs</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Part suggérée : <span className="font-semibold text-foreground">{teamBSuggestedPart.toLocaleString()} XOF</span> / joueur
            </p>
          </div>
          
          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
            💡 Les joueurs pourront payer leur part via mobile money. Le match se confirmera une fois 100% collecté.
          </div>
        </div>
        
        <DialogFooter className="flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
            className="flex-1"
          >
            Annuler
          </Button>
          <Button 
            onClick={() => onConfirm(teamASize, teamBSize)}
            disabled={isCreating}
            className="flex-1"
          >
            {isCreating ? 'Création...' : 'Confirmer et créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
