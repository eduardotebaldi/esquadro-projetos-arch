import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const prioridadeLabel: Record<number, string> = { 1: 'Alta', 2: 'Média', 3: 'Baixa' };
const prioridadeColor: Record<number, string> = {
  1: 'bg-destructive text-destructive-foreground',
  2: 'bg-accent text-accent-foreground',
  3: 'bg-muted text-muted-foreground',
};

interface DemandaDetailDialogProps {
  demanda: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh?: () => void;
}

const DemandaDetailDialog = ({ demanda, open, onOpenChange, onRefresh }: DemandaDetailDialogProps) => {
  const { user } = useAuth();
  const [comentarios, setComentarios] = useState<any[]>([]);
  const [novoTexto, setNovoTexto] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [updatingPrioridade, setUpdatingPrioridade] = useState(false);

  useEffect(() => {
    if (!demanda || !open) return;
    fetchComentarios();
  }, [demanda, open]);

  const fetchComentarios = async () => {
    if (!demanda) return;
    setLoadingComments(true);
    const { data } = await supabase
      .from('esquadro_comentarios')
      .select('*, usuario:esquadro_profiles(nome, email)')
      .eq('demanda_id', demanda.id)
      .order('created_at', { ascending: true });
    setComentarios(data || []);
    setLoadingComments(false);
  };

  const handleSend = async () => {
    if (!novoTexto.trim() || !user || !demanda) return;
    setSending(true);
    const { error } = await supabase.from('esquadro_comentarios').insert({
      demanda_id: demanda.id,
      user_id: user.id,
      texto: novoTexto.trim(),
    });
    if (error) {
      toast({ title: 'Erro ao enviar', description: error.message, variant: 'destructive' });
    } else {
      setNovoTexto('');
      fetchComentarios();
    }
    setSending(false);
  };

  const handlePrioridadeChange = async (value: string) => {
    if (!demanda) return;
    setUpdatingPrioridade(true);
    const { error } = await supabase
      .from('esquadro_demandas')
      .update({ prioridade: Number(value) })
      .eq('id', demanda.id);
    if (error) {
      toast({ title: 'Erro ao atualizar prioridade', description: error.message, variant: 'destructive' });
    } else {
      demanda.prioridade = Number(value);
      onRefresh?.();
    }
    setUpdatingPrioridade(false);
  };

  if (!demanda) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {demanda.empreendimento?.nome || '—'}
          </DialogTitle>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">Prioridade:</span>
            <Select
              value={String(demanda.prioridade)}
              onValueChange={handlePrioridadeChange}
              disabled={updatingPrioridade}
            >
              <SelectTrigger className="h-7 w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Alta</SelectItem>
                <SelectItem value="2">Média</SelectItem>
                <SelectItem value="3">Baixa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogDescription className="flex items-center gap-2 text-sm">
            {demanda.tipo_projeto?.nome || '—'} · Status: {demanda.status?.nome || '—'}
            {demanda.prazo && (
              <> · Prazo: {format(new Date(demanda.prazo), 'dd/MM/yyyy')}</>
            )}
            {demanda.horas_estimadas != null && (
              <> · {demanda.horas_estimadas}h estimadas</>
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {/* Instruções */}
          <div className="space-y-2 mb-4">
            <h4 className="text-sm font-semibold">Instruções</h4>
            <div className="bg-muted rounded-md p-3 text-sm whitespace-pre-wrap min-h-[60px]">
              {demanda.instrucoes || 'Nenhuma instrução registrada.'}
            </div>
          </div>

          <Separator className="my-4" />

          {/* Comentários */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Comentários ({comentarios.length})</h4>
            {loadingComments ? (
              <p className="text-xs text-muted-foreground">Carregando...</p>
            ) : comentarios.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum comentário ainda.</p>
            ) : (
              <div className="space-y-3">
                {comentarios.map((c) => (
                  <div key={c.id} className="bg-card border rounded-md p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">{c.usuario?.nome || c.usuario?.email || 'Usuário'}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(c.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{c.texto}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* New comment */}
        <div className="flex gap-2 mt-2">
          <Textarea
            placeholder="Escreva um comentário..."
            value={novoTexto}
            onChange={(e) => setNovoTexto(e.target.value)}
            className="min-h-[60px] resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSend();
            }}
          />
          <Button size="icon" onClick={handleSend} disabled={sending || !novoTexto.trim()} className="self-end">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DemandaDetailDialog;
