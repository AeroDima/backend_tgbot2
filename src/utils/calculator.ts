import { Sex, ActivityLevel, ACTIVITY_FACTORS } from '../types.js';

/**
 * Calculates BMR using Mifflin-St Jeor formula.
 * Male: BMR = 10 × weight + 6.25 × height − 5 × age + 5
 * Female: BMR = 10 × weight + 6.25 × height − 5 × age − 161
 */
export function calculateBMR(weight: number, height: number, age: number, sex: Sex): number {
  const base = 10 * weight + 6.25 * height - 5 * age;
  return sex === 'male' ? base + 5 : base - 161;
}

/**
 * Calculates TDEE based on BMR and activity level.
 */
export function calculateTDEE(bmr: number, activity: ActivityLevel): number {
  const factor = ACTIVITY_FACTORS[activity];
  return bmr * factor;
}
