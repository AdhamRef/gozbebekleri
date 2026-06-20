export type OperationsPersistenceMode = "STATIC_FOUNDATION" | "PRISMA_READY";

export type OperationsPersistenceInfo = {
  mode: OperationsPersistenceMode;
  storage: "module-data" | "prisma";
  readOnly: boolean;
  model: string;
  nextModel: string;
  externalSideEffects: false;
  note: string;
};

export type OperationsRepositoryResult<T> = {
  items: T[];
  persistence: OperationsPersistenceInfo;
};
