import { Building2, ClipboardList, AlertTriangle, Clock } from 'lucide-react';

const stats = [
  { label: 'Empreendimentos Ativos', value: '—', icon: Building2, color: 'bg-primary' },
  { label: 'Demandas em Andamento', value: '—', icon: ClipboardList, color: 'bg-accent' },
  { label: 'Demandas Atrasadas', value: '—', icon: AlertTriangle, color: 'bg-destructive' },
  { label: 'Horas no Mês', value: '—', icon: Clock, color: 'bg-primary' },
];

const Dashboard = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Visão geral dos projetos</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-card border rounded-lg p-5 flex items-start gap-4">
            <div className={`${stat.color} w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0`}>
              <stat.icon className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-bold mt-1">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Carga de trabalho */}
        <div className="bg-card border rounded-lg p-5">
          <h2 className="text-lg font-semibold mb-4">Carga de Trabalho</h2>
          <div className="space-y-3">
            {['Ana', 'Beatriz', 'Carla'].map((name) => (
              <div key={name} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{name}</span>
                  <span className="font-medium">— tarefas</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full w-0" />
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Conecte os dados para visualizar a carga real.
          </p>
        </div>

        {/* Demandas urgentes */}
        <div className="bg-card border rounded-lg p-5">
          <h2 className="text-lg font-semibold mb-4">Demandas Urgentes</h2>
          <div className="text-sm text-muted-foreground flex items-center justify-center h-32">
            Nenhuma demanda cadastrada ainda.
          </div>
        </div>
      </div>

      {/* Alertas */}
      <div className="bg-card border rounded-lg p-5">
        <h2 className="text-lg font-semibold mb-4">Alertas</h2>
        <div className="text-sm text-muted-foreground">
          Sem alertas no momento.
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
