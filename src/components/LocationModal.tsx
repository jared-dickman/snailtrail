import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { Camera, Fish, Droplets, Plus, Sparkles } from 'lucide-react';
import type { ServiceLocation, TabValue } from '@/types/location';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly (Every 2 weeks)' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom interval' },
];
const PRIORITIES = [
  { value: 'high', label: 'High', color: 'bg-red-500' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-500' },
  { value: 'low', label: 'Low', color: 'bg-green-500' },
];
const TANK_TYPES = ['freshwater', 'saltwater', 'reef'] as const;
const COMMON_FISH = ['Clownfish', 'Tang', 'Wrasse', 'Angelfish', 'Damsel', 'Goby', 'Blenny', 'Chromis'];

interface LocationModalProps {
  location: ServiceLocation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (location: ServiceLocation) => void;
  onDelete: (id: string) => void;
  onMarkServiced: (id: string) => void;
  onSkipUntil: (id: string, date: Date) => void;
}

function formatDate(date?: Date): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getDaysUntil(date?: Date): number | null {
  if (!date) return null;
  const diff = new Date(date).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function StatusBadge({ status }: { status: ServiceLocation['status'] }) {
  const variants = { active: 'default', paused: 'secondary', inactive: 'destructive' } as const;
  return <Badge variant={variants[status]}>{status}</Badge>;
}

function PriorityBadge({ priority }: { priority?: ServiceLocation['priority'] }) {
  if (!priority) return null;
  const colors = { high: 'bg-red-500', medium: 'bg-yellow-500', low: 'bg-green-500' };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[priority]}`} />;
}

function ModalContent({ location, onUpdate, onDelete, onMarkServiced, onSkipUntil, onClose }: {
  location: ServiceLocation;
  onUpdate: (loc: ServiceLocation) => void;
  onDelete: (id: string) => void;
  onMarkServiced: (id: string) => void;
  onSkipUntil: (id: string, date: Date) => void;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<TabValue>('details');
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState(location);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showSkipPicker, setShowSkipPicker] = useState(false);
  const [skipDate, setSkipDate] = useState('');

  const daysUntil = getDaysUntil(location.nextService);
  const isOverdue = daysUntil !== null && daysUntil < 0;
  const isDueSoon = daysUntil !== null && daysUntil >= 0 && daysUntil <= 2;

  const handleSave = () => {
    onUpdate(formData);
    setEditing(false);
  };

  const handleDelete = () => {
    if (confirmDelete) {
      onDelete(location.id);
      onClose();
    } else {
      setConfirmDelete(true);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header Info */}
      <div className="px-1 pb-4 border-b">
        <div className="flex items-center gap-2 mb-2">
          <PriorityBadge priority={location.priority} />
          <StatusBadge status={location.status} />
          {location.tankInfo && (
            <Badge variant="outline">{location.tankInfo.gallons}gal {location.tankInfo.type}</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{location.address}</p>

        {/* Service Status */}
        <div className="mt-3 p-3 rounded-lg bg-muted/50">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Last Service</span>
            <span>{formatDate(location.lastService)}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-muted-foreground">Next Service</span>
            <span className={isOverdue ? 'text-red-500 font-semibold' : isDueSoon ? 'text-yellow-600 font-semibold' : ''}>
              {formatDate(location.nextService)}
              {daysUntil !== null && (
                <span className="ml-1">
                  ({isOverdue ? `${Math.abs(daysUntil)}d overdue` : daysUntil === 0 ? 'Today' : `in ${daysUntil}d`})
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 mt-3">
          <Button size="sm" className="flex-1 h-11" onClick={() => { onMarkServiced(location.id); onClose(); }}>
            Mark Serviced
          </Button>
          <Button size="sm" variant="outline" className="flex-1 h-11" onClick={() => setShowSkipPicker(!showSkipPicker)}>
            Skip Until
          </Button>
        </div>

        {/* Skip Until Date Picker */}
        {showSkipPicker && (
          <div className="mt-2 p-3 rounded-lg bg-muted/50 space-y-2">
            <label className="text-sm font-medium">Return to service on:</label>
            <div className="flex gap-2">
              <Input
                type="date"
                value={skipDate}
                onChange={(e) => setSkipDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="flex-1 h-10"
              />
              <Button
                size="sm"
                className="h-10"
                disabled={!skipDate}
                onClick={() => {
                  onSkipUntil(location.id, new Date(skipDate));
                  onClose();
                }}
              >
                Confirm
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="flex-1 flex flex-col">
        <TabsList className="grid grid-cols-4 mx-1 mt-4">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="tank">Tank</TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1 px-1 mt-4 pb-20">
          <TabsContent value="details" className="mt-0 space-y-4">
            {editing ? (
              <>
                <div>
                  <label className="text-sm text-muted-foreground">Name</label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Address</label>
                  <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Contact Name</label>
                  <Input value={formData.contactName || ''} onChange={(e) => setFormData({ ...formData, contactName: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Contact Phone</label>
                  <Input value={formData.contactPhone || ''} onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })} />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSave} className="flex-1 h-11">Save</Button>
                  <Button variant="outline" onClick={() => setEditing(false)} className="flex-1 h-11">Cancel</Button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Contact</span>
                    <span>{location.contactName || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Phone</span>
                    <a href={`tel:${location.contactPhone}`} className="text-primary">{location.contactPhone || 'N/A'}</a>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Priority</span>
                    <span className="capitalize">{location.priority || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Status</span>
                    <StatusBadge status={location.status} />
                  </div>
                </div>
                <Button variant="outline" onClick={() => setEditing(true)} className="w-full h-11">Edit Details</Button>
              </>
            )}
          </TabsContent>

          <TabsContent value="schedule" className="mt-0 space-y-5">
            {/* Frequency Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Service Frequency</label>
              <Select
                value={formData.serviceSchedule?.frequency || 'weekly'}
                onValueChange={(v) => setFormData({
                  ...formData,
                  serviceSchedule: { ...formData.serviceSchedule, frequency: v as 'weekly' | 'biweekly' | 'monthly' }
                })}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map(f => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Preferred Days Multi-select */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Preferred Days</label>
              <div className="grid grid-cols-2 gap-2">
                {DAYS_OF_WEEK.map(day => (
                  <label key={day} className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-muted/50">
                    <Checkbox
                      checked={formData.serviceSchedule?.preferredDay === day}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData({
                            ...formData,
                            serviceSchedule: { frequency: 'weekly', ...formData.serviceSchedule, preferredDay: day }
                          });
                        }
                      }}
                    />
                    <span className="text-sm">{day}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Time Window */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Time Window</label>
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  value={formData.serviceSchedule?.timeWindow?.open || '09:00'}
                  onChange={(e) => setFormData({
                    ...formData,
                    serviceSchedule: {
                      frequency: 'weekly',
                      ...formData.serviceSchedule,
                      timeWindow: { ...formData.serviceSchedule?.timeWindow, open: e.target.value, close: formData.serviceSchedule?.timeWindow?.close || '17:00' }
                    }
                  })}
                  className="flex-1 h-11"
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  type="time"
                  value={formData.serviceSchedule?.timeWindow?.close || '17:00'}
                  onChange={(e) => setFormData({
                    ...formData,
                    serviceSchedule: {
                      frequency: 'weekly',
                      ...formData.serviceSchedule,
                      timeWindow: { ...formData.serviceSchedule?.timeWindow, open: formData.serviceSchedule?.timeWindow?.open || '09:00', close: e.target.value }
                    }
                  })}
                  className="flex-1 h-11"
                />
              </div>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Priority Level</label>
              <div className="flex gap-2">
                {PRIORITIES.map(p => (
                  <button
                    key={p.value}
                    onClick={() => setFormData({ ...formData, priority: p.value as 'high' | 'medium' | 'low' })}
                    className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                      formData.priority === p.value
                        ? 'border-primary bg-primary/10'
                        : 'border-transparent bg-muted/50 hover:bg-muted'
                    }`}
                  >
                    <span className={`inline-block w-3 h-3 rounded-full ${p.color} mb-1`} />
                    <div className="text-sm font-medium">{p.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Special Instructions Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <div className="text-sm font-medium">Special Instructions</div>
                <div className="text-xs text-muted-foreground">Enable custom notes for this location</div>
              </div>
              <Switch />
            </div>

            <Button onClick={handleSave} className="w-full h-11">
              <Sparkles className="h-4 w-4 mr-2" />
              Save Schedule
            </Button>
          </TabsContent>

          <TabsContent value="history" className="mt-0">
            <div className="text-center py-8 text-muted-foreground">
              <pre className="text-2xl mb-2">{`  ~><((('>
 ><>  ><>`}</pre>
              <p className="text-sm">Service history coming soon</p>
            </div>
          </TabsContent>

          <TabsContent value="tank" className="mt-0 space-y-5">
            {/* Tank Type & Size */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tank Type</label>
                <Select
                  value={formData.tankInfo?.type || 'freshwater'}
                  onValueChange={(v) => setFormData({
                    ...formData,
                    tankInfo: { ...formData.tankInfo, type: v as typeof TANK_TYPES[number], gallons: formData.tankInfo?.gallons || 0 }
                  })}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TANK_TYPES.map(t => (
                      <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Size (gal)</label>
                <Input
                  type="number"
                  value={formData.tankInfo?.gallons || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    tankInfo: { ...formData.tankInfo, gallons: parseInt(e.target.value) || 0, type: formData.tankInfo?.type || 'freshwater' }
                  })}
                  className="h-11"
                  placeholder="e.g. 150"
                />
              </div>
            </div>

            {/* Fish Inventory */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Fish className="h-4 w-4" />
                Fish Inventory
              </label>
              <div className="flex flex-wrap gap-1">
                {COMMON_FISH.map(fish => (
                  <Badge
                    key={fish}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    {fish}
                  </Badge>
                ))}
                <Badge variant="outline" className="cursor-pointer bg-muted">
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Badge>
              </div>
            </div>

            {/* Equipment */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Droplets className="h-4 w-4" />
                Equipment
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['Sump', 'Skimmer', 'Reactor', 'UV', 'ATO', 'Dosing'].map(equip => (
                  <label key={equip} className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-muted/50">
                    <Checkbox />
                    <span className="text-sm">{equip}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Photos */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Tank Photos
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                  <Camera className="h-6 w-6 mb-1" />
                  <span className="text-xs">Add Photo</span>
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Track tank health over time with dated photos</p>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tank Notes</label>
              <textarea
                value={formData.tankInfo?.notes || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  tankInfo: { ...formData.tankInfo, notes: e.target.value, type: formData.tankInfo?.type || 'freshwater', gallons: formData.tankInfo?.gallons || 0 }
                })}
                className="w-full p-3 rounded-lg border bg-background text-sm min-h-[80px] resize-none"
                placeholder="Equipment details, special care notes, livestock info..."
              />
            </div>

            <Button onClick={handleSave} className="w-full h-11">
              <Sparkles className="h-4 w-4 mr-2" />
              Save Tank Info
            </Button>
          </TabsContent>
        </ScrollArea>
      </Tabs>

      {/* Delete */}
      <div className="pt-4 border-t mt-4">
        <Button
          variant={confirmDelete ? 'destructive' : 'ghost'}
          className="w-full h-11"
          onClick={handleDelete}
        >
          {confirmDelete ? 'Confirm Delete' : 'Delete Location'}
        </Button>
      </div>
    </div>
  );
}

export function LocationModal({ location, open, onOpenChange, onUpdate, onDelete, onMarkServiced, onSkipUntil }: LocationModalProps) {
  const isMobile = useIsMobile();

  if (!location) return null;

  const handleClose = () => onOpenChange(false);

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[95vh] max-h-[95vh] flex flex-col">
          <DrawerHeader className="text-left shrink-0">
            <DrawerTitle>{location.name}</DrawerTitle>
          </DrawerHeader>
          <ScrollArea className="flex-1 px-4 pb-4">
            <ModalContent
              location={location}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onMarkServiced={onMarkServiced}
              onSkipUntil={onSkipUntil}
              onClose={handleClose}
            />
          </ScrollArea>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{location.name}</DialogTitle>
        </DialogHeader>
        <ModalContent
          location={location}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onMarkServiced={onMarkServiced}
          onSkipUntil={onSkipUntil}
          onClose={handleClose}
        />
      </DialogContent>
    </Dialog>
  );
}
