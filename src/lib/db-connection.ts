/**
 * Current node-postgres treats `prefer`, `require`, and `verify-ca` as
 * `verify-full` and warns once per process. Rewriting those modes keeps
 * today's certificate check and stops the warning. `verify-full`, `disable`,
 * and strings without an sslmode are left unchanged.
 */
export function connectionStringWithFullSslVerification(connectionString: string): string {
  return connectionString.replace(
    /([?&]sslmode=)(?:prefer|require|verify-ca)(?=&|#|$)/gi,
    "$1verify-full"
  );
}
