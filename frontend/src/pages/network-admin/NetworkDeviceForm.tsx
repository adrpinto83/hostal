import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useNetworkDevices } from '@/lib/hooks/useNetworkDevices';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader, CheckCircle, AlertCircle } from 'lucide-react';

const BRANDS = ['ubiquiti', 'mikrotik', 'openwrt', 'cisco', 'tp_link', 'asus', 'dlink', 'netgear', 'aruba', 'fortinet', 'other'];
const DEVICE_TYPES = ['switch', 'router', 'access_point', 'firewall', 'controller', 'modem'];
const AUTH_TYPES = ['username_password', 'api_key', 'token', 'certificate', 'ssh_key'];

export default function NetworkDeviceForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id && id !== 'new';

  const { getDevice, createDevice, updateDevice, testDeviceConnection } = useNetworkDevices();
  const { data: existingDevice, isLoading: isLoadingDevice } = isEditing ? getDevice(parseInt(id!)) : { data: null, isLoading: false };

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    brand: 'ubiquiti',
    device_type: 'switch',
    ip_address: '',
    mac_address: '',
    auth_type: 'api_key',
    username: '',
    password: '',
    api_key: '',
    api_secret: '',
    port: 8443,
    use_ssl: true,
    verify_ssl: true,
    timeout_seconds: 30,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null);

  useEffect(() => {
    if (existingDevice) {
      setFormData({
        name: existingDevice.name || '',
        description: existingDevice.description || '',
        brand: existingDevice.brand || 'ubiquiti',
        device_type: existingDevice.device_type || 'switch',
        ip_address: existingDevice.ip_address || '',
        mac_address: existingDevice.mac_address || '',
        auth_type: existingDevice.auth_type || 'api_key',
        username: existingDevice.username || '',
        password: existingDevice.password || '',
        api_key: existingDevice.api_key || '',
        api_secret: existingDevice.api_secret || '',
        port: existingDevice.port || 8443,
        use_ssl: existingDevice.use_ssl !== false,
        verify_ssl: existingDevice.verify_ssl !== false,
        timeout_seconds: existingDevice.timeout_seconds || 30,
      });
    }
  }, [existingDevice]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'El nombre es requerido';
    if (!formData.ip_address.trim()) newErrors.ip_address = 'La dirección IP es requerida';
    if (!formData.port || formData.port < 1 || formData.port > 65535) {
      newErrors.port = 'El puerto debe estar entre 1 y 65535';
    }

    if (formData.auth_type === 'username_password') {
      if (!formData.username) newErrors.username = 'El usuario es requerido';
      if (!formData.password) newErrors.password = 'La contraseña es requerida';
    } else if (formData.auth_type === 'api_key') {
      if (!formData.api_key) newErrors.api_key = 'La API key es requerida';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (isEditing) {
        await updateDevice.mutateAsync({ id: parseInt(id!), data: formData });
      } else {
        await createDevice.mutateAsync(formData as any);
      }
      navigate('/network-devices');
    } catch (error) {
      console.error('Error saving device:', error);
    }
  };

  const handleTestConnection = async () => {
    if (!formData.ip_address) {
      setTestResult({ success: false, message: 'Por favor ingrese la dirección IP' });
      return;
    }

    try {
      if (isEditing) {
        await testDeviceConnection.mutateAsync(parseInt(id!));
        setTestResult({ success: true, message: 'Conexión exitosa' });
      } else {
        setTestResult({ success: false, message: 'Primero debe guardar el dispositivo' });
      }
    } catch (error: any) {
      setTestResult({ success: false, message: error.message || 'Error al probar la conexión' });
    }
  };

  if (isLoadingDevice) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-gray-500">Cargando dispositivo...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/network-devices')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <h1 className="text-2xl font-bold">
          {isEditing ? 'Editar Dispositivo' : 'Nuevo Dispositivo de Red'}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información del Dispositivo</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Ubiquiti Controller"
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Marca</label>
                <select
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  {BRANDS.map((brand) => (
                    <option key={brand} value={brand}>
                      {brand.replace('_', ' ').charAt(0).toUpperCase() + brand.replace('_', ' ').slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tipo de Dispositivo</label>
                <select
                  value={formData.device_type}
                  onChange={(e) => setFormData({ ...formData, device_type: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  {DEVICE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type.replace('_', ' ').charAt(0).toUpperCase() + type.replace('_', ' ').slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Descripción</label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción opcional"
                />
              </div>
            </div>

            {/* Connection Settings */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Configuración de Conexión</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Dirección IP *</label>
                  <Input
                    value={formData.ip_address}
                    onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                    placeholder="192.168.1.100"
                    className={errors.ip_address ? 'border-red-500' : ''}
                  />
                  {errors.ip_address && <p className="text-red-600 text-sm mt-1">{errors.ip_address}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">MAC Address</label>
                  <Input
                    value={formData.mac_address}
                    onChange={(e) => setFormData({ ...formData, mac_address: e.target.value })}
                    placeholder="00:11:22:33:44:55"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Puerto</label>
                  <Input
                    type="number"
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                    min="1"
                    max="65535"
                    className={errors.port ? 'border-red-500' : ''}
                  />
                  {errors.port && <p className="text-red-600 text-sm mt-1">{errors.port}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Timeout (segundos)</label>
                  <Input
                    type="number"
                    value={formData.timeout_seconds}
                    onChange={(e) => setFormData({ ...formData, timeout_seconds: parseInt(e.target.value) })}
                    min="1"
                  />
                </div>
              </div>

              <div className="flex gap-4 mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.use_ssl}
                    onChange={(e) => setFormData({ ...formData, use_ssl: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm">Usar SSL</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.verify_ssl}
                    onChange={(e) => setFormData({ ...formData, verify_ssl: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm">Verificar SSL</span>
                </label>
              </div>
            </div>

            {/* Authentication */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Autenticación</h3>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Tipo de Autenticación</label>
                <select
                  value={formData.auth_type}
                  onChange={(e) => setFormData({ ...formData, auth_type: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  {AUTH_TYPES.map((auth) => (
                    <option key={auth} value={auth}>
                      {auth.replace('_', ' ').charAt(0).toUpperCase() + auth.replace('_', ' ').slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {formData.auth_type === 'username_password' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Usuario *</label>
                    <Input
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="nombre de usuario"
                      className={errors.username ? 'border-red-500' : ''}
                    />
                    {errors.username && <p className="text-red-600 text-sm mt-1">{errors.username}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Contraseña *</label>
                    <Input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="contraseña"
                      className={errors.password ? 'border-red-500' : ''}
                    />
                    {errors.password && <p className="text-red-600 text-sm mt-1">{errors.password}</p>}
                  </div>
                </div>
              )}

              {formData.auth_type === 'api_key' && (
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">API Key *</label>
                    <Input
                      value={formData.api_key}
                      onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                      placeholder="tu_api_key"
                      className={errors.api_key ? 'border-red-500' : ''}
                    />
                    {errors.api_key && <p className="text-red-600 text-sm mt-1">{errors.api_key}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">API Secret</label>
                    <Input
                      value={formData.api_secret}
                      onChange={(e) => setFormData({ ...formData, api_secret: e.target.value })}
                      placeholder="tu_api_secret"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Test Connection */}
            {isEditing && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Prueba de Conexión</h3>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={testDeviceConnection.isPending}
                  className="w-full"
                >
                  {testDeviceConnection.isPending ? (
                    <>
                      <Loader className="h-4 w-4 mr-2 animate-spin" />
                      Probando...
                    </>
                  ) : (
                    'Probar Conexión'
                  )}
                </Button>
                {testResult && (
                  <div className={`mt-4 p-4 rounded flex items-center gap-2 ${testResult.success ? 'bg-green-100' : 'bg-red-100'}`}>
                    {testResult.success ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    )}
                    <span className={testResult.success ? 'text-green-800' : 'text-red-800'}>
                      {testResult.message}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="border-t pt-6 flex gap-4">
              <Button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={createDevice.isPending || updateDevice.isPending}
              >
                {createDevice.isPending || updateDevice.isPending ? (
                  <>
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  isEditing ? 'Actualizar' : 'Crear'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => navigate('/network-devices')}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
