import { DollarSign } from 'lucide-react';

const CustosIncorridos = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Custos Incorridos</h1>
        <p className="text-muted-foreground text-sm mt-1">Painel de custos por projeto</p>
      </div>
      <div className="bg-card border rounded-lg p-12 flex flex-col items-center justify-center text-center">
        <DollarSign className="w-12 h-12 text-muted-foreground/40 mb-4" />
        <p className="text-muted-foreground">
          Custos calculados por horas × custo/hora de cada arquiteta.
        </p>
      </div>
    </div>
  );
};

export default CustosIncorridos;
