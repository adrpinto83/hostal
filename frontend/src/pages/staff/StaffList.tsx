import { useQuery } from '@tanstack/react-query';
import { staffApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const staffRoleLabels: Record<string, string> = {
  recepcionista: 'Recepcionista',
  limpieza: 'Limpieza',
  mantenimiento: 'Mantenimiento',
  gerente: 'Gerente',
  seguridad: 'Seguridad',
};

const staffStatusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  on_leave: 'bg-yellow-100 text-yellow-800',
  terminated: 'bg-red-100 text-red-800',
};

export default function StaffList() {
  const { data: staff, isLoading } = useQuery({
    queryKey: ['staff'],
    queryFn: () => staffApi.getAll(),
  });

  if (isLoading) return <div>Cargando personal...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Personal del Hostal</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {staff?.map((member) => (
          <Card key={member.id}>
            <CardHeader>
              <CardTitle className="text-lg">{member.full_name}</CardTitle>
              <div className="flex gap-2">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${staffStatusColors[member.status]}`}>
                  {member.status}
                </span>
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                  {staffRoleLabels[member.role] || member.role}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                <p><strong>Documento:</strong> {member.document_id}</p>
                {member.phone && <p><strong>Teléfono:</strong> {member.phone}</p>}
                {member.email && <p><strong>Email:</strong> {member.email}</p>}
                {member.salary && <p><strong>Salario:</strong> ${member.salary}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
