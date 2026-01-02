const createNotImplementedError = (op: string): Error =>
  new Error(`Supabase repository not connected yet: ${op}`);

export const notImplemented = (op: string): never => {
  throw createNotImplementedError(op);
};
