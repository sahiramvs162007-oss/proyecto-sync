import LocalDataSource from '../datasources/LocalDataSource';

const SyncRepository = {
  async obtenerPendientes(limit) {
    return LocalDataSource.getPendingOperations(limit);
  },

  async marcarSincronizado(id) {
    return LocalDataSource.markOperationSynced(id);
  },

  async marcarError(id, mensaje) {
    return LocalDataSource.markOperationError(id, mensaje);
  },

  async limpiarSincronizados() {
    return LocalDataSource.clearSyncedOperations();
  }
};

export default SyncRepository;
