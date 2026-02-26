import { BarChart3 } from 'lucide-react';

const Historico = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Histórico</h1>
        <p className="text-muted-foreground text-sm mt-1">Relatórios e comparativos</p>
      </div>
      <div className="bg-card border rounded-lg p-12 flex flex-col items-center justify-center text-center">
        <BarChart3 className="w-12 h-12 text-muted-foreground/40 mb-4" />
        <p className="text-muted-foreground">
          Gráficos interativos com Recharts serão exibidos aqui.
        </p>
      </div>
    </div>
  );
};

export default Historico;
