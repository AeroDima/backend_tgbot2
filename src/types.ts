export type Sex = 'male' | 'female';

export type ActivityLevel = 'low' | 'light' | 'medium' | 'high';

export type Goal = 'lose' | 'maintain' | 'gain';

export interface UserProfile {
  age: number;
  height: number;
  weight: number;
  sex: Sex;
  activity: ActivityLevel;
  goal: Goal;
  bmr?: number;
  tdee?: number;
}

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  low: 1.2,
  light: 1.375,
  medium: 1.55,
  high: 1.725,
};
