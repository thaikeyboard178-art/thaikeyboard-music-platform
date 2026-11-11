import { runPilotMatrix } from "./tolerancePilot";

const rows = runPilotMatrix();
console.log(
  JSON.stringify(
    {
      evidenceType:
        "deterministic synthetic offline pilot; not production behavior",
      rows: rows.length,
      candidateCount: new Set(rows.map(row => row.candidate)).size,
      meterCount: new Set(rows.map(row => row.meter)).size,
      rowsData: rows,
    },
    null,
    2
  )
);
