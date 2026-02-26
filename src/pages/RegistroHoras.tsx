import { Clock } from 'lucide-react';

const RegistroHoras = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Registro de Horas</h1>
        <p className="text-muted-foreground text-sm mt-1">Timesheet semanal</p>
      </div>
      <div className="bg-card border rounded-lg p-12 flex flex-col items-center justify-center text-center">
        <Clock className="w-12 h-12 text-muted-foreground/40 mb-4" />
        <p className="text-muted-foreground">
          Planilha semanal com controle de horas por demanda.
        </p>
      </div>
    </div>
  );
};

export default RegistroHoras;
