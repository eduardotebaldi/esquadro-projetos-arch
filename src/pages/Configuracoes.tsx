import { Settings } from 'lucide-react';

const Configuracoes = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground text-sm mt-1">Administração do sistema</p>
      </div>
      <div className="bg-card border rounded-lg p-12 flex flex-col items-center justify-center text-center">
        <Settings className="w-12 h-12 text-muted-foreground/40 mb-4" />
        <p className="text-muted-foreground">
          Gerenciamento de status, tipos de projeto, usuários e mais.
        </p>
      </div>
    </div>
  );
};

export default Configuracoes;
