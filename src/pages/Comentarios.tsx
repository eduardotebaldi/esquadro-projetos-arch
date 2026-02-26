import { MessageSquare } from 'lucide-react';

const Comentarios = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Comentários</h1>
        <p className="text-muted-foreground text-sm mt-1">Comunicação por demanda</p>
      </div>
      <div className="bg-card border rounded-lg p-12 flex flex-col items-center justify-center text-center">
        <MessageSquare className="w-12 h-12 text-muted-foreground/40 mb-4" />
        <p className="text-muted-foreground">
          Comentários com filtros por empreendimento e tipo de projeto.
        </p>
      </div>
    </div>
  );
};

export default Comentarios;
