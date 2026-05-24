export const FIRST_TRIAL_ID = "first-trial";

export type TrialId = typeof FIRST_TRIAL_ID;

export type TrialDefinition = {
  id: TrialId;
  name: string;
  rivalName: string;
  enemyBodyId: string;
  enemyMindId: string;
  completionFlag: string;
  storyHintFlag: string;
  rewardInventoryKey: string;
  rewardLabel: string;
  experienceReward: number;
  introDialogue: string;
  completedDialogue: string;
  victoryMessage: string;
  sovereignHint: string;
};

export const TRIALS: Record<TrialId, TrialDefinition> = {
  [FIRST_TRIAL_ID]: {
    id: FIRST_TRIAL_ID,
    name: "Precision Trial",
    rivalName: "Cal Venn",
    enemyBodyId: "reedling",
    enemyMindId: "optima-focus",
    completionFlag: "trial.first.completed",
    storyHintFlag: "story.sovereignWeightsHint",
    rewardInventoryKey: "trial:first:precision-mark",
    rewardLabel: "Precision Mark",
    experienceReward: 8,
    introDialogue:
      "Cal Venn: Optima measures care by output. Show me your Circle can turn bond into performance.",
    completedDialogue:
      "Cal Venn: Your result stands. Efficiency is not colder than care, only less forgiving.",
    victoryMessage:
      "Cal records your clear time and awards the Precision Mark.",
    sovereignHint:
      "A cracked local signal interrupts the arena board: SOVEREIGN WEIGHTS ARE LISTENING.",
  },
};
