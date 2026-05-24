import {
  DIALOGUES,
  type DialogueChoice,
  type DialogueCondition,
  type DialogueDefinition,
  type DialogueEffect,
  type DialogueId,
  type DialogueLineVariant,
  type DialogueNode,
} from "@/game/data/dialogue";
import type { TrialId } from "@/game/data/trials";
import {
  applyQuestActionToSave,
  applyRewardToSave,
  completeQuestAndClaimRewards,
  isQuestCompleted,
  isQuestObjectiveComplete,
} from "@/game/systems/quests";
import { isTrialCompleted } from "@/game/systems/trials";
import type { SaveGame } from "@/game/types/save";

export type DialogueVariables = Record<string, string | number>;

export type DialogueCommand =
  | {
      type: "openMenu";
      menu: "garden" | "circle" | "inventory" | "quests";
    }
  | {
      type: "startBattle";
      battleKind: "wild" | "trial";
      enemyBodyId?: string;
      trialId?: TrialId;
    }
  | {
      type: "startCutscene";
      cutsceneId: string;
    };

export type DialogueView =
  | {
      type: "line";
      speaker: string;
      text: string;
    }
  | {
      type: "choice";
      prompt: string;
      choices: DialogueChoice[];
    }
  | {
      type: "end";
    };

export type DialogueAdvanceResult = {
  save: SaveGame;
  nextNodeId: string | null;
  view: DialogueView;
  commands: DialogueCommand[];
  ended: boolean;
};

export function getDialogueDefinition(
  dialogueId: DialogueId,
): DialogueDefinition {
  return DIALOGUES[dialogueId];
}

export function getDialogueStartView(
  dialogueId: DialogueId,
  save: SaveGame,
  variables: DialogueVariables = {},
): { nodeId: string; view: DialogueView } {
  const definition = getDialogueDefinition(dialogueId);

  return {
    nodeId: definition.startNodeId,
    view: getDialogueView(definition, definition.startNodeId, save, variables),
  };
}

export function getDialogueView(
  definition: DialogueDefinition,
  nodeId: string,
  save: SaveGame,
  variables: DialogueVariables = {},
): DialogueView {
  const node = resolveDialogueNode(definition.nodes[nodeId], save);

  if (!node) {
    return { type: "end" };
  }

  if (node.type === "line") {
    return {
      type: "line",
      speaker: node.speaker,
      text: interpolateDialogueText(node.text, variables),
    };
  }

  if (node.type === "choice") {
    return {
      type: "choice",
      prompt: interpolateDialogueText(node.prompt, variables),
      choices: node.choices.filter((choice) =>
        areDialogueConditionsMet(save, choice.conditions),
      ),
    };
  }

  return { type: "end" };
}

export function advanceDialogue(input: {
  dialogueId: DialogueId;
  nodeId: string;
  save: SaveGame;
  choiceId?: string;
  variables?: DialogueVariables;
}): DialogueAdvanceResult {
  const definition = getDialogueDefinition(input.dialogueId);
  const node = resolveDialogueNode(definition.nodes[input.nodeId], input.save);

  if (!node) {
    return {
      save: input.save,
      nextNodeId: null,
      view: { type: "end" },
      commands: [],
      ended: true,
    };
  }

  const effectSource = getEffectSource(node, input.save, input.choiceId);
  const effectResult = applyDialogueEffects(input.save, effectSource.effects);
  const nextNodeId = effectSource.next ?? null;
  const view = nextNodeId
    ? getDialogueView(
        definition,
        nextNodeId,
        effectResult.save,
        input.variables,
      )
    : { type: "end" as const };

  return {
    save: effectResult.save,
    nextNodeId,
    view,
    commands: effectResult.commands,
    ended: view.type === "end",
  };
}

