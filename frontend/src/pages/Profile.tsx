import { useAuth } from "@/context/AuthContext";

export default function Profile() {
  const { user } = useAuth();
  return (
    <div className="max-w-lg rounded-xl border bg-white p-6">
      <h2 className="mb-4 text-xl font-semibold">Perfil</h2>
      <p><strong>ID:</strong> {user?.id}</p>
      <p><strong>Email:</strong> {user?.email}</p>
      <p><strong>Rol:</strong> {user?.role}</p>
    </div>
  );
}
