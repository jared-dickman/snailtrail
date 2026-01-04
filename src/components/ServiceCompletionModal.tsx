import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { Camera, CheckCircle2, AlertCircle, Droplets } from 'lucide-react';
import type { ScheduledStop, ServiceCompletion } from '@/types/schedule';

interface ServiceCompletionModalProps {
  stop: ScheduledStop | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (stopId: string, completion: ServiceCompletion) => void;
}

function CompletionForm({ stop, onComplete, onClose }: {
  stop: ScheduledStop;
  onComplete: (stopId: string, completion: ServiceCompletion) => void;
  onClose: () => void;
}) {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [waterUsed, setWaterUsed] = useState(stop.waterGallonsNeeded || stop.location.waterGallonsNeeded || 0);
  const [nextTimeNotes, setNextTimeNotes] = useState('');
  const [tasksCompleted, setTasksCompleted] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const oneOffTasks = stop.oneOffTasks || [];
  const allTasksDone = oneOffTasks.length === 0 || oneOffTasks.every((_, i) => tasksCompleted[i]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setPhotoPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    if (!photoPreview) {
      toast.error('Please upload a photo of the tank');
      return;
    }
    if (!allTasksDone) {
      toast.error('Please complete all one-off tasks');
      return;
    }

    const completion: ServiceCompletion = {
      completedAt: new Date().toISOString(),
      photoUrl: photoPreview,
      waterGallonsUsed: waterUsed,
      nextTimeNotes: nextTimeNotes || undefined,
      oneOffTasksCompleted: true,
    };

    onComplete(stop.id, completion);
    toast.success('Service completed!');
    onClose();
  };

  return (
    <div className="space-y-4">
      {/* One-off notes for today */}
      {stop.oneOffNotes && (
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-600 mb-1">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Today's Notes</span>
          </div>
          <p className="text-sm">{stop.oneOffNotes}</p>
        </div>
      )}

      {/* One-off tasks checklist */}
      {oneOffTasks.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Today's Tasks</label>
          {oneOffTasks.map((task, i) => (
            <label key={i} className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-muted/50">
              <Checkbox
                checked={tasksCompleted[i] || false}
                onCheckedChange={(checked) => setTasksCompleted({ ...tasksCompleted, [i]: !!checked })}
              />
              <span className="text-sm">{task}</span>
            </label>
          ))}
        </div>
      )}

      {/* Photo upload */}
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-2">
          <Camera className="h-4 w-4" />
          Tank Photo (Required)
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoSelect}
          className="hidden"
        />
        {photoPreview ? (
          <div className="relative">
            <img src={photoPreview} alt="Tank" className="w-full h-40 object-cover rounded-lg" />
            <Button
              size="sm"
              variant="secondary"
              className="absolute bottom-2 right-2"
              onClick={() => fileInputRef.current?.click()}
            >
              Retake
            </Button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-32 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            <Camera className="h-8 w-8 mb-2" />
            <span className="text-sm">Tap to take photo</span>
          </button>
        )}
      </div>

      {/* Water used */}
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-2">
          <Droplets className="h-4 w-4 text-blue-500" />
          Water Used (gallons)
        </label>
        <Input
          type="number"
          value={waterUsed}
          onChange={(e) => setWaterUsed(parseInt(e.target.value) || 0)}
          min={0}
          className="h-11"
        />
      </div>

      {/* Notes for next time */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Notes for Next Visit</label>
        <textarea
          value={nextTimeNotes}
          onChange={(e) => setNextTimeNotes(e.target.value)}
          className="w-full p-3 rounded-lg border bg-background text-sm min-h-[80px] resize-none"
          placeholder="Anything to remember for next time..."
        />
      </div>

      <Button onClick={handleSubmit} className="w-full h-11" disabled={!photoPreview || !allTasksDone}>
        <CheckCircle2 className="h-4 w-4 mr-2" />
        Complete Service
      </Button>
    </div>
  );
}

export function ServiceCompletionModal({ stop, open, onOpenChange, onComplete }: ServiceCompletionModalProps) {
  const isMobile = useIsMobile();

  if (!stop) return null;

  const handleClose = () => onOpenChange(false);

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>Complete Service: {stop.location.name}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4 overflow-y-auto">
            <CompletionForm stop={stop} onComplete={onComplete} onClose={handleClose} />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Complete Service: {stop.location.name}</DialogTitle>
        </DialogHeader>
        <CompletionForm stop={stop} onComplete={onComplete} onClose={handleClose} />
      </DialogContent>
    </Dialog>
  );
}
