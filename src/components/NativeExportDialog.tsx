import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { FolderIcon, DownloadIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface NativeExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: { filename: string; format: string; quality: string }) => Promise<void>;
  projectName: string;
}

export function NativeExportDialog({ 
  isOpen, 
  onClose, 
  onExport,
  projectName 
}: NativeExportDialogProps) {
  const [filename, setFilename] = useState(`${projectName}_export`);
  const [format, setFormat] = useState('wav');
  const [quality, setQuality] = useState('high');
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport({ filename, format, quality });
      toast({
        title: "Export Complete",
        description: "Your project has been exported to Files app",
      });
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: "Export Failed",
        description: "There was an error exporting your project",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderIcon className="w-5 h-5" />
            Export to Files
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="filename">Filename</Label>
            <Input
              id="filename"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="Enter filename"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="format">Format</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wav">WAV (Uncompressed)</SelectItem>
                <SelectItem value="mp3">MP3 (Compressed)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quality">Quality</Label>
            <Select value={quality} onValueChange={setQuality}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High (48kHz)</SelectItem>
                <SelectItem value="medium">Medium (44.1kHz)</SelectItem>
                <SelectItem value="low">Low (22kHz)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-muted/50 p-3 rounded-lg text-sm text-muted-foreground">
            <p>Your project will be saved to the Files app where you can:</p>
            <ul className="mt-2 ml-4 list-disc space-y-1">
              <li>Share via AirDrop, Messages, or Email</li>
              <li>Save to iCloud Drive or other cloud storage</li>
              <li>Import into other music apps</li>
            </ul>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleExport} 
              disabled={isExporting || !filename.trim()}
              className="flex-1"
            >
              {isExporting ? (
                "Exporting..."
              ) : (
                <>
                  <DownloadIcon className="w-4 h-4 mr-2" />
                  Export
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}