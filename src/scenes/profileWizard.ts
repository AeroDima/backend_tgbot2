import { Scenes, Markup } from 'telegraf';
import { UserProfile, Sex, ActivityLevel } from '../types.js';
import { calculateBMR, calculateTDEE } from '../utils/calculator.js';
import { saveUserProfile } from '../database/db.js';

export const PROFILE_WIZARD_ID = 'PROFILE_WIZARD';

export const profileWizard = new Scenes.WizardScene<Scenes.WizardContext>(
  PROFILE_WIZARD_ID,
  // Step 1: Age
  async (ctx) => {
    await ctx.reply('1️⃣ Введіть ваш вік (від 10 до 100 років):');
    return ctx.wizard.next();
  },
  // Step 2: Height
  async (ctx) => {
    const age = parseInt((ctx.message as any)?.text);
    if (isNaN(age) || age < 10 || age > 100) {
      await ctx.reply('❌ Будь ласка, введіть коректний вік (число від 10 до 100):');
      return;
    }
    (ctx.wizard.state as any).age = age;
    await ctx.reply('2️⃣ Введіть ваш зріст у см (від 100 до 250):');
    return ctx.wizard.next();
  },
  // Step 3: Weight
  async (ctx) => {
    const height = parseFloat((ctx.message as any)?.text);
    if (isNaN(height) || height < 100 || height > 250) {
      await ctx.reply('❌ Будь ласка, введіть коректний зріст (число від 100 до 250):');
      return;
    }
    (ctx.wizard.state as any).height = height;
    await ctx.reply('3️⃣ Введіть вашу вагу у кг (від 30 до 300):');
    return ctx.wizard.next();
  },
  // Step 4: Sex
  async (ctx) => {
    const weight = parseFloat((ctx.message as any)?.text);
    if (isNaN(weight) || weight < 30 || weight > 300) {
      await ctx.reply('❌ Будь ласка, введіть коректну вагу (число від 30 до 300):');
      return;
    }
    (ctx.wizard.state as any).weight = weight;
    await ctx.reply(
      '4️⃣ Оберіть вашу стать:',
      Markup.keyboard([['male', 'female']])
        .oneTime()
        .resize()
    );
    return ctx.wizard.next();
  },
  // Step 5: Activity
  async (ctx) => {
    const sex = (ctx.message as any)?.text as Sex;
    if (sex !== 'male' && sex !== 'female') {
      await ctx.reply('❌ Будь ласка, оберіть стать за допомогою кнопок (male / female):');
      return;
    }
    (ctx.wizard.state as any).sex = sex;
    await ctx.reply(
      '5️⃣ Оберіть рівень активності:\n' +
        'low → мінімальна активність\n' +
        'light → легкі тренування 1-3 рази на тиждень\n' +
        'medium → середні тренування 3-5 разів на тиждень\n' +
        'high → інтенсивні тренування 6-7 разів на тиждень',
      Markup.keyboard([['low', 'light'], ['medium', 'high']])
        .oneTime()
        .resize()
    );
    return ctx.wizard.next();
  },
  // Final Step: Calculation and Result
  async (ctx) => {
    const activity = (ctx.message as any)?.text as ActivityLevel;
    const validActivities: ActivityLevel[] = ['low', 'light', 'medium', 'high'];
    if (!validActivities.includes(activity)) {
      await ctx.reply('❌ Будь ласка, оберіть рівень активності за допомогою кнопок:');
      return;
    }

    const state = ctx.wizard.state as any;
    const profile: UserProfile = {
      age: state.age,
      height: state.height,
      weight: state.weight,
      sex: state.sex,
      activity: activity,
    };

    profile.bmr = calculateBMR(profile.weight, profile.height, profile.age, profile.sex);
    profile.tdee = calculateTDEE(profile.bmr, profile.activity);

    // Save profile to DB
    if (ctx.from) {
      saveUserProfile(ctx.from.id, profile);
    }

    await ctx.reply(
      `✅ Профіль збережено!\n\n` +
        `📊 Ваші результати:\n` +
        `BMR (Базальний метаболізм): ${Math.round(profile.bmr)} ккал\n` +
        `TDEE (Денна норма калорій): ${Math.round(profile.tdee)} ккал`,
      Markup.removeKeyboard()
    );

    return ctx.scene.leave();
  }
);
