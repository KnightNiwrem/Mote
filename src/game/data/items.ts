import { MOTE_BODIES } from "@/game/data/bodies";
import { MOTE_MINDS } from "@/game/data/minds";
import { TRIALS } from "@/game/data/trials";
import type { ItemCategory, ItemDefinition } from "@/game/types/game";

export const INVENTORY_CATEGORIES = [
  "body",
  "mind-license",
  "care",
  "battle",
  "key",
  "material",
  "trial-mark",
] as const satisfies readonly ItemCategory[];

export const INVENTORY_CATEGORY_LABELS: Record<ItemCategory, string> = {
  body: "Bodies",
  "mind-license": "Mind Licenses",
  care: "Care",
  battle: "Battle",
  key: "Key",
  material: "Materials",
  "trial-mark": "Trial Marks",
};

const BODY_ITEM_DEFINITIONS = Object.fromEntries(
  Object.values(MOTE_BODIES).map((body) => [
    getBodyItemId(body.id),
    {
      id: getBodyItemId(body.id),
      name: `${body.name} Body`,
      category: "body",
      description: `A stored ${body.species} body ready for Circle assignment.`,
      stackLimit: 99,
      usableFrom: [],
    } satisfies ItemDefinition,
  ]),
) as Record<string, ItemDefinition>;

const MIND_LICENSE_DEFINITIONS = Object.fromEntries(
  Object.values(MOTE_MINDS).map((mind) => [
    getMindLicenseItemId(mind.id),
    {
      id: getMindLicenseItemId(mind.id),
      name: `${mind.name} License`,
      category: "mind-license",
      description: `Proof that ${mind.name} can be assigned to an acquired body.`,
      stackLimit: 1,
      usableFrom: [],
    } satisfies ItemDefinition,
  ]),
) as Record<string, ItemDefinition>;

const TRIAL_MARK_DEFINITIONS = Object.fromEntries(
  Object.values(TRIALS).map((trial) => [
    trial.rewardInventoryKey,
    {
      id: trial.rewardInventoryKey,
      name: trial.rewardLabel,
      category: "trial-mark",
      description: `Awarded for clearing ${trial.name}.`,
      stackLimit: 1,
      usableFrom: [],
    } satisfies ItemDefinition,
  ]),
) as Record<string, ItemDefinition>;

export const ITEM_DEFINITIONS: Record<string, ItemDefinition> = {
  ...BODY_ITEM_DEFINITIONS,
  ...MIND_LICENSE_DEFINITIONS,
  ...TRIAL_MARK_DEFINITIONS,
  "patch-pulse": {
    id: "patch-pulse",
    name: "Patch Pulse",
    category: "battle",
    description: "Restores 12 HP to the first wounded Mote in the Circle.",
    stackLimit: 10,
    usableFrom: ["menu", "battle"],
    effect: {
      type: "heal-circle",
      amount: 12,
    },
  },
  "focus-bell": {
    id: "focus-bell",
    name: "Focus Bell",
    category: "care",
    description: "Raises the first Circle member's bond by 1.",
    stackLimit: 5,
    usableFrom: ["menu", "garden"],
    effect: {
      type: "bond-circle",
      amount: 1,
    },
  },
  "key:garden-pass": {
    id: "key:garden-pass",
    name: "Garden Pass",
    category: "key",
    description: "A caretaker pass that opens the Garden gate.",
    stackLimit: 1,
    usableFrom: [],
  },
  "material:signal-fragment": {
    id: "material:signal-fragment",
    name: "Signal Fragment",
    category: "material",
    description:
      "A research shard carrying a partial Sovereign Weights signal.",
    stackLimit: 99,
    usableFrom: [],
  },
};

export type ItemId = keyof typeof ITEM_DEFINITIONS;

export function getItemDefinition(itemId: string): ItemDefinition | null {
  return ITEM_DEFINITIONS[itemId] ?? null;
}

export function getBodyItemId(bodyId: string): string {
  return `body:${bodyId}`;
}

export function getMindLicenseItemId(mindId: string): string {
  return `mind:${mindId}`;
}
