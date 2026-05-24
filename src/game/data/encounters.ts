export type EncounterTableId = "motehaven-route-1";

export type WeightedEncounter = {
  bodyId: string;
  weight: number;
  unlockBodyOnWin: boolean;
};

export const ENCOUNTER_TABLES: Record<
  EncounterTableId,
  readonly WeightedEncounter[]
> = {
  "motehaven-route-1": [
    {
      bodyId: "reedling",
      weight: 55,
      unlockBodyOnWin: true,
    },
    {
      bodyId: "stonelet",
      weight: 30,
      unlockBodyOnWin: true,
    },
    {
      bodyId: "driftcap",
      weight: 15,
      unlockBodyOnWin: true,
    },
  ],
};