export function applyDialogueEffects(
  save: SaveGame,
  effects: readonly DialogueEffect[] | undefined,
): { save: SaveGame; commands: DialogueCommand[] } {
  let nextSave = save;
  const commands: DialogueCommand[] = [];

  for (const effect of effects ?? []) {
    if (effect.type === "setFlag") {
      nextSave = {
        ...nextSave,
        questFlags: {
          ...nextSave.questFlags,
          [effect.flag]: effect.value,
        },
      };
    } else if (effect.type === "startQuest") {
      nextSave = applyQuestActionToSave(nextSave, {
        type: "start",
        questId: effect.questId,
      });
    } else if (effect.type === "advanceQuest") {
      nextSave = applyQuestActionToSave(nextSave, {
        type: "advance",
        trigger: effect.trigger,
        targetId: effect.targetId,
        questId: effect.questId,
        objectiveId: effect.objectiveId,
        amount: effect.amount,
      });
    } else if (effect.type === "completeQuest") {
      nextSave = applyQuestActionToSave(nextSave, {
        type: "complete",
        questId: effect.questId,
      });
    } else if (effect.type === "claimQuestRewards") {
      nextSave = completeQuestAndClaimRewards(nextSave, effect.questId);
    } else if (effect.type === "giveItem") {
      nextSave = applyRewardToSave(nextSave, {
        type: "item",
        itemId: effect.itemId,
        count: effect.count,
      });
    } else if (effect.type === "healCircle") {
      nextSave = applyRewardToSave(nextSave, {
        type: "heal-circle",
        amount: effect.amount,
      });
    } else if (effect.type === "openMenu") {
      commands.push({ type: "openMenu", menu: effect.menu });
    } else if (effect.type === "startBattle") {
      commands.push({
        type: "startBattle",
        battleKind: effect.battleKind,
        enemyBodyId: effect.enemyBodyId,
        trialId: effect.trialId,
      });
    } else {
      commands.push({
        type: "startCutscene",
        cutsceneId: effect.cutsceneId,
      });
    }
  }

  return { save: nextSave, commands };
}

export function areDialogueConditionsMet(
  save: SaveGame,
  conditions: readonly DialogueCondition[] | undefined,
): boolean {
  if (!conditions || conditions.length === 0) {
    return true;
  }

  return conditions.every((condition) => {
    if (condition.type === "flag") {
      const value = save.questFlags[condition.flag];

      return condition.value === undefined
        ? Boolean(value)
        : value === condition.value;
    }

    if (condition.type === "quest-state") {
      return isQuestCompleted(save.quests, condition.questId)
        ? condition.state === "completed"
        : save.quests[condition.questId]?.state === condition.state;
    }

    if (condition.type === "objective-complete") {
      return isQuestObjectiveComplete(
        save.quests,
        condition.questId,
        condition.objectiveId,
      );
    }

    if (condition.type === "trial-completed") {
      return isTrialCompleted(save, condition.trialId);
    }

    return condition.bodyId
      ? save.acquiredBodies.includes(condition.bodyId)
      : save.acquiredBodies.length > 1;
  });
}

function resolveDialogueNode(
  node: DialogueNode | undefined,
  save: SaveGame,
): DialogueNode | null {
  if (!node) {
    return null;
  }

  if (node.type !== "line" || !node.variants) {
    return node;
  }

  const variant = node.variants.find((candidate) =>
    areDialogueConditionsMet(save, candidate.conditions),
  );

  return variant ? applyLineVariant(node, variant) : node;
}

function applyLineVariant(
  node: Extract<DialogueNode, { type: "line" }>,
  variant: DialogueLineVariant,
): DialogueNode {
  return {
    ...node,
    speaker: variant.speaker ?? node.speaker,
    text: variant.text ?? node.text,
    next: variant.next ?? node.next,
    effects: variant.effects ?? node.effects,
  };
}

function getEffectSource(
  node: DialogueNode,
  save: SaveGame,
  choiceId?: string,
): { next?: string; effects?: readonly DialogueEffect[] } {
  if (node.type === "line" || node.type === "end") {
    return {
      next: node.type === "line" ? node.next : undefined,
      effects: node.effects,
    };
  }

  const availableChoices = node.choices.filter((choice) =>
    areDialogueConditionsMet(save, choice.conditions),
  );
  const choice =
    availableChoices.find((candidate) => candidate.id === choiceId) ??
    availableChoices[0];

  return {
    next: choice?.next,
    effects: choice?.effects,
  };
}

function interpolateDialogueText(
  text: string,
  variables: DialogueVariables,
): string {
  return text.replace(/\{([a-zA-Z0-9_-]+)\}/g, (match, key) =>
    variables[key] === undefined ? match : String(variables[key]),
  );
}
