"use client";

import { useState } from "react";
import { verifyDb } from "@/lib/db/verify";
import { Button } from "@/components/ui/button";

type Result = {
  insertedId: string;
  fetched: boolean;
  listed: boolean;
};

export default function DbCheckPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runCheck = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const data = await verifyDb();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-6 py-12">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">IndexedDB Smoke Check</h1>
        <p className="text-sm text-muted-foreground">
          Runs put/get/listAll on the plans store using a temporary record.
        </p>
      </div>

      <Button className="w-fit" onClick={runCheck} disabled={loading}>
        {loading ? "Running..." : "Run Check"}
      </Button>

      {result && (
        <div className="rounded-lg border p-4 text-sm">
          <div>Inserted id: {result.insertedId}</div>
          <div>get: {result.fetched ? "OK" : "NG"}</div>
          <div>listAll: {result.listed ? "OK" : "NG"}</div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}
