/** Lê o corpo JSON de uma resposta nos testes (tipado como `any` de propósito). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const readJson = async (res: Response): Promise<any> => res.json()
