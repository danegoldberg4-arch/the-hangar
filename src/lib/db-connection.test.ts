import { describe, expect, it } from "vitest";
import { connectionStringWithFullSslVerification } from "./db-connection";

describe("database connection string SSL mode", () => {
  it("rewrites the modes pg treats as verify-full so the warning stops", () => {
    expect(
      connectionStringWithFullSslVerification(
        "postgresql://user:p%40ss@host/db?sslmode=require&channel_binding=require"
      )
    ).toBe(
      "postgresql://user:p%40ss@host/db?sslmode=verify-full&channel_binding=require"
    );
    expect(
      connectionStringWithFullSslVerification(
        "postgresql://user:pass@host/db?connect_timeout=10&sslmode=prefer"
      )
    ).toBe("postgresql://user:pass@host/db?connect_timeout=10&sslmode=verify-full");
    expect(
      connectionStringWithFullSslVerification(
        "postgresql://user:pass@host/db?sslmode=verify-ca"
      )
    ).toBe("postgresql://user:pass@host/db?sslmode=verify-full");
    expect(
      connectionStringWithFullSslVerification(
        "postgresql://user:pass@host/db?SSLMODE=Require"
      )
    ).toBe("postgresql://user:pass@host/db?SSLMODE=verify-full");
  });

  it("leaves verify-full, disabled, and local strings unchanged", () => {
    const verified = "postgresql://user:pass@host/db?sslmode=verify-full";
    const disabled = "postgresql://user:pass@host/db?sslmode=disable";
    const local = "postgresql://user:pass@localhost:5432/hangar";

    expect(connectionStringWithFullSslVerification(verified)).toBe(verified);
    expect(connectionStringWithFullSslVerification(disabled)).toBe(disabled);
    expect(connectionStringWithFullSslVerification(local)).toBe(local);
  });

  it("does not rewrite sslmode text that is part of the password", () => {
    expect(
      connectionStringWithFullSslVerification(
        "postgresql://user:sslmode=require@host/db?sslmode=require"
      )
    ).toBe("postgresql://user:sslmode=require@host/db?sslmode=verify-full");
  });
});
