import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { networkDevicesApi } from '@/lib/api';
import type { NetworkDeviceCreate } from '@/types';

export const useNetworkDevices = () => {
  const queryClient = useQueryClient();

  // Queries
  const devicesList = useQuery({
    queryKey: ['networkDevices'],
    queryFn: () => networkDevicesApi.getAll(),
  });

  const getDevice = (id: number) => {
    return useQuery({
      queryKey: ['networkDevice', id],
      queryFn: () => networkDevicesApi.getById(id),
      enabled: id > 0,
    });
  };

  // Mutations
  const createDevice = useMutation({
    mutationFn: (data: NetworkDeviceCreate) => networkDevicesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['networkDevices'] });
    },
  });

  const updateDevice = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      networkDevicesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['networkDevices'] });
    },
  });

  const deleteDevice = useMutation({
    mutationFn: (id: number) => networkDevicesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['networkDevices'] });
    },
  });

  const testDeviceConnection = useMutation({
    mutationFn: (deviceId: number) => networkDevicesApi.testConnection(deviceId),
  });

  const blockMac = useMutation({
    mutationFn: ({ mac, deviceId, notes }: { mac: string; deviceId?: number; notes?: string }) =>
      networkDevicesApi.blockMacAddress(mac, deviceId, notes),
  });

  const unblockMac = useMutation({
    mutationFn: ({ mac, deviceId }: { mac: string; deviceId?: number }) =>
      networkDevicesApi.unblockMacAddress(mac, deviceId),
  });

  return {
    // Device queries and mutations
    devices: devicesList.data ?? [],
    devicesLoading: devicesList.isLoading,
    devicesFetching: devicesList.isFetching,
    getDevice,
    createDevice,
    updateDevice,
    deleteDevice,
    testDeviceConnection,
    blockMac,
    unblockMac,
  };
};
