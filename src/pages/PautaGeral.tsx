import { ClipboardList } from 'lucide-react';

const PautaGeral = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Pauta Geral</h1>
        <p className="text-muted-foreground text-sm mt-1">Gestão de demandas de projetos</p>
      </div>
      <div className="bg-card border rounded-lg p-12 flex flex-col items-center justify-center text-center">
        <ClipboardList className="w-12 h-12 text-muted-foreground/40 mb-4" />
        <p className="text-muted-foreground">
          As visões Kanban e Tabela serão implementadas aqui.
        </p>
      </div>
    </div>
  );
};

export default PautaGeral;
