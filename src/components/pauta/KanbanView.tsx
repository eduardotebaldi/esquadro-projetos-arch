import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import type { Status } from '@/types/database';
import { toast } from '@/hooks/use-toast';

const prioridadeLabel: Record<number, string> = { 1: 'Alta', 2: 'Média', 3: 'Baixa' };
const prioridadeColor: Record<number, string> = {
  1: 'bg-destructive text-destructive-foreground',
  2: 'bg-accent text-accent-foreground',
  3: 'bg-muted text-muted-foreground',
};

interface KanbanViewProps {
  demandas: any[];
  onRefresh: () => void;
  onDemandaClick?: (demanda: any) => void;
}

const KanbanView = ({ demandas, onRefresh, onDemandaClick }: KanbanViewProps) => {
  const [statusList, setStatusList] = useState<Status[]>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('esquadro_status')
        .select('*')
        .eq('ativo', true)
        .order('ordem');
      setStatusList(data || []);
    };
    fetch();
  }, []);

  const handleDragStart = (e: React.DragEvent, demandaId: string) => {
    setDraggedId(demandaId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, statusId: string) => {
    e.preventDefault();
    if (!draggedId) return;

    const { error } = await supabase
      .from('esquadro_demandas')
      .update({ status_id: statusId })
      .eq('id', draggedId);

    if (error) {
      toast({ title: 'Erro ao mover', description: error.message, variant: 'destructive' });
    } else {
      onRefresh();
    }
    setDraggedId(null);
  };

  if (statusList.length === 0) {
    return <div className="text-sm text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {statusList.map((status) => {
        const columnDemandas = demandas.filter((d) => d.status_id === status.id);
        return (
          <div
            key={status.id}
            className="flex-shrink-0 w-72 bg-muted/50 rounded-lg flex flex-col"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, status.id)}
          >
            {/* Column header */}
            <div className="px-3 py-3 border-b flex items-center justify-between">
              <h3 className="text-sm font-semibold truncate">{status.nome}</h3>
              <Badge variant="secondary" className="text-xs ml-2 flex-shrink-0">
                {columnDemandas.length}
              </Badge>
            </div>

            {/* Cards */}
            <div className="p-2 space-y-2 flex-1 min-h-[120px]">
              {columnDemandas.map((d) => (
                <div
                  key={d.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, d.id)}
                  onClick={() => onDemandaClick?.(d)}
                  className="bg-card border rounded-md p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow"
                >
                  <p className="text-sm font-medium truncate">
                    {d.empreendimento?.nome || '—'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {d.tipo_projeto?.nome || '—'}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <Badge className={`text-[10px] px-1.5 py-0 ${prioridadeColor[d.prioridade] || ''}`}>
                      {prioridadeLabel[d.prioridade] || '—'}
                    </Badge>
                    {d.prazo && (
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(d.prazo).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {columnDemandas.length === 0 && (
                <div className="flex items-center justify-center h-20 text-xs text-muted-foreground/50">
                  Arraste demandas aqui
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default KanbanView;
